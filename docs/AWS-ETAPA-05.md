# AWS: etapa 5 — armazenamento das fotos

Recursos criados em **26/10/2026**, pelo MCP oficial da AWS, na região
**Norte da Virgínia (`us-east-1`)**, na mesma conta e VPC das etapas anteriores.
O sistema de arquivos, o access point e os **dois mount targets estão
`available`**. A leitura final foi registrada às **17h04 de Brasília** (`20:04 UTC`).

## Função de cada recurso

O bucket S3 guarda os objetos. O **S3 Files** fornece acesso por arquivos,
compatível com as operações que o Flask já faz em `/app/uploads`. Isso preserva
`app/app.py`, `app/requirements.txt` e `db/init.sql`. O armazenamento ainda será
montado na task do ECS na etapa 8, e os uploads reais serão testados depois.

| Recurso | Identificador |
| --- | --- |
| Bucket exclusivo | `g1-achados-fotos-429100831877-20261026` |
| Sistema de arquivos | `fs-03cc16c6148b70bad`, nome `g1-achados-fotos` |
| Access point da aplicação | `fsap-02894e11d3d7d7137`, nome `g1-achados-uploads` |
| Role de sincronização | `g1-s3files-sync-role` |
| VPC | `vpc-0de41f84c70ccf93b` |
| Security group dos mount targets | `g1-fotos-sg` (`sg-019dba9bb8b41b0e9`) |

Os buckets e roles anteriores da conta foram preservados. As alterações se
limitam aos novos recursos deste laboratório.

## Configuração do bucket

- **Block Public Access:** quatro opções habilitadas.
- **Object Ownership:** `BucketOwnerEnforced`, com ACLs desativadas.
- **Criptografia:** SSE-S3 (`AES256`).
- **Versionamento:** `Enabled`, pré-requisito do S3 Files.
- **Transporte:** política rejeita acesso sem TLS por clientes que não são
  serviços AWS; o S3 Files também exige TLS para a montagem.
- **EventBridge:** notificações habilitadas para a integração de sincronização.
- **Organização:** tags `Project=achados-perdidos` e `Environment=laboratorio`.

O bucket é privado: as fotos serão entregues pela aplicação protegida por senha,
sem tornar os objetos públicos. O sistema de arquivos usa a criptografia padrão
com chave de propriedade da AWS, sem criar uma chave KMS própria.

## Pontos de montagem e permissões de arquivo

Um mount target fornece a conexão de rede em cada zona onde as tasks poderão
executar. Os dois foram criados diretamente com o grupo de segurança correto:

| Zona / sub-rede | Mount target | IP privado |
| --- | --- | --- |
| `us-east-1a` / `subnet-0eab04bf2964fdeb7` | `fsmt-0d7e6123c5bd2fca3` | `172.31.83.176` |
| `us-east-1b` / `subnet-05d4324f091ba6877` | `fsmt-0225d5e0f36a518f1` | `172.31.26.73` |

As interfaces aceitam TCP **2049 somente de `g1-web-sg`**
(`sg-0032fd6de918bc221`). Elas não possuem IP público.

O access point impõe **UID/GID `1000:1000`** e a raiz **`/uploads`**, com
proprietário `1000:1000` e permissões **`750`** para a criação do diretório.
A aplicação continua executando com seu usuário sem privilégios. O access point
mapeia a identidade das operações; não depende de o UID da imagem ser 1000.
O diretório será criado, se necessário, na primeira montagem: criar o access
point pela API não comprova que já houve gravação de fotos.

## Duas roles com responsabilidades distintas

A role **`g1-s3files-sync-role`**, criada nesta etapa, é assumida pelo serviço
`elasticfilesystem.amazonaws.com`, conforme os pré-requisitos oficiais do S3
Files. A trust policy restringe conta e ARN ao sistema de arquivos criado.
A política inline `g1-s3files-sync` permite acesso somente ao bucket do projeto
e às regras EventBridge necessárias, na mesma região/conta. Não foram concedidas
permissões KMS, pois não usamos chave própria. O IAM Access Analyzer validou
essa política sem findings.

A role **`g1-ecs-task-role`** será criada na etapa 7. A política do sistema de
arquivos já rejeita clientes com outra identidade ou usando outro access point.
Isso também rejeita montagens anônimas. Essa política é uma restrição; a role
do ECS ainda precisa receber `s3files:ClientMount`, `s3files:ClientWrite` e leitura
dos objetos `uploads/*`, como orienta o roteiro. A validação dessa política
de recurso também retornou zero findings. A conexão real ainda não foi testada.

## Valores para a etapa 8

No [modelo da task](../infra/aws/task-definition.example.json), substituir:

```text
SUBSTITUA_ARN_S3_FILES
arn:aws:s3files:us-east-1:429100831877:file-system/fs-03cc16c6148b70bad

SUBSTITUA_ARN_ACCESS_POINT
arn:aws:s3files:us-east-1:429100831877:file-system/fs-03cc16c6148b70bad/access-point/fsap-02894e11d3d7d7137
```

Manter `rootDirectory: "/"` na task: essa é a raiz exposta pelo access point,
que já restringe o acesso ao `/uploads` do sistema de arquivos. O mount point
do contêiner continua `/app/uploads`, com `readOnly: false` e porta TLS 2049.

## Custo para o laboratório de hoje

Preços consultados na API AWS Price List, em 26/10/2026, para `us-east-1`:

| Componente | Preço em dólares |
| --- | --- |
| S3 Standard, primeira faixa | US$ 0,023/GB-mês |
| Camada de armazenamento ativo do S3 Files | US$ 0,30/GB-mês |
| Leitura medida no S3 Files | US$ 0,03/GB |
| Gravação medida no S3 Files | US$ 0,06/GB |

Também são cobradas requisições S3, operações de metadados e sincronização,
versões dos objetos e eventuais transferências. O total depende do volume e das
operações, inclusive em segundo plano. Para a demonstração com poucas imagens
por algumas horas, não foi reservado um disco de tamanho fixo nem habilitada
uma classe de armazenamento com permanência mínima de 30/90 dias.
Os preços e as dimensões estão na [página do S3](https://aws.amazon.com/s3/pricing/)
e na [explicação de medição](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-metering.html).

Após a apresentação, conferir a exportação das fotos antes de excluir o sistema
de arquivos. Preservar o que for necessário, remover access point e mount targets,
excluir o sistema de arquivos e esvaziar o bucket incluindo **versões e delete
markers** antes de removê-lo. A role de sincronização deve ficar até a remoção
do sistema de arquivos terminar. Não aplicar essa limpeza aos outros buckets.
O [passo 13](GUIA_AWS.md#13-encerrar-o-laboratório-e-controlar-custos) trata dos demais recursos.

Para uso contínuo, recomenda-se acompanhar métricas no CloudWatch e habilitar
logs de acesso e eventos de dados do CloudTrail com destinos criptografados,
avaliando a cobrança adicional. Esses opcionais não foram habilitados neste
laboratório de um dia.

## Acompanhamento e limite da etapa

No console, selecionar `us-east-1`, abrir **S3 → General purpose buckets →
g1-achados-fotos-429100831877-20261026 → File systems** e conferir o sistema de
arquivos, os dois mount targets e o access point. A aba **Properties** do bucket
mostra versionamento/criptografia, e **Permissions** mostra o bloqueio público.

A [evidência 03](evidencias/aws/03-fotos-s3files.json) registra criação,
leituras posteriores, validação das políticas e preços consultados. As
**26 verificações de configuração** passaram, incluindo disponibilidade,
isolamento de rede, criptografia, versionamento, POSIX e políticas esperadas.
A montagem, gravação, leitura de foto e sincronização fim a fim serão testadas
quando o ECS estiver executando. A etapa 5 está concluída; a próxima etapa
do roteiro é a **6: imagens no ECR**.
Essa continuação foi executada e está no [registro da etapa 6](AWS-ETAPA-06.md).

Fontes: [pré-requisitos e IAM](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-prereq-policies.html),
[recursos e mount targets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-resources.html),
[criptografia](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-encryption.html)
e [controle de acesso](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-access-point-policy-examples.html).
