# Bônus: proxy, backup e painel do banco

Esta versão mantém os arquivos fornecidos da aplicação e acrescenta os três
bônus de infraestrutura. As mudanças em relação à arquitetura básica estão no
[diagrama](ARQUITETURA.md) e no [relatório](RELATORIO.md).

## Proxy reverso Nginx

O serviço `nginx`, construído de `./frontend` sobre a imagem oficial
`nginx:1.30-alpine`, publica `127.0.0.1:8080:80`. Ele exige a senha de entrada
para a interface e API; veja [ACESSO.md](ACESSO.md). Serve a interface e seus arquivos
estáticos; as demais rotas seguem para `web:5000`. `web` e `db` não publicam porta
no host. A configuração [nginx/default.conf](../nginx/default.conf) é montada
somente para leitura em `/etc/nginx/conf.d/default.conf`.
As regras compartilhadas ficam em [frontend/routing.conf](../frontend/routing.conf).
Veja também o [roteiro da interface](FRONTEND.md).

```sh
docker compose up -d --build
docker compose exec nginx nginx -t
curl --user visitante -i http://localhost:8080/health
```

O Nginx aguarda o healthcheck de `web`, que faz uma chamada HTTP interna a
`/health`; `web`, por sua vez, aguarda o banco saudável. O proxy preserva o caminho
das requisições e encaminha os cabeçalhos de host e de origem. A configuração
usa `client_max_body_size 0` para manter o comportamento do código fornecido,
que não define limite de tamanho de upload. HTTPS e limites de produção são
propostas futuras, não funcionalidades implementadas neste exercício.

O upstream utiliza uma zona compartilhada e `resolve` com o DNS do Docker,
`127.0.0.11`. Isso permite atualizar os endereços após recriações e distribuir
requisições entre réplicas. O parâmetro está disponível no Nginx aberto desde
1.27.3, conforme a [documentação oficial](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server).
Consulte também a [imagem oficial Nginx](https://hub.docker.com/_/nginx).

Para demonstrar três réplicas e depois voltar a uma:

```sh
docker compose up -d --scale web=3
docker compose ps
docker compose up -d --scale web=1
docker compose restart nginx
```

A resolução DNS é assíncrona. No teste de redução, requisições imediatas chegaram
a usar endereços de réplicas removidas, produzindo timeout/HTTP 504. O reinício
explícito do proxy após reduzir a escala atualiza os destinos antes da retomada
das verificações; ele causa uma breve interrupção do acesso HTTP. Esse passo
faz parte do procedimento documentado, e não da subida inicial do ambiente.
O timeout de conexão de 2 segundos e as tentativas de outro upstream limitam
a espera por destinos indisponíveis, sem garantir ausência de erros durante
uma mudança de escala.

## Backup de fotos e restauração em volume novo

Os exemplos seguintes usam Bash na raiz do repositório. O diretório `backups/`
é ignorado pelo Git, pois arquivos de backup podem conter dados dos usuários.
O nome `g1-nuvem_fotos` corresponde ao projeto local; confira o nome real na
montagem de `/app/uploads` caso use outra pasta ou nome de projeto.

```sh
docker volume ls
docker volume inspect g1-nuvem_fotos
mkdir -p backups
docker compose stop web
docker run --rm --network none \
  --mount type=volume,src=g1-nuvem_fotos,dst=/origem,readonly \
  --mount "type=bind,src=$PWD/backups,dst=/backup" \
  alpine:3 tar -czf /backup/fotos.tar.gz -C /origem .
docker compose start web
```

A pausa de `web` evita novos uploads durante a cópia. O contêiner temporário tem
a origem montada somente para leitura e é removido por `--rm`; ele não recebe
credenciais nem precisa se conectar à rede. O arquivo fica em
`backups/fotos.tar.gz` no host. Caso a criação do backup falhe, retome `web` com
`docker compose start web` antes de investigar a falha.

Para restaurar, crie um volume com nome novo, sem sobrescrever o volume ativo:

```sh
VOLUME_RESTAURADO="g1-fotos-restauradas-$(date +%Y%m%d%H%M%S)"
docker volume create "$VOLUME_RESTAURADO"
docker run --rm --network none \
  --mount "type=volume,src=$VOLUME_RESTAURADO,dst=/restaurado" \
  --mount "type=bind,src=$PWD/backups,dst=/backup,readonly" \
  alpine:3 tar -xzf /backup/fotos.tar.gz -C /restaurado
docker volume inspect "$VOLUME_RESTAURADO"
```

Compare os nomes e os hashes dos arquivos nos dois volumes:

```sh
docker run --rm --network none \
  --mount type=volume,src=g1-nuvem_fotos,dst=/dados,readonly \
  alpine:3 sh -c 'cd /dados && sha256sum *'
docker run --rm --network none \
  --mount "type=volume,src=$VOLUME_RESTAURADO,dst=/dados,readonly" \
  alpine:3 sh -c 'cd /dados && sha256sum *'
```

O arquivo tar preserva os nomes e metadados das fotos. A restauração é feita em
um volume independente: ela não troca automaticamente a montagem de `web` e
não restaura o banco PostgreSQL. Um plano de recuperação completo precisaria
coordenar também o backup dos registros que referenciam as fotos. A técnica
utiliza os mecanismos descritos na [documentação de volumes do Docker](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes).

No ensaio de 19/10/2026, duas fotos foram copiadas e restauradas em
`g1-nuvem_fotos_restauradas_1dfb978f`, com igualdade de nomes e hashes SHA-256.
O volume ativo continuou com as mesmas fotos e a API manteve seis itens e duas
fotos. A [evidência 19](evidencias/19-backup-restauracao.txt) contém os comandos e
resultados; o [tar.gz de demonstração](evidencias/19-fotos-backup.tar.gz) contém
somente os dois PNGs de teste sem dados pessoais. O volume restaurado permanece
disponível, independente das montagens do Compose e de seu `down -v`.

## Adminer no perfil debug

O serviço `adminer` usa a imagem oficial `adminer:6` e `profiles: ["debug"]`.
Ele não é iniciado pelo comando padrão. Para ativá-lo:

```sh
docker compose --profile debug up -d
docker compose --profile debug ps
```

Abra `http://localhost:8081`, selecione PostgreSQL e use `db` como servidor.
Informe usuário, senha e nome do banco conforme seu `.env`, sem copiá-los para
prints, documentação ou comandos de evidência. `ADMINER_DEFAULT_SERVER=db`
apenas preenche o servidor padrão; nenhuma senha é configurada no painel.

A publicação `127.0.0.1:8081:8080` limita o painel à máquina local. Isso não
publica a porta 5432 do banco e mantém 8080 como porta exclusiva do Nginx.
O Adminer acessa `db:5432` pela mesma bridge dos demais serviços.

Para desativar e remover somente o painel:

```sh
docker compose --profile debug stop adminer
docker compose --profile debug rm -f adminer
```

Um perfil controla a seleção de serviços para início; executar posteriormente
`up` sem `--profile debug` não encerra um Adminer que já esteja rodando.
Referências: [perfis do Compose](https://docs.docker.com/compose/how-tos/profiles/)
e [imagem oficial Adminer](https://hub.docker.com/_/adminer).

A [evidência 20](evidencias/20-adminer-debug.txt) comprova a ausência do painel
na configuração padrão, sua ativação com `debug`, a resposta HTTP 200 e uma
consulta SQL com o PHP/driver do contêiner Adminer. Não foi registrado login
pela interface gráfica. O painel foi desativado e removido ao final do teste.
O [teste de réplicas validado](evidencias/21-replicas-com-proxy-validado.txt)
registra os três hostnames alcançados, as fotos compartilhadas e o retorno a
uma réplica com reinício do proxy; as tentativas anteriores também foram mantidas.
