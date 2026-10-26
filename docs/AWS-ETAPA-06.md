# AWS: etapa 6 — imagens no ECR

Executada em **26/10/2026**, pelo MCP oficial da AWS e pelo Docker Desktop local,
na região **Norte da Virgínia (`us-east-1`)**. Os dois repositórios privados foram
criados e receberam as imagens do projeto. O ECR armazena essas imagens;
a execução no Fargate fica para as etapas seguintes.

## Imagens a usar na etapa 8

```text
web:
429100831877.dkr.ecr.us-east-1.amazonaws.com/achados-web:aws-v1

frontend:
429100831877.dkr.ecr.us-east-1.amazonaws.com/achados-frontend:aws-v2
```

As tags são distintas porque o frontend foi corrigido após a primeira varredura.
A tag **`aws-v1` do frontend não deve ser usada na implantação**. Ela permanece
no repositório como registro da análise inicial, até a limpeza do laboratório.

| Repositório | Tag escolhida | Digest do índice OCI |
| --- | --- | --- |
| `achados-web` | `aws-v1` | `sha256:974595484c975b0427a78d42fba7bee02ded70ce191d6a4cd5c98b85d8164cbd` |
| `achados-frontend` | `aws-v2` | `sha256:1da2228ea0f9e466d31b05e6f599e7f7065e79e167ef1bf5fc551ca2a6c3d1a0` |

No [modelo ECS](../infra/aws/task-definition.example.json), esses valores
substituirão `SUBSTITUA_URI_ECR_WEB_COM_TAG` e `SUBSTITUA_URI_ECR_FRONTEND_COM_TAG`.
Ambas as imagens são **Linux/AMD64**, correspondendo a `X86_64` na task.

## Configuração dos repositórios e envio

- Repositórios privados, sem política pública ou acesso entre contas configurado.
- Tags **`IMMUTABLE`**, evitando sobrescrever uma versão já enviada.
- Criptografia **AES256**, sem criar uma chave KMS própria.
- Tags de organização `Project=achados-perdidos` e `Environment=laboratorio`.
- Varredura **BASIC / SCAN_ON_PUSH** configurada no registry, com filtros
  somente para os dois nomes do projeto. Amazon Inspector não foi habilitado.

O campo legado `imageScanningConfiguration.scanOnPush` dos repositórios aparece
como `false`. A configuração efetiva foi conferida por
`BatchGetRepositoryScanningConfiguration`, que retorna `scanFrequency: SCAN_ON_PUSH`
e os filtros aplicados. A leitura do campo legado isoladamente não comprova
que a varredura esteja desativada.

Os builds usaram os contextos `./app` e `./frontend`, com `--platform linux/amd64`.
A autenticação do Docker veio de `GetAuthorizationToken` pelo MCP. A credencial
foi recebida por entrada protegida, enviada ao Docker por `--password-stdin`
e armazenada em configuração temporária fora do repositório, removida ao fim
de cada envio. O token não integra as evidências.

O Docker também enviou os manifestos de plataforma e de atestação de build.
Por isso o console pode listar mais artefatos que as tags `aws-v1`/`aws-v2`.
O manifesto `linux/amd64` é a imagem executável; o índice OCI é o que recebe a
tag. Isso não representa réplicas extras em execução.

## Verificações locais

Na imagem `web`, `id` retornou **`uid=999(app) gid=999(app)`**. Um contêiner
descartável confirmou escrita em `/app/uploads`, ausência de `/app/.env` e
ausência de variáveis de credenciais na configuração da imagem. A escrita foi
na camada descartável do contêiner, não no S3 Files: a montagem remota será
testada no ECS.

No frontend corrigido, passaram a sintaxe do Nginx, a criação/verificação do
hash de acesso com **senha fictícia de teste** e o bloqueio da inicialização sem
`ACCESS_PASSWORD` (exit code 1 esperado). A imagem não incorpora essa variável
secreta; o valor real será injetado na execução. O Nginx usa o padrão da imagem
oficial, com processo mestre root e workers sem privilégios. O teste de usuário
sem root exigido para a API refere-se ao contêiner `web`.

`app/app.py`, `app/requirements.txt` e `db/init.sql` foram preservados.

## Varredura e correção aplicada

A varredura básica inicial detectou:

| Imagem inicial | Resultado |
| --- | --- |
| `web:aws-v1` | 3 HIGH, 9 MEDIUM e 3 LOW. |
| `frontend:aws-v1` | 1 CRITICAL, 1 HIGH e 23 UNDEFINED. |

O alerta crítico era **CVE-2026-111497**, no Brotli `1.2.0-r1`. O alerta alto
do frontend era **CVE-2026-92392**, no curl `8.22.0-r0`. O repositório Alpine
oferecia Brotli **`1.2.1-r0`** e curl/libcurl **`8.23.0-r0`**. O
[Dockerfile do frontend](../frontend/Dockerfile) passou a executar
`apk upgrade --no-cache` antes de instalar `apache2-utils`. O rebuild recebeu
a nova tag `aws-v2`, sem alterar o HTML, JavaScript, rotas ou código Flask.
O [upstream do Brotli](https://github.com/google/brotli/releases/tag/v1.2.1)
documenta a correção crítica. A nova varredura do manifesto Linux do frontend
**`aws-v2` terminou como `COMPLETE`, sem findings**, em 26/10/2026 às **17h23
de Brasília** (`20:23 UTC`). Esse resultado refere-se à varredura básica e
à base de vulnerabilidades consultada naquela data; não é garantia de ausência
de falhas na aplicação.

Os três alertas HIGH do backend permanecem abertos: **CVE-2026-5435** e
**CVE-2026-19499** em glibc, e **CVE-2026-85091** em zlib. A consulta
`apt-get update` seguida de simulação de upgrade encontrou apenas atualização
de tzdata, sem correções dessas bibliotecas na distribuição estável usada.
O Debian confirma as pendências para
[glibc / CVE-2026-5435](https://security-tracker.debian.org/tracker/CVE-2026-5435),
[glibc / CVE-2026-19499](https://security-tracker.debian.org/tracker/CVE-2026-19499)
e [zlib](https://security-tracker.debian.org/tracker/CVE-2026-85091).
Isso não comprova explorabilidade pelas rotas da aplicação, nem permite declarar
a imagem livre de vulnerabilidades. Para uso permanente, reavaliar esses alertas
e reconstruir quando houver correções suportadas; não trocar glibc por pacotes
da distribuição instável para contornar a varredura.

Em atualizações futuras do sistema, use `--pull --no-cache` no build do frontend
para consultar novos pacotes, em vez de reutilizar a camada de upgrade em cache.
Use uma nova tag imutável, como `aws-v3` para o próximo frontend.

## Conferir no console e encerrar hoje

1. Selecionar **Norte da Virgínia (`us-east-1`)**.
2. Abrir **ECR → Private repositories**.
3. Em `achados-web`, conferir `aws-v1`; em `achados-frontend`, conferir `aws-v2`.
4. Comparar os digests com a tabela e consultar os resultados de varredura no
   manifesto executável de cada imagem.

O ECR cobra armazenamento por volume e eventuais transferências, sem mensalidade
fixa por repositório. A [página oficial de preços](https://aws.amazon.com/ecr/pricing/)
informa US$ 0,10/GB-mês no exemplo de repositório privado e transferência gratuita
para Fargate/ECS na mesma região. A API Price List não retornou ofertas na consulta
desta etapa; o preço unitário veio dessa página oficial, e não de uma resposta vazia.
Não se presume elegibilidade a créditos ou franquias gratuitas da conta.
Os valores estimados e tamanhos efetivos estão na evidência da etapa.
As três imagens principais retidas (web e duas versões do frontend) somam
aproximadamente **99,27 MiB**. Usando a soma bruta desses tamanhos, o cálculo dá
**US$ 0,009694 por mês** de armazenamento, ou **US$ 0,000080 por seis horas**.
É uma aproximação: camadas compartilhadas, pequenos manifestos, tributos,
franquias e transferências podem alterar o valor faturado. Isso é somente ECR,
não o custo do banco e dos outros recursos do ambiente.

Após a apresentação e a parada das tasks, excluir as imagens e os dois
repositórios exclusivos do laboratório, junto dos demais recursos do
[passo 13](GUIA_AWS.md#13-encerrar-o-laboratório-e-controlar-custos).

## Continuação

A [evidência 04](evidencias/aws/04-imagens-ecr.json) reúne builds, verificações
locais, resultados dos envios, digests remotos, varreduras e cálculo de custo.

As imagens estão publicadas. A aplicação ainda não executa no ECS, e esta etapa
não testa conexão ao RDS ou montagem do S3 Files. A próxima etapa é a **7: roles
IAM de execução e de acesso da task**.
