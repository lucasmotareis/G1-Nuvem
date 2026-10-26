# Achados & Perdidos — G1 de Computação em Nuvem

Ambiente da API Flask com Gunicorn, PostgreSQL, armazenamento persistente das
fotos e uma interface web servida pelo Nginx. A aplicação é fornecida pelo enunciado;
a infraestrutura usa Docker Compose.
O objetivo é permitir que outra equipe execute o protótipo e compreenda as
configurações antes de planejar sua migração para a nuvem.

## Estrutura e documentação

```text
G1-Nuvem/
├── AGENTS.md
├── G1-CN-2N.pdf
├── app/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── db/
│   └── init.sql
├── frontend/             # interface HTML/CSS/JavaScript e imagem Nginx
├── infra/aws/            # modelo ECS com web e frontend na mesma task
├── docs/
│   ├── ARQUITETURA.md
│   ├── arquitetura.png
│   ├── REVISAO_FINAL.md
│   ├── RELATORIO.md
│   ├── REFLEXAO.md
│   ├── BONUS.md
│   ├── FRONTEND.md
│   ├── GUIA_AWS.md
│   └── evidencias/
├── nginx/
│   └── default.conf
├── docker-compose.yml
├── .env                 # somente local; não entregar
├── .env.example
├── .gitignore
└── README.md
```

A pasta raiz local mantém o nome `G1-Nuvem`; a organização interna segue a
estrutura apresentada como `achados-perdidos` no enunciado. Os arquivos
`app/app.py`, `app/requirements.txt` e `db/init.sql` foram preservados.

| Artefato | Conteúdo |
| --- | --- |
| A1 — este README | Preparação, execução, testes, rotas e ciclo de parada/remoção. |
| [A2 — Arquitetura](docs/ARQUITETURA.md) | Imagem PNG e fonte Mermaid com host, rede, portas, contêineres e montagens. |
| [A3 — Relatório técnico](docs/RELATORIO.md) | Dockerfile, Compose, caminho do POST e ciclo de vida dos volumes. |
| [A4 — Evidências](docs/evidencias/README.md) | Índice com legendas, saídas reais e imagens dos ensaios. |
| [A5 — Reflexão](docs/REFLEXAO.md) | Sete respostas e tabela de equivalência Azure, AWS e Google Cloud. |
| [Guia AWS](docs/GUIA_AWS.md) | Roteiro com ECS/Fargate, RDS, S3 Files, VPC, Secrets Manager e ECR; rede preparada, RDS disponível e segredos criados; publicação da aplicação pendente. |
| [Preparação de rede AWS](docs/AWS-ETAPA-03.md) | VPC, sub-redes e grupos de segurança reais criados/conferidos para continuar o roteiro. |
| [Banco e segredos AWS](docs/AWS-ETAPA-04.md) | Configuração real do RDS privado, dois segredos, custos consultados e acompanhamento no console. |
| [Frontend](docs/FRONTEND.md) | Interface, integração com a API, roteiro para demonstração e testes de navegador. |
| [Acesso por senha](docs/ACESSO.md) | Entrada compartilhada no Nginx, segredo local/AWS, curl autenticado e HTTPS. |
| [Bônus](docs/BONUS.md) | Proxy reverso, backup com restauração e Adminer no perfil `debug`. |

## Arquitetura

O [diagrama atual em Mermaid](docs/ARQUITETURA.md#fonte-editável-em-mermaid) mostra
o Nginx com a interface, a API, o banco e as montagens. A [imagem anterior](docs/arquitetura.png)
foi preservada como histórico da versão com proxy, anterior ao frontend.

## Pré-requisitos

Docker Engine em execução e Docker Compose com o comando `docker compose`.
Seu usuário precisa ter permissão para acessar o Docker. Não é necessário instalar
Python, PostgreSQL ou as dependências da aplicação no computador.
Os exemplos abaixo usam Bash no Linux e `curl` para testar a API.
No PowerShell, use `curl.exe` e adapte os caminhos dos arquivos.

## Configurar e subir

Para obter o projeto pelo GitHub:

```sh
git clone https://github.com/lucasmotareis/G1-Nuvem.git
cd G1-Nuvem
```

Na pasta do repositório, crie a configuração local a partir do exemplo. Se já
houver um `.env` configurado, preserve-o em vez de sobrescrevê-lo:

```sh
cp .env.example .env
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

O exemplo contém valores fictícios suficientes para o teste inicial. Substitua-os
antes de usar fora do exercício. O `.env` é ignorado pelo Git e não deve ser
incluído na entrega. O Compose lê as três variáveis `POSTGRES_*` e repassa os mesmos
valores ao banco e às variáveis `DB_NAME`, `DB_USER` e `DB_PASSWORD` da aplicação.
O Nginx recebe `ACCESS_USER` e `ACCESS_PASSWORD` do mesmo arquivo e exige essa
credencial para a interface, API e fotos. O exemplo usa credenciais fictícias;
o valor real deve ficar somente no `.env` ou no Secrets Manager.
Evite salvar a saída de `docker compose config` sem `--quiet`, pois ela pode revelar
os valores resolvidos, incluindo a senha.

A interface fica em **`http://localhost:8080`**. O serviço `nginx`, construído a
partir de `./frontend` sobre a imagem oficial Nginx, publica `8080:80` e serve
HTML/CSS/JavaScript. As rotas da API seguem por proxy para `web:5000`, no mesmo
endereço. A publicação HTTP local fica restrita a `127.0.0.1`.
`web` e `db` não publicam porta no host.
A aplicação se conecta a `db:5432` pela bridge `rede_interna`. O Compose aguarda
o banco saudável (`pg_isready`) antes de iniciar `web`, e aguarda o healthcheck
HTTP de `web` antes de iniciar o Nginx. Os serviços usam `restart: unless-stopped`.
Não é necessário instalar Node.js ou Django para executar a interface.

O volume `dados_banco` guarda o PostgreSQL em `/var/lib/postgresql/data` e o volume
`fotos` guarda os arquivos em `/app/uploads`. O Dockerfile prepara esse diretório
para o usuário `app`, que executa o Gunicorn. O script `db/init.sql` é montado
somente para leitura e executado na inicialização de um banco vazio.

## Demonstrar pelo navegador

Abra `http://localhost:8080`, informe o usuário **`visitante`** e a senha
configurada no `.env`, e confira a lista e as estatísticas. Busque pelo
local `biblio`, limpe o filtro e cadastre um objeto com descrição, local e uma
foto PNG/JPG de teste. Clique na miniatura para ampliar a imagem. O formulário
também aceita cadastro sem foto.

A interface usa as rotas existentes e mantém `app/app.py`, `app/requirements.txt`
e `db/init.sql` intactos. O [roteiro do frontend](docs/FRONTEND.md) explica a
integração e a demonstração de persistência. Os testes por `curl` abaixo
continuam fazendo parte das evidências da avaliação.

## Testar a API

```sh
curl --user visitante -i http://localhost:8080/health
curl --user visitante -i http://localhost:8080/itens
curl --user visitante -i 'http://localhost:8080/itens?local=biblio'
curl --user visitante -i http://localhost:8080/estatisticas
```

O curl pede a senha sem incluí-la no comando. Sem credenciais ou com senha
incorreta, as rotas públicas retornam 401. Veja [acesso por senha](docs/ACESSO.md).
Com credencial válida e banco acessível, `/health` deve retornar HTTP 200 com `status: "ok"` e
`banco: "conectado"`. Um banco novo deve conter os três itens de `db/init.sql`.
Para cadastrar um item, você pode usar a imagem de teste sem dados pessoais
incluída no repositório:

```sh
curl --user visitante -i -X POST http://localhost:8080/itens \
  -F 'descricao=Objeto de teste' \
  -F 'local=Biblioteca' \
  -F 'foto=@docs/evidencias/foto-teste-1.png'
curl --user visitante -i http://localhost:8080/itens
curl --user visitante -i http://localhost:8080/estatisticas
docker compose exec web whoami
docker compose logs web --tail 20
```

O cadastro deve retornar HTTP 201. A listagem retorna o caminho `/fotos/<nome>`;
abra `http://localhost:8080/fotos/<nome>` no navegador para conferir a imagem.
O comando `whoami` deve retornar `app`.
O cadastro sem foto também é aceito: basta omitir o argumento `-F 'foto=@...'`.

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/` | Interface web servida pelo Nginx. |
| GET | `/health` | Verifica a conexão com o banco. |
| GET | `/itens` | Lista os itens cadastrados. |
| GET | `/itens?local=texto` | Filtra os itens por trecho do local. |
| POST | `/itens` | Recebe formulário multipart com `descricao`, `local` e `foto` opcional. |
| GET | `/fotos/<nome>` | Retorna a foto armazenada. |
| GET | `/estatisticas` | Retorna as quantidades de itens e fotos. |

## Parar e remover

Para parar os contêineres, mantendo os contêineres e os volumes:

```sh
docker compose stop
docker compose start
```

Para remover contêineres e a rede e depois recriá-los, preservando os volumes:

```sh
docker compose down
docker compose up -d
```

Somente no ambiente de teste, quando os dados puderem ser descartados:

```sh
docker compose down -v
docker compose up -d
```

**`down -v` apaga os volumes do banco e das fotos.** Na próxima subida,
`init.sql` recria os três itens de exemplo; os itens cadastrados e as fotos
anteriores não são recuperados. Não use essa opção como parada habitual.

## Usar os bônus

O Nginx já faz parte da subida padrão. A configuração está em
[nginx/default.conf](nginx/default.conf), e a verificação de sintaxe pode ser feita
com `docker compose exec nginx nginx -t`.

Para ativar o painel do banco, que não sobe por padrão:

```sh
docker compose --profile debug up -d
```

Abra `http://localhost:8081`, selecione PostgreSQL, use servidor `db` e os dados
do seu `.env`. A porta do painel está vinculada somente a `127.0.0.1`. Para
desativá-lo, use `docker compose --profile debug stop adminer` e
`docker compose --profile debug rm -f adminer`.

O [roteiro de backup](docs/BONUS.md) mostra como criar `backups/fotos.tar.gz`
com um contêiner temporário `docker run --rm`, restaurar em um volume novo e
comparar os hashes. `backups/` é ignorado pelo Git. Esse procedimento copia
somente fotos; o banco exige uma estratégia de backup própria.

## Evidências e entrega

**Acesso compartilhado:** os registros 34 em diante verificam o bloqueio com
senha no Nginx. As rotas e capturas anteriores continuam como histórico.
Na AWS, use HTTPS pelo ALB; o segredo real nunca deve ser versionado.

**Atualização do frontend (26/10/2026):** a interface e a nova imagem Nginx são
posteriores à publicação registrada em 28. Os testes desta branch estão nos
registros 29 a 32 do [índice](docs/evidencias/README.md). As referências ao clone
e à publicação abaixo correspondem à versão anterior; esta branch ainda não
foi publicada. A aplicação continua sem implantação na AWS; a rede da etapa 3
e o provisionamento do banco/segredos da etapa 4 foram feitos posteriormente,
conforme os registros de [rede](docs/AWS-ETAPA-03.md) e
[banco e segredos](docs/AWS-ETAPA-04.md).

As saídas reais estão no [índice de evidências](docs/evidencias/README.md).
Os registros 01 a 17 documentam a arquitetura básica. Os registros a partir de
18 documentam a versão com bônus; os resultados antigos não devem ser confundidos
com o estado atual das portas e do proxy. A reflexão distingue o comportamento da escala
antes e depois da inclusão do Nginx.

A entrega é pelo [repositório público no GitHub](https://github.com/lucasmotareis/G1-Nuvem),
sem pacote do projeto. A versão com infraestrutura, documentação, arquitetura e
evidências foi publicada e conferida em um clone real, conforme a
[verificação 28](docs/evidencias/28-publicacao-github.txt). O HTML do README
renderizado pelo GitHub também contém a imagem da arquitetura.
Envie esse link no ambiente virtual ao professor.
O `.env` e os backups locais continuam ignorados; `.env.example` faz parte da entrega.

A [revisão final contra o PDF](docs/REVISAO_FINAL.md) relaciona os requisitos aos
arquivos e testes. As equivalências em nuvem orientam a migração; a etapa 3 da
AWS já tem [rede preparada e evidências reais](docs/AWS-ETAPA-03.md), e a etapa 4
registra o [provisionamento do banco e dos segredos](docs/AWS-ETAPA-04.md).
A aplicação e o armazenamento de fotos continuam pendentes de implantação.

## Checklist de entrega verificado

- [x] `docker compose up -d --build` funciona em pasta recém-clonada após copiar `.env.example` para `.env`: [ensaio 23](docs/evidencias/23-clone-e-aceite.txt).
- [x] `/health` retorna `status: "ok"` e `banco: "conectado"`: [ensaios 18 e 23](docs/evidencias/23-clone-e-aceite.txt).
- [x] Nenhuma senha real no Dockerfile, Compose, código ou evidências; `.env` ignorado e não rastreado: [auditoria 25](docs/evidencias/25-auditoria-entrega.txt). O exemplo contém somente valores fictícios.
- [x] O banco não publica porta no host: [inspeção 22](docs/evidencias/22-persistencia-com-proxy.txt).
- [x] `whoami` retorna `app` e o UID é diferente de zero: [ensaio 23](docs/evidencias/23-clone-e-aceite.txt).
- [x] Itens e fotos sobrevivem a `down` e `up -d`, com IDs, URLs e hashes preservados: [ensaios 22 e 23](docs/evidencias/23-clone-e-aceite.txt).
- [x] README com roteiro testado do zero: [ensaio 23](docs/evidencias/23-clone-e-aceite.txt).
- [x] Diagrama com rede, volumes, caminhos, bind mounts e portas: [PNG](docs/arquitetura.png) e [Mermaid](docs/ARQUITETURA.md).
- [x] Relatório com as partes (a), (b), (c) e (d): [relatório técnico](docs/RELATORIO.md).
- [x] Evidências reais nomeadas e legendadas: [índice](docs/evidencias/README.md).
- [x] Sete reflexões e tabela dos três provedores completas: [reflexão](docs/REFLEXAO.md).

O clone do ensaio 23 foi criado a partir de um snapshot Git temporário dos
arquivos atuais. O [manifesto operacional](docs/evidencias/23-manifesto-operacional.json)
identifica o commit de teste e os hashes dos arquivos usados para executar o
ambiente, comparados novamente com os arquivos atuais na
[conferência 26](docs/evidencias/26-conferencia-final.txt). Os ensaios incluíram
todas as rotas, parada/retomada e as três situações da Tarefa 5 com volumes novos.
O projeto original foi preservado e retomado com seis itens e duas fotos.
O Adminer terminou desativado, e a aplicação fornecida permaneceu intacta.

O ensaio 23 registra os testes completos em um clone local de snapshot.
A publicação posterior e o clone real do GitHub estão na
[verificação 28](docs/evidencias/28-publicacao-github.txt): os nove arquivos
operacionais coincidem com o manifesto testado, a configuração a partir do
exemplo é válida e `.env` não está nos arquivos ou no histórico publicado.
Os registros 26 e 27 descrevem a situação anterior ao push e foram preservados
como histórico. Resta ao aluno enviar o link no ambiente virtual.
