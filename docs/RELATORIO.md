# Relatório técnico

Este relatório descreve a versão atual de [docker-compose.yml](../docker-compose.yml)
e [app/Dockerfile](../app/Dockerfile), incluindo os bônus descritos em
[BONUS.md](BONUS.md). Os três arquivos fornecidos pelo enunciado
foram preservados; a comparação com o Apêndice A está na
[evidência 11](evidencias/11-arquivos-fornecidos.txt). Os testes foram executados
em 19/10/2026. A [arquitetura](ARQUITETURA.md) mostra os componentes e suas relações.

## (a) Dockerfile: instruções e ordem

| Instrução | Propósito |
| --- | --- |
| `FROM python:3.12-slim` | Parte da imagem oficial Python 3.12 na variante enxuta `slim`. |
| `ENV PYTHONDONTWRITEBYTECODE=1` | Evita a geração de arquivos `.pyc` durante a execução do Python. |
| `ENV PYTHONUNBUFFERED=1` | Desativa o buffer de saída do Python, facilitando a leitura dos logs do contêiner. As duas variáveis estão na mesma instrução `ENV`. |
| `WORKDIR /app` | Define o diretório de trabalho usado nas instruções seguintes e no início da aplicação. |
| `COPY requirements.txt .` | Copia primeiro apenas a lista de dependências. |
| `RUN pip install --no-cache-dir -r requirements.txt` | Instala Flask, psycopg e Gunicorn sem manter o cache de downloads do pip na imagem. |
| `COPY app.py .` | Copia o código depois da instalação, permitindo reutilizar a camada de dependências quando somente o código muda. |
| `RUN groupadd ... && useradd ...` | Cria o grupo e o usuário de sistema `app`, sem diretório pessoal e com shell `nologin`. |
| `mkdir -p /app/uploads` e `chown app:app /app/uploads` | Criam o diretório de fotos e atribuem sua propriedade ao usuário que executa a aplicação. Fazem parte da mesma instrução `RUN` de criação do usuário. |
| `USER app:app` | Executa o processo final como usuário e grupo `app`, sem privilégios de root. |
| `EXPOSE 5000` | Documenta a porta HTTP usada dentro do contêiner; a publicação no host é definida pelo Compose. |
| `CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]` | Inicia o Gunicorn na forma exec, sem shell intermediário, importando o objeto Flask `app` do módulo `app.py`. A escuta em `0.0.0.0` permite receber a conexão encaminhada pelo Docker. |

A ordem das duas instruções `COPY` separa alterações nas dependências de alterações
no código. Uma mudança somente em `app.py` preserva a possibilidade de reutilizar
a instalação do pip. Alterar `requirements.txt` invalida essa camada e as seguintes.
No [build em cópia limpa](evidencias/10-subida-copia-limpa.txt), o BuildKit registrou
o reaproveitamento de camadas. Não foi necessário instalar Python ou pacotes da
aplicação no host para executar o ambiente.

O [app/.dockerignore](../app/.dockerignore) exclui `.env`, `__pycache__/` e `*.pyc`,
incluindo as formas aninhadas. O contexto de build é `./app`; o Dockerfile copia
somente os dois arquivos fornecidos necessários à imagem. O `.env` da raiz é lido
pelo Compose para configuração em tempo de execução.

A [evidência 07](evidencias/07-usuario-prontidao.txt) registrou `whoami = app`, UID
999 e fotos pertencentes a `app`. Os uploads da [evidência 05](evidencias/05-rotas-funcionais.txt)
comprovam que esse usuário consegue gravar no volume montado em `/app/uploads`.

## (b) Compose: explicação dos blocos

| Bloco | Configuração e justificativa |
| --- | --- |
| `services.web.build` | Constrói a imagem própria a partir de `./app`, usando o Dockerfile desse diretório. |
| `services.web.expose` | Documenta a porta interna 5000, sem publicação no host. A publicação direta `8080:5000` da versão básica foi substituída pelo proxy. |
| `services.web.environment` | Define `DB_HOST=db`, `DB_PORT=5432` e `UPLOAD_DIR=/app/uploads`. `DB_NAME`, `DB_USER` e `DB_PASSWORD` recebem as mesmas variáveis `POSTGRES_*` utilizadas por `db`. |
| `services.web.volumes` | Monta o volume nomeado `fotos` em `/app/uploads`, para os arquivos sobreviverem à remoção do contêiner. |
| `services.web.depends_on` | A condição `service_healthy` aguarda o healthcheck de `db` antes de iniciar `web`. |
| `services.web.healthcheck` | Usa o Python já disponível na imagem para consultar `/health` na porta interna 5000. O Nginx depende dessa prontidão; não há nova dependência de aplicação. |
| `services.nginx` | Usa `nginx:1.30-alpine`, publica somente `8080:80`, aguarda `web` saudável e monta `nginx/default.conf` somente para leitura. O upstream encaminha para `web:5000`, com atualização dos endereços pelo DNS do Docker. |
| `services.adminer` | Usa `adminer:6` com `profiles: ["debug"]`. Publica `127.0.0.1:8081:8080` somente quando ativado, sugere `db` como servidor e aguarda o banco saudável. Não recebe senha na configuração. |
| `services.db.image` | Usa a imagem oficial `postgres:16-alpine`. O banco não possui bloco `ports`, portanto não publica porta no host. |
| `services.db.environment` | Recebe `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` do `.env`, para a inicialização do banco. |
| `services.db.volumes` | Monta `dados_banco` em `/var/lib/postgresql/data`; monta o arquivo `./db/init.sql` em `/docker-entrypoint-initdb.d/init.sql` com `:ro`, somente leitura. |
| `services.db.healthcheck` | Executa `pg_isready` a cada 5 segundos, com timeout de 5 segundos, até 10 tentativas e período inicial de 10 segundos. `$$POSTGRES_USER` e `$$POSTGRES_DB` adiam a expansão dessas variáveis para o shell dentro do contêiner. |
| `restart: unless-stopped` | Em todos os serviços, permite reiniciar os contêineres conforme a política do Docker, respeitando uma parada explícita. |
| `services.*.networks` | Conecta `nginx`, `web`, `db` e, quando ativado, `adminer` à mesma `rede_interna`, permitindo comunicação pelo nome do serviço. |
| `volumes` | Declara os dois volumes nomeados: `dados_banco` e `fotos`. O Docker administra seu armazenamento. |
| `networks.rede_interna` | Declara uma bridge definida pelo usuário. O nome da rede não exige a propriedade `internal: true`; o requisito de acesso é atendido pela ausência de porta publicada no banco. |

As expressões `${POSTGRES_*:?mensagem}` interrompem a configuração quando uma
variável obrigatória está ausente ou vazia. As credenciais não são literais no
Compose nem no Dockerfile. O código fornecido lê as variáveis `DB_*` com `os.getenv`.
O [exemplo de configuração](../.env.example) contém somente valores fictícios; o
arquivo `.env` local está ignorado e não é rastreado pelo Git, conforme a
[evidência 09](evidencias/09-credenciais-e-configuracao.txt).

A [evidência 15](evidencias/15-inspecao-infraestrutura.txt) registra a arquitetura
básica, anterior ao proxy. Na versão com bônus, a
[evidência 18](evidencias/18-proxy-e-rotas.txt) registra portas publicadas vazias
em `web` e `db`, e a publicação de 8080 somente no Nginx.
Na saída de `docker image ls`, `g1-nuvem-web:latest` apresentou **204 MB de uso em
disco** e **50,5 MB de tamanho do conteúdo**, nas colunas exibidas por esta versão
do Docker. A imagem e o cache são recursos distintos dos volumes de dados.

## (c) Caminho completo de um `POST /itens` com foto

1. O cliente executa `curl -X POST http://localhost:8080/itens` com os campos
   multipart `descricao`, `local` e `foto=@arquivo.png`. O exemplo completo está
   no [README](../README.md), e as saídas reais estão na
   [evidência 05](evidencias/05-rotas-funcionais.txt).
2. A requisição chega à porta 8080 do host. A publicação `8080:80` a encaminha
   ao Nginx, que faz proxy HTTP para `web:5000`, pela bridge. O Gunicorn recebe
   a requisição nessa porta e chama a aplicação Flask.
3. A função `cadastrar()` lê `descricao` e `local` de `request.form`. Se algum
   faltar, retorna HTTP 400 antes de salvar foto ou inserir registro.
4. Havendo arquivo, o código obtém a extensão, converte-a para minúsculas e cria
   um nome com UUID. **A foto é salva primeiro**, por `foto.save`, em
   `/app/uploads/<nome>`. Como esse diretório é uma montagem de `fotos`, os bytes
   são gravados no volume, usando as permissões do usuário `app`.
5. Só depois o código chama `conectar()`. O psycopg usa as variáveis de ambiente;
   o DNS interno do Docker resolve `db`, e a conexão SQL segue pela bridge para
   a porta 5432 do PostgreSQL.
6. O comando parametrizado `INSERT INTO itens ... RETURNING id` grava descrição,
   local e **nome do arquivo** na tabela. Os bytes da foto não são inseridos no
   banco. O contexto da conexão confirma a transação ao sair normalmente; o
   PostgreSQL mantém seus arquivos no volume `dados_banco`.
7. O Flask retorna HTTP 201 com `id` e `foto`. Na listagem `GET /itens`, o campo
   `foto` aparece como `/fotos/<nome>`; a requisição a essa URL lê o arquivo do
   volume e o devolve ao cliente.

Salvar o arquivo e confirmar a transação SQL são operações separadas no código
fornecido. Uma falha entre elas pode deixar uma foto sem registro; o protótipo
não implementa uma transação conjunta nem rotina de limpeza para esse caso.

## (d) Ciclo de vida dos volumes: três ensaios

Os três ensaios abaixo foram inicialmente executados na arquitetura básica.
Os volumes e o código fornecido permanecem iguais na versão com bônus, enquanto
os testes posteriores registram o novo caminho HTTP pelo Nginx.

| Ensaio da Tarefa 5 | Antes | Depois | Evidência |
| --- | --- | --- | --- |
| Recriação com `down` e `up -d` | 6 itens, 2 fotos | 6 itens, 2 fotos; mesmos registros completos, IDs, URLs e bytes das fotos | [06 — recriação](evidencias/06-persistencia-recriacao.txt) |
| Inspeção dos volumes | 6 itens, 2 fotos | 6 itens, 2 fotos; inspeção não alterou os dados | [12 — inspeção](evidencias/12-inspecao-volumes.txt) |
| Remoção com `down -v` e `up -d` | 6 itens, 2 fotos | 3 itens de exemplo, 0 fotos; cadastros de teste ausentes e fotos antigas com HTTP 404 | [14 — remoção](evidencias/14-remocao-volumes.txt) |

### Recriação preservando dados

`docker compose down` removeu contêineres e a rede, preservando os volumes.
A nova subida montou esses mesmos volumes nos novos contêineres. A comparação
incluiu os dois itens com foto, IDs 4 e 5, e o cadastro sem foto, ID 6, além dos
três registros iniciais. Os hashes SHA-256 das duas fotos continuaram iguais.

### Inspeção e localização física

`docker volume ls` identificou os volumes reais, e `docker volume inspect`
informou estes pontos de montagem no ambiente Linux testado:

| Volume real | Caminho no host do daemon | Caminho no contêiner |
| --- | --- | --- |
| `g1-nuvem_dados_banco` | `/var/lib/docker/volumes/g1-nuvem_dados_banco/_data` | `/var/lib/postgresql/data` em `db` |
| `g1-nuvem_fotos` | `/var/lib/docker/volumes/g1-nuvem_fotos/_data` | `/app/uploads` em `web` |

O Docker informou `OperatingSystem=Omarchy` e `DockerRootDir=/var/lib/docker`.
Esses dados ficam no armazenamento administrado pelo Docker, fora da pasta do
repositório. No Docker Desktop, o caminho mostrado por `Mountpoint` normalmente
pertence à VM Linux do daemon, não a uma pasta diretamente equivalente do
Windows/macOS. Já `init.sql` é um arquivo concreto do repositório, compartilhado
por bind mount. A listagem de `/app/uploads` encontrou os dois PNGs, ambos de
179 bytes e pertencentes a `app`.

### Remoção e nova inicialização

Antes da destruição autorizada, foram preservados um dump do banco, um arquivo
`fotos.tar.gz` e as respostas JSON em um diretório temporário fora do repositório.
A [evidência 13](evidencias/13-preservacao-antes-remocao.txt) identifica o local e
os hashes. A leitura dos formatos foi conferida; restauração não foi executada,
e esta preservação não constitui demonstração completa do bônus de backup.

`docker compose down -v` removeu os dois volumes do projeto. Na subida seguinte,
foram criados volumes vazios. A imagem PostgreSQL inicializou o novo banco e
executou o `init.sql` montado, recriando a tabela e os três exemplos com IDs 1 a 3.
Os exemplos foram **recriados**, não preservados: suas datas de criação mudaram.
Os itens adicionados nos testes desapareceram e as duas URLs antigas de foto
retornaram HTTP 404. O diretório de uploads ficou vazio (`total 0`).

Ao fim desse ensaio básico, o ambiente ficou com **3 itens e 0 fotos**. Parar (`stop`), remover
contêineres (`down`) e apagar também os volumes (`down -v`) têm efeitos diferentes;
somente o último comando destrói os dados persistentes neste roteiro.
Os comandos `stop` e `start` também foram executados, mantendo as estatísticas,
conforme a [evidência 17](evidencias/17-parada-retomada.txt).

### Revalidação da versão com bônus

A [evidência 22](evidencias/22-persistencia-com-proxy.txt) repetiu a recriação e
as inspeções com Nginx, comprovando a permanência dos seis itens e das duas fotos.
A [evidência 23](evidencias/23-clone-e-aceite.txt) foi além: um snapshot dos arquivos
atuais foi commitado somente em um repositório temporário e clonado para uma pasta
nova, sem copiar `.env`. Após copiar o exemplo, `up -d --build` criou o ambiente
com volumes novos. As rotas, os três ensaios da Tarefa 5 e `stop`/`start` foram
verificados nessa cópia. O `down -v` ficou restrito aos recursos do projeto isolado.

O [manifesto](evidencias/23-manifesto-operacional.json) registra os hashes dos
arquivos operacionais testados. O ambiente original foi retomado sem perdas,
com **6 itens e 2 fotos**, Nginx, uma instância de `web` e `db`. O Adminer permaneceu
desativado. A [demonstração de backup](evidencias/19-backup-restauracao.txt) restaurou
as fotos em um volume independente, atendendo ao procedimento do bônus descrito
em [BONUS.md](BONUS.md); ela é distinta da preservação temporária histórica em 13.
