# Instruções do projeto — G1 de Computação em Nuvem

## 1. Objetivo e fonte dos requisitos

Este repositório contém a avaliação G1 de Computação em Nuvem: empacotar o
**Achados & Perdidos** em contêineres, com PostgreSQL e armazenamento persistente
das fotos, e documentar o ambiente para que outra equipe possa migrá-lo à nuvem.

Fonte: `G1-CN-2N.pdf`, especialmente as seções 2 a 7 e o Apêndice A, além dos
requisitos transcritos pelo aluno na conversa. Em caso de dúvida, consultar o
enunciado; não inventar exigências, resultados ou evidências.

Resultado esperado: após clonar o repositório e copiar `.env.example` para `.env`,
uma pessoa consegue subir o ambiente completo com:

```sh
docker compose up -d --build
```

Não exigir instalação local de Python, PostgreSQL ou dependências da aplicação.
O Docker e o Docker Compose devem ser suficientes para executar o ambiente.

## 2. Escopo e forma de trabalhar

- A aplicação fornecida é **Python/Flask**, com Gunicorn e PostgreSQL. Não migrar
  para Django: a conversa inicial sobre Django antecede a leitura do enunciado.
- Preservar os arquivos fornecidos no Apêndice A: `app/app.py`,
  `app/requirements.txt` e `db/init.sql`. O desafio é configurar o ambiente;
  não alterar a aplicação para contornar problemas de infraestrutura.
- As dependências fornecidas são `flask==3.0.3`, `psycopg[binary]==3.2.3` e
  `gunicorn==23.0.0`.
- Trabalhar por etapas, conforme as solicitações do aluno, explicando em
  português o propósito das configurações e sua relação com os requisitos.
- Preservar alterações existentes do aluno. Se um arquivo fornecido divergir
  do apêndice, comparar e explicar a divergência antes de propor sua correção.
- Não declarar um requisito concluído sem a verificação correspondente.
- Evidências precisam vir de comandos realmente executados e corresponder à
  versão entregue. Não fabricar saídas, capturas ou resultados de testes.
- Falhas de execução ou ausência de Docker devem ser registradas como
  limitações; documentação escrita não substitui teste realizado.
- Priorizar todos os requisitos obrigatórios antes de implementar bônus.

## 3. Estrutura de entrega

O nome da pasta raiz local pode continuar sendo `G1-Nuvem`. Manter a estrutura
interna exigida pela Tarefa 1 e os artefatos da Tarefa 6:

```text
G1-Nuvem/
├── AGENTS.md
├── app/
│   ├── app.py                  # fornecido
│   ├── requirements.txt        # fornecido
│   ├── Dockerfile
│   └── .dockerignore
├── db/
│   └── init.sql                # fornecido
├── docs/
│   ├── ARQUITETURA.md          # opção com Mermaid
│   ├── RELATORIO.md
│   ├── REFLEXAO.md
│   └── evidencias/
├── docker-compose.yml
├── .env                        # somente local; não entregar/versionar
├── .env.example
├── .gitignore
└── README.md
```

`docs/ARQUITETURA.md` é uma escolha de organização para a opção Mermaid.
O enunciado também aceita `docs/arquitetura.png` ou Mermaid em outro Markdown.
Não é necessário entregar as duas formas.

## 4. Arquitetura obrigatória

| Componente | Configuração exigida |
| --- | --- |
| `web` | Imagem própria construída a partir de `./app`; Flask servido por Gunicorn |
| Porta web | Gunicorn em `0.0.0.0:5000`; publicação `8080:5000` |
| `db` | Imagem oficial `postgres:16-alpine`; sem porta publicada no host |
| Rede | `rede_interna`, do tipo bridge definida pelo usuário, compartilhada por `web` e `db` |
| Comunicação | `web` encontra PostgreSQL pelo nome `db`, na porta `5432` |
| Volume PostgreSQL | `dados_banco` em `/var/lib/postgresql/data` no serviço `db` |
| Volume de fotos | `fotos` em `/app/uploads` no serviço `web` |
| Inicialização SQL | Bind mount de `./db/init.sql` em `/docker-entrypoint-initdb.d/init.sql`, somente leitura |
| Reinício | `restart: unless-stopped` nos dois serviços |
| Disponibilidade | Healthcheck do banco com `pg_isready`; `web` depende de `db` com `condition: service_healthy` |

Apenas `web` deve estar acessível pelo host na arquitetura obrigatória.
O nome `rede_interna` indica a rede privada entre os serviços; não confundir o
nome com a obrigação de definir a propriedade Compose `internal: true`, que
não é exigida pelo enunciado.

## 5. Requisitos funcionais

| ID | Rota | Resultado esperado |
| --- | --- | --- |
| RF01 | `GET /health` | HTTP 200 com `status: "ok"` e `banco: "conectado"` quando o banco estiver acessível |
| RF02 | `GET /itens` | Lista os objetos cadastrados |
| RF02 | `GET /itens?local=texto` | Filtra os objetos pelo local |
| RF03 | `POST /itens` | Cadastra `descricao` e `local`, com arquivo `foto` opcional, usando formulário multipart; retorna HTTP 201 |
| RF04 | `GET /fotos/<nome>` | Devolve a foto armazenada |
| RF04 | `GET /estatisticas` | Informa a quantidade de itens no banco e de fotos no volume |

## 6. Dockerfile e contexto de build — Tarefa 2

- Partir de imagem oficial Python 3.12, variante `slim`.
- Copiar `requirements.txt` e instalar dependências antes de copiar `app.py`,
  aproveitando o cache de camadas.
- Instalar dependências com `pip` sem manter seu cache na imagem.
- Criar `/app/uploads` e um usuário sem privilégios, dono desse diretório.
- Garantir que o usuário tenha permissão de escrita no volume de fotos e que
  a aplicação execute como esse usuário.
- Documentar a porta com `EXPOSE 5000`.
- Iniciar Gunicorn em `0.0.0.0:5000`, usando a forma exec, com lista de argumentos.
- Em `app/.dockerignore`, impedir a inclusão de `.env`, `__pycache__/` e `*.pyc`.
- Não copiar credenciais para a imagem nem executar a aplicação como root.

## 7. Variáveis e segredos — Tarefa 3

- As credenciais devem vir de `.env`, nunca de valores literais no Dockerfile,
  no Compose, no código ou na documentação/evidência versionada.
- `db` recebe `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` com valores
  provenientes do `.env`.
- `web` recebe `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e
  `UPLOAD_DIR`, coerentes com as configurações do banco e do volume.
- O código usa `db` como host padrão e `/app/uploads` como diretório padrão
  de fotos. Configurar Gunicorn para a porta 5000.
- `.env.example` deve conter as mesmas chaves usadas no `.env`, com valores
  fictícios de demonstração, sem senha real. A cópia do exemplo precisa permitir
  o teste inicial conforme o checklist; orientar a substituição dos valores
  de demonstração para uso fora do exercício.
- `.gitignore` deve ignorar `.env`. Verificar também se ele já está rastreado
  ou preparado no índice: ignorar um arquivo não remove seu rastreamento.
- Não mostrar o conteúdo de `.env` nem registrar comandos que exponham senhas
  em evidências. Conferir saídas resolvidas de configuração antes de salvá-las.
- Antes da entrega, verificar arquivos preparados para commit e histórico.
  Se uma senha real tiver sido publicada, removê-la e tratar sua substituição.

## 8. Testes funcionais e evidências — Tarefa 4

Executar e guardar saídas reais em `docs/evidencias/`:

1. `docker compose up -d --build`.
2. `docker compose ps`: ambos em execução e banco saudável.
3. `GET /health` com os campos exigidos.
4. `GET /itens`, incluindo os três registros iniciais em um banco novo.
5. `GET /itens?local=biblio`.
6. `POST /itens` com descrição, local e foto `.jpg` ou `.png` de teste.
7. `GET /estatisticas`.
8. Abertura no navegador da URL da foto retornada por `GET /itens`.
9. `docker compose logs web --tail 20`.

No PowerShell, usar `curl.exe` para as chamadas HTTP. Usar uma imagem de teste
sem dados pessoais. Adaptar caminhos e sintaxe dos exemplos ao sistema usado.

## 9. Persistência e ciclo de vida — Tarefa 5

Registrar `GET /estatisticas` antes de cada etapa e comparar com o resultado
posterior. Guardar identificadores, URLs e evidências suficientes para confirmar
que os itens e as fotos são os mesmos, além de comparar as contagens.

1. **Recriação:** cadastrar pelo menos dois objetos com foto; executar
   `docker compose down` e `docker compose up -d`; verificar que os registros
   e as imagens permanecem acessíveis.
2. **Inspeção:** executar `docker volume ls` e `docker volume inspect` para os
   dois volumes; identificar seus nomes reais e pontos de montagem; executar
   `docker compose exec web ls -l /app/uploads`. Explicar onde os dados ficam,
   distinguindo o armazenamento do Docker do sistema de arquivos do host,
   especialmente no Docker Desktop.
3. **Remoção:** no ambiente de teste da prova, executar
   `docker compose down -v` e subir novamente. Esse comando apaga os volumes:
   documentar a perda dos itens cadastrados e fotos e a recriação dos três
   itens de exemplo pela execução de `init.sql` no banco vazio.

Não usar `down -v` como procedimento comum de parada. Não aplicar o ensaio de
remoção a dados reais; preservar previamente qualquer dado que precise continuar
existindo. Explicar no README a diferença entre parar, remover contêineres e
destruir os volumes.

## 10. Artefatos explicativos — Tarefa 6

### A1 — `README.md`

Incluir objetivo, pré-requisitos, configuração do `.env` a partir do exemplo,
passo a passo para subir, testar, parar e destruir o ambiente e tabela de todas
as rotas da API. Testar o roteiro do zero em uma cópia limpa do repositório, com
volumes novos, sem depender de recursos previamente criados ou do `.env` local.

### A2 — Diagrama

Mostrar host, cliente HTTP, publicação `8080:5000`, os dois contêineres,
comunicação com `db:5432`, limites da `rede_interna`, os dois volumes e os caminhos
de montagem. Mostrar o bind mount somente leitura de `init.sql`. Distinguir
componentes dentro e fora da rede e deixar explícito que o banco não publica
porta. Vincular o diagrama no README.

### A3 — `docs/RELATORIO.md`

Manter quatro partes identificadas:

- **(a)** Explicar cada instrução do Dockerfile e a ordem escolhida.
- **(b)** Explicar cada bloco do Compose: serviços, variáveis, build/imagem,
  portas, montagens, healthcheck, dependência, política de reinício e rede.
- **(c)** Descrever, em lista numerada ou sequência, o caminho completo de um
  `POST /itens` com foto: `curl`, porta do host, Gunicorn/Flask, gravação do arquivo,
  conexão SQL, registro no PostgreSQL, volumes e resposta HTTP. Respeitar a ordem
  real do código fornecido, que salva a foto antes de inserir o registro.
- **(d)** Explicar o ciclo de vida dos volumes com base nos três ensaios da
  Tarefa 5 e vincular as evidências correspondentes.

### A4 — `docs/evidencias/`

Além de todas as saídas das Tarefas 4 e 5, registrar:

- `docker network inspect` da rede efetivamente criada pelo Compose.
- `docker image ls`, identificando a imagem gerada e seu tamanho.
- `docker compose exec web whoami`, comprovando usuário diferente de root.
- Configuração/inspeção suficiente para comprovar ausência de porta publicada
  do banco sem expor segredos.

Usar nomes numerados e descritivos, por exemplo `01-subida.txt` e
`02-health.txt`. Cada evidência deve ter uma legenda de uma linha, no próprio
arquivo de texto ou em um índice Markdown. Relacionar o teste ao resultado e ao
critério correspondente; não marcar comandos apenas sugeridos como executados.

### A5 — `docs/REFLEXAO.md`

Responder às sete questões em **3 a 8 linhas cada**, citando os próprios arquivos
e evidências sempre que possível:

1. **Q1 — DNS:** por que `web` usa o nome `db`; quem resolve esse nome; o que
   mudaria com `docker run` usando a rede bridge padrão.
2. **Q2 — Montagens:** diferença entre volume nomeado e bind mount; justificar
   as escolhas para `init.sql` e os dados do banco.
3. **Q3 — Inicialização:** efeito de alterar `init.sql` após a primeira subida;
   explicar como aplicar mudanças de esquema sem perder dados.
4. **Q4 — Prontidão:** por que `depends_on` sem `condition: service_healthy`
   não garante conexão na primeira tentativa.
5. **Q5 — Cache:** efeito da ordem `COPY requirements.txt`, instalação e
   `COPY app.py`; explicar o rebuild quando apenas o código muda.
6. **Q6 — Proteção:** justificar não publicar `5432`; relacionar fotos de
   documentos pessoais à LGPD e propor duas medidas adicionais de proteção.
7. **Q7 — Réplicas:** executar `docker compose up -d --scale web=3`, registrar
   o resultado e explicar o comportamento; indicar o necessário para três
   réplicas e discutir a segurança do compartilhamento do volume de fotos.

Na seção 5.1, preencher as seis linhas abaixo com serviços gerenciados
equivalentes e acrescentar um parágrafo sobre qual peça mais muda na migração
e por quê:

| Peça local | Microsoft Azure | AWS | Google Cloud |
| --- | --- | --- | --- |
| Contêiner `web` | A preencher | A preencher | A preencher |
| Contêiner `db` + volume `dados_banco` | A preencher | A preencher | A preencher |
| Volume `fotos` | A preencher | A preencher | A preencher |
| `rede_interna` | A preencher | A preencher | A preencher |
| Arquivo `.env` (segredos) | A preencher | A preencher | A preencher |
| Imagem construída localmente | A preencher | A preencher | A preencher |

Ao redigir a reflexão, conferir os serviços nas fontes oficiais dos provedores
e a referência à LGPD em fonte oficial. Distinguir propostas de migração das
funcionalidades realmente implementadas no protótipo.

## 11. Bônus opcionais — seção 6

Não fazem parte da implementação inicial obrigatória:

- **Proxy reverso (+0,4):** Nginx na frente de `web`; somente Nginx publica
  `8080`, e `web` deixa de publicar porta. Atualizar o diagrama e explicar a
  alteração em relação à arquitetura básica.
- **Backup (+0,3):** documentar e demonstrar backup de `fotos` em `.tar.gz`
  usando contêiner temporário com `docker run --rm` e restauração em volume novo.
- **Painel (+0,3):** Adminer com `profiles: ["debug"]`, iniciado com
  `docker compose --profile debug up -d`.

## 12. Checklist de aceite e entrega

Manter os itens pendentes até haver comprovação:

- [ ] Pasta recém-clonada funciona após copiar `.env.example` para `.env` e executar `docker compose up -d --build`.
- [ ] `GET /health` retorna `status: "ok"` e `banco: "conectado"`.
- [ ] Todas as rotas RF01 a RF04 foram testadas.
- [ ] Nenhuma senha real está no Dockerfile, no Compose, no código, nas evidências ou no repositório.
- [ ] `.env` não está rastreado, preparado para commit nem incluído no pacote de entrega.
- [ ] Banco não publica porta no host.
- [ ] `docker compose exec web whoami` retorna um usuário diferente de root.
- [ ] Banco saudável é condição para iniciar `web`.
- [ ] Itens e fotos sobrevivem a `down` seguido de `up`.
- [ ] Três situações da Tarefa 5 foram demonstradas com evidências.
- [ ] README contém um passo a passo efetivamente testado do zero.
- [ ] Diagrama mostra rede, volumes, caminhos de montagem, bind mount e portas.
- [ ] Relatório técnico contém as quatro partes (a) a (d).
- [ ] Evidências reais estão nomeadas e legendadas em `docs/evidencias/`.
- [ ] Sete reflexões e tabela de equivalência dos três provedores estão completas.
- [ ] Entrega por link do repositório ou `.zip`, sem `.env`.

O enunciado informa que senha real versionada zera o critério de Compose;
passos manuais não documentados zeram Funcionamento; evidências incompatíveis
com o código zeram o critério correspondente.

## 13. Observações da inspeção inicial

Na criação deste documento, já existiam arquivos da aplicação e de infraestrutura,
e havia alterações do aluno preparadas e não preparadas no Git. Isso não comprova
que a implementação ou os testes estejam completos.

Foi observado `.env` preparado para inclusão no Git. Seu conteúdo não foi lido
para escrever estas instruções. Antes de qualquer commit ou entrega, corrigir
seu rastreamento e garantir a regra de exclusão em `.gitignore`, preservando o
arquivo local. Não presumir que o arquivo já foi publicado nem que contém senha
real sem verificar.

Esta etapa cria apenas as instruções do projeto. Implementação, documentação
final e coleta de evidências serão realizadas nas etapas seguintes.
