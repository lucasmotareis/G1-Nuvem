# Interface web para demonstração

O frontend é um cliente HTML/CSS/JavaScript da API existente. Ele não altera
`app/app.py`, `app/requirements.txt` ou `db/init.sql` e não acessa diretamente o
PostgreSQL. Não há Django, compilação JavaScript, fontes remotas ou dependência
de CDN. Docker e Compose continuam suficientes para executar o projeto.

## Executar e apresentar

Na raiz do repositório, prepare o `.env` pelo exemplo, preservando um arquivo
local que já exista, e execute:

```sh
docker compose up -d --build
```

Abra **http://localhost:8080** e informe usuário `visitante` e a senha do `.env`.
A entrada é solicitada pelo navegador; consulte [ACESSO.md](ACESSO.md).
Um roteiro de demonstração ao professor:

1. Mostre o indicador de conexão e a quantidade de itens/fotos reais.
2. Procure por `biblio` e confira o filtro por local; limpe o filtro.
3. Cadastre um objeto com descrição, local e uma foto de teste sem dados pessoais.
4. Confira o número do registro, o novo cartão e o incremento das estatísticas.
5. Clique na miniatura para abrir a foto ampliada. Feche com o botão ou Escape.
6. Cadastre outro objeto sem foto para demonstrar que ela é opcional.
7. Execute `docker compose down` e `docker compose up -d`, mantendo os volumes.
   Atualize a página e confira os mesmos registros e fotos.
8. Mostre também as chamadas `curl.exe` do README e os arquivos de evidências.

A interface complementa o roteiro do enunciado; não substitui suas evidências
de Docker, rede, API e volumes.

## Como as peças se conectam

| Arquivo | Responsabilidade |
| --- | --- |
| [index.html](../frontend/index.html) | Estrutura, formulários com rótulos, lista e diálogo de foto. |
| [styles.css](../frontend/styles.css) | Layout responsivo, estados de foco e preferência de movimento reduzido. |
| [app.js](../frontend/app.js) | Consultas HTTP, filtro, multipart `FormData`, prévia de foto e mensagens. |
| [Dockerfile](../frontend/Dockerfile) | Imagem baseada em `nginx:1.30-alpine`, com os arquivos estáticos e configurações. |
| [.dockerignore](../frontend/.dockerignore) | Permite apenas os arquivos necessários no contexto de build. |
| [routing.conf](../frontend/routing.conf) | Serve `/`, `/index.html`, `/styles.css` e `/app.js`; encaminha os demais caminhos à API. |
| [nginx/default.conf](../nginx/default.conf) | Upstream `web:5000` e DNS Docker para o Compose; montado somente para leitura. |
| [frontend/nginx.conf](../frontend/nginx.conf) | Upstream `127.0.0.1:5000` para os dois contêineres na mesma task AWS. |

O navegador usa caminhos relativos ao próprio site (`/itens`, `/health`,
`/estatisticas` e `/fotos/...`), sem URL fixa de localhost e sem precisar de CORS.
A senha do banco não é enviada ao frontend. Textos recebidos são inseridos com
`textContent`, evitando interpretar descrições/locais como HTML.

O filtro é executado pela API por `GET /itens?local=...`, não apenas sobre os
cartões visíveis. O cadastro envia `POST /itens` com `descricao`, `local` e
`foto` opcional. Nenhum `Content-Type` multipart é definido manualmente: o
navegador gera o boundary. Após HTTP 201, a interface limpa o formulário e
atualiza a lista/contagens. Se não conseguir confirmar, preserva os campos e
orienta conferir a lista antes de reenviar, pois um timeout pode ocorrer depois
de o servidor já ter gravado o registro.

Descrição e local respeitam os limites das colunas existentes (200 e 100
caracteres). A interface aceita JPG/PNG de até 10 MB. Essa validação é apenas
uma conveniência no navegador: a API e o Nginx mantêm o comportamento anterior,
sem limite global. O Nginx agora exige senha antes de encaminhar qualquer
rota pública. A validação de arquivo no navegador não equivale a uma proteção
de uploads no servidor.

O total de fotos vem de `/estatisticas`: é a quantidade de arquivos no volume,
que não precisa ser idêntica à quantidade de registros com foto, pois arquivo
e transação SQL são operações separadas no código fornecido.

## Atualizar os arquivos

Os arquivos estáticos são copiados para a imagem. Depois de alterá-los,
reconstrua com `docker compose up -d --build`. A configuração local
`nginx/default.conf` continua sendo bind mount; valide com
`docker compose exec nginx nginx -t` e reinicie o Nginx após alterar esse arquivo.
As rotas inexistentes continuam retornando o 404 da API, sem fallback para a
página inicial. Os arquivos estáticos pedem revalidação de cache.

## Testes de navegador opcionais para desenvolvimento

Estes testes são adicionais e **não são pré-requisito para executar a aplicação**.
Com Node.js 20 ou superior e o ambiente de teste já em execução:

```powershell
npm install
npx playwright install chromium
$env:TEST_BASE_URL = 'http://localhost:8080'
```

Depois configure `TEST_ACCESS_PASSWORD` pela entrada protegida descrita em
[ACESSO.md](ACESSO.md#verificação-de-desenvolvimento) e execute os testes.

Use um ambiente descartável: o teste cadastra dois objetos, um deles com foto.
O script está em [tests/frontend.mjs](../tests/frontend.mjs). Ele cobre as rotas
reais pelo navegador e identifica explicitamente os cenários de erro e segurança
com respostas simuladas. A execução salva relatório JSON e capturas desktop
e móvel em `test-results/frontend/` (ignorado pelo Git), preservando as evidências
históricas. Para uma coleta deliberada em outro diretório, configure
`TEST_OUTPUT_DIR` antes do comando. Não use respostas simuladas como prova de
disponibilidade do banco ou da infraestrutura.

Os ensaios desta branch usam um projeto isolado `g1-frontend-validacao`, com
credenciais fictícias do `.env.example`, volumes novos e porta `127.0.0.1:18080`.
O [índice das evidências](evidencias/README.md) registra os comandos e resultados.

Para repetir a subida isolada no PowerShell (Compose recente com suporte a
`!override`), sem usar o `.env` nem os volumes de outro projeto:

```powershell
$FrontendOverride = Join-Path $env:TEMP 'g1-frontend-compose.yml'
@'
services:
  nginx:
    ports: !override
      - "127.0.0.1:18080:80"
'@ | Set-Content -LiteralPath $FrontendOverride -Encoding utf8
docker compose --env-file .env.example -p g1-frontend-validacao -f docker-compose.yml -f $FrontendOverride up -d --build
$env:TEST_BASE_URL = 'http://127.0.0.1:18080'
npm run test:frontend
```

O exemplo acima usa a credencial pública de demonstração de `.env.example`;
os testes ainda precisam receber `TEST_ACCESS_PASSWORD`. No ambiente local
configurado com uma senha própria, use `--env-file .env` para atualizar o mesmo
projeto, sem revelar o arquivo ou alterar as credenciais do PostgreSQL.

Para encerrar somente esses contêineres preservando os dados de teste:

```powershell
docker compose --env-file .env.example -p g1-frontend-validacao -f docker-compose.yml -f $FrontendOverride down
```

## Publicar na AWS

O [guia AWS](GUIA_AWS.md) foi atualizado para duas imagens ECR e dois contêineres
na mesma task Fargate. O acesso entra na porta 80 do frontend Nginx, que consulta
o Flask em localhost:5000. `web` recebe o segredo do banco e a montagem S3 Files;
`frontend` recebe outro segredo para a senha de entrada. O ALB com HTTPS
encaminha para `frontend:80` e verifica `/healthz` na porta interna 8082.
A configuração AWS foi testada
localmente com dois contêineres compartilhando a rede; isso não comprova
implantação em ECS, RDS ou S3 Files, que continua pendente.
