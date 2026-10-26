# AWS: etapa 4 — PostgreSQL e segredos

Configuração executada em **26/10/2026**, pelo MCP oficial da AWS, em
**Norte da Virgínia (`us-east-1`)**, na mesma conta da [etapa 3](AWS-ETAPA-03.md).
O RDS chegou ao estado **`available`**. A leitura final, às **16h48 de Brasília**
(`19:48 UTC`), confirmou a configuração descrita abaixo.

## O que esta etapa prepara

O RDS assume o papel do contêiner PostgreSQL e do volume `dados_banco`.
O Secrets Manager guarda duas credenciais independentes: a conexão com o banco
e a entrada compartilhada do site. A aplicação ainda não está publicada.

| Recurso | Configuração aplicada |
| --- | --- |
| Instância RDS | `g1-achados-db`, PostgreSQL **16.15**. |
| Capacidade | `db.t4g.micro`, Single-AZ, em `us-east-1a`. |
| Armazenamento | **20 GiB gp3**, criptografado com a chave gerenciada `aws/rds`; sem expansão automática configurada. |
| Banco inicial / usuário | `achados` / `achados_admin`. |
| VPC | `vpc-0de41f84c70ccf93b`. |
| Grupo de sub-redes | `g1-achados-db-subnets`, com as sub-redes A e B da etapa 3. |
| Rede | IPv4; **acesso público desativado**; somente `g1-db-sg` (`sg-077c23028b341c028`). |
| Entrada PostgreSQL | TCP **5432**, somente de `g1-web-sg` (`sg-0032fd6de918bc221`). |
| TLS | Grupo `default.postgres16`, cujo padrão consultado é `rds.force_ssl=1`. |
| Backups automáticos | Retenção de **7 dias**. |
| Exclusão | Proteção contra exclusão **ativada**. |
| Monitoramento | Database Insights Standard com retenção de 7 dias (API: Performance Insights); Enhanced Monitoring desativado. |
| Manutenção | Atualização automática de versões menores habilitada; RDS Extended Support desativado. |

O grupo contém duas zonas porque o RDS exige essa cobertura de sub-redes.
**Single-AZ** significa que só foi solicitada uma instância, sem réplica de
failover em outra zona. Essa escolha segue o laboratório do roteiro.

## Segredos criados

| Nome | Chaves JSON | Uso posterior |
| --- | --- | --- |
| `g1/achados/db` | `username`, `password` | O ECS injetará `DB_USER` e `DB_PASSWORD` no contêiner `web`. |
| `g1/achados/acesso` | `password` | O ECS injetará `ACCESS_PASSWORD` no contêiner `frontend`, usuário `visitante`. |

A AWS gerou a senha do banco com **32 caracteres alfanuméricos**, compatíveis
com a montagem de DSN do código fornecido. O valor foi transferido ao RDS
dentro da execução do MCP, sem retornar a senha ao chat ou salvá-la em arquivo.
O segredo de acesso contém a senha compartilhada já escolhida pelo aluno.
Ambos usam a chave padrão `aws/secretsmanager`, sem rotação automática.
Uma troca futura da senha do banco precisa atualizar também a credencial no
PostgreSQL; editar apenas o segredo não altera a senha do RDS.

ARNs completos, usados por referência na etapa do ECS:

```text
Banco:  arn:aws:secretsmanager:us-east-1:429100831877:secret:g1/achados/db-w28d8y
Acesso: arn:aws:secretsmanager:us-east-1:429100831877:secret:g1/achados/acesso-TR13WW
```

Os ARNs identificam os recursos; não contêm suas senhas. O modelo
[task-definition.example.json](../infra/aws/task-definition.example.json)
permanece com marcadores para preenchimento na etapa 8.

Endpoint destinado a `DB_HOST` na etapa 8:

```text
g1-achados-db.cwzoegmiwx9c.us-east-1.rds.amazonaws.com
```

Use `DB_PORT=5432`, `DB_NAME=achados` e `PGSSLMODE=require`, como no modelo.
As variáveis de usuário e senha devem continuar referenciando o segredo.

## Como acompanhar no console

1. Selecione **Norte da Virgínia (`us-east-1`)**.
2. Abra **RDS → Databases → g1-achados-db**. Aguarde **Available**.
3. Em **Connectivity & security**, confira endpoint, porta `5432`, VPC,
   grupo `g1-db-sg` e **Publicly accessible: No**.
4. Em **Configuration**, confira PostgreSQL 16, classe, banco inicial,
   armazenamento criptografado, backups e proteção contra exclusão.
5. Em **RDS → Subnet groups**, confira as duas zonas em `g1-achados-db-subnets`.
6. Abra **Secrets Manager → Secrets** e localize os dois nomes da tabela.
   Para conferir a criação, basta a página de metadados; não capture o valor
   do segredo em imagens ou evidências.

O banco privado será acessado pela futura task do ECS. Uma tentativa de
conexão direta do seu computador não é o teste previsto nesta arquitetura.
Isso não restringe os visitantes do site: eles entrarão pelo ALB/HTTPS e a
aplicação fará as consultas ao banco dentro da VPC.

## Custo consultado e encerramento

Consulta real à API AWS Price List em 26/10/2026, para `us-east-1`, em dólares:

| Componente | Preço consultado | Estimativa mensal |
| --- | --- | --- |
| Instância ligada 730 horas | US$ 0,016/h | US$ 11,68 |
| 20 GiB gp3 | US$ 0,115/GB-mês | US$ 2,30 |
| Dois segredos | US$ 0,40/segredo-mês | US$ 0,80 |
| **Subtotal desta etapa** | | **US$ 14,78** |

Estimativa sem créditos, impostos, câmbio, chamadas do Secrets Manager,
transferência, excedentes de CPU/backup ou recursos das próximas etapas.
O modo Standard com sete dias de histórico não acrescenta cobrança de
monitoramento nesta seleção, conforme os
[preços de Performance Insights / Database Insights](https://aws.amazon.com/rds/performance-insights/pricing/).
O subtotal considera um mês completo; a cobrança efetiva depende do uso.
O RDS começa a gerar cobrança após o provisionamento, mesmo sem o site pronto.

Para uma pausa curta, é possível parar o RDS; armazenamento continua cobrando
e a AWS reinicia a instância após sete dias. Para encerrar definitivamente,
preserve os dados necessários e desative a proteção contra exclusão antes de
excluir a instância. Decida quais snapshots guardar, pois podem gerar cobrança.
Consulte o [encerramento do laboratório](GUIA_AWS.md#13-encerrar-o-laboratório-e-controlar-custos).

## Limites desta verificação e continuação

Esta etapa verifica a configuração dos serviços pela API. A conexão SQL real,
a criação da tabela `itens` e os três registros do `db/init.sql` serão testados
na **etapa 9**, com uma tarefa dentro da VPC. Criar o banco `achados` no RDS não
executa automaticamente o bind mount SQL do Docker Compose.

A [evidência 02](evidencias/aws/02-banco-segredos.json) registra as criações,
consultas de preços, metadados dos segredos, chaves KMS e a verificação final.
Os quinze critérios de configuração retornaram verdadeiros: disponibilidade,
versão, acesso privado, criptografia, Single-AZ, armazenamento, sub-redes,
grupo associado, regra de entrada, TLS, backups, proteção contra exclusão,
endpoint e versões atuais dos dois segredos. A consulta dos segredos confirmou
as chaves JSON e o formato das senhas sem retornar seus valores.

A etapa 4 está concluída; a próxima etapa do roteiro é a **5: S3 e S3 Files**.
Essa etapa foi executada posteriormente, conforme o
[registro do armazenamento](AWS-ETAPA-05.md). O envio posterior das imagens está
no [registro da etapa 6, ECR](AWS-ETAPA-06.md).
`app/app.py`, `app/requirements.txt` e `db/init.sql` permanecem preservados.

Fontes: [criação do RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.html),
[TLS no PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html),
[preços do PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/),
[preços do Secrets Manager](https://aws.amazon.com/secrets-manager/pricing/)
e [parada do RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html).
