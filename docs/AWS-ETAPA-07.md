# AWS: etapa 7 — roles do ECS

Executada em **26/10/2026**, pelo MCP oficial da AWS, para a conta e região
`us-east-1` usadas nas etapas anteriores. As duas roles e suas políticas foram
criadas, lidas novamente e validadas. A aplicação ainda não executa no ECS.

## Usuário IAM e roles têm funções diferentes

O aluno informou que já criou um usuário IAM. Ele representa quem administra
os recursos. As roles abaixo representam as permissões temporárias do ECS e
da aplicação; não substituem esse usuário e não usam sua senha ou access keys.

A consulta `GetCallerIdentity` desta etapa ainda retornou a identidade **root**
na conexão do MCP. Criar um usuário IAM no console não muda automaticamente
as credenciais dessa conexão. O novo usuário não foi inspecionado nem alterado
nesta etapa. Para passar a usá-lo no MCP, é necessário atualizar a autenticação
da conexão; não publicar as credenciais no chat ou no repositório.

## Roles criadas

| Role | Usada por | Política inline |
| --- | --- | --- |
| `g1-ecs-execution-role` | Agente ECS/Fargate ao iniciar os contêineres. | `g1-ecs-execution-access` |
| `g1-ecs-task-role` | Aplicação/cliente de montagem durante a execução da task. | `g1-ecs-photo-access` |

As duas receberam `Project=achados-perdidos` e `Environment=laboratorio`.
Cada uma tem somente a política inline indicada e nenhuma política gerenciada
anexada. Os arquivos completos, sem senhas, estão em:

- [Trust policy comum](../infra/aws/iam/ecs-trust-policy.json).
- [Permissões da execution role](../infra/aws/iam/ecs-execution-policy.json).
- [Permissões da task role](../infra/aws/iam/ecs-task-policy.json).

As trust policies permitem `sts:AssumeRole` somente ao serviço
`ecs-tasks.amazonaws.com`, com `aws:SourceAccount` da conta e
`aws:SourceArn` limitado a ECS nessa região/conta. A AWS documenta que restringir
essa condição a um cluster específico não é suportado; por isso o sufixo do ARN
é `*`. Isso não permite que qualquer usuário assuma as roles.

## O que cada declaração permite

| Política / declaração | Finalidade e limite |
| --- | --- |
| Execution / `GetECRAuthorization` | Obter token ECR; essa ação exige `Resource: "*"`, pois não aceita escopo por repositório. |
| Execution / `PullProjectImages` | Baixar somente de `achados-web` e `achados-frontend`; sem envio/exclusão de imagens. |
| Execution / `WriteProjectContainerLogs` | Criar streams e escrever eventos somente em `/ecs/achados-web`. O grupo será criado na etapa 8. |
| Execution / `ReadProjectSecrets` | Ler somente os dois ARNs completos de `g1/achados/db` e `g1/achados/acesso`. |
| Task / `MountWritePhotosThroughAccessPoint` | `ClientMount` e `ClientWrite` no S3 Files do projeto, somente pelo access point de `/uploads`. |
| Task / `ReadPhotoObjects` | Ler objetos e versões somente em `uploads/*` do bucket exclusivo das fotos. |
| Task / `ListPhotoBucket` | Listar esse bucket, conforme exigido pelo cliente S3 Files. |

A role da aplicação não recebe `GetSecretValue` nem escrita direta por
`s3:PutObject`. O ECS injeta os valores secretos na inicialização; a escrita
das fotos passa pelo sistema de arquivos e pela role de sincronização da
etapa 5. A leitura direta S3 é governada por IAM/política do bucket, não pelas
permissões POSIX. As duas camadas foram consideradas.

O roteiro inicial indicava `AmazonECSTaskExecutionRolePolicy`. Nesta execução,
foi usada uma política inline com as permissões necessárias, restringindo
repositórios e logs aos recursos do projeto. O documento gerenciado da AWS foi
consultado para conferir a base de permissões. Os segredos usam a chave padrão
do Secrets Manager; não foi concedido `kms:Decrypt` em chaves próprias.

Nenhuma role recebeu permissões administrativas ou `iam:PassRole`.
Quem executar o deploy no console/CLI precisará ter suas próprias permissões
de ECS e `iam:PassRole` para estas duas roles; isso não foi concedido ao novo
usuário, cujo nome e permissões não foram informados.

## Valores para a etapa 8

No [modelo da task](../infra/aws/task-definition.example.json), preencher:

```text
executionRoleArn:
arn:aws:iam::429100831877:role/g1-ecs-execution-role

taskRoleArn:
arn:aws:iam::429100831877:role/g1-ecs-task-role
```

A task role mantém o nome exato já autorizado pela política do S3 Files na
etapa 5. Não é necessário alterar aquela política. A role de sincronização
`g1-s3files-sync-role` continua com sua finalidade original.

## Verificações e limite do resultado

O IAM Access Analyzer validou as duas políticas de identidade sem findings.
As leituras posteriores confirmaram os documentos, os nomes das políticas,
a ausência de políticas gerenciadas extras e a compatibilidade com a política
de recurso do S3 Files.

Foram executados **15 cenários** com `SimulatePrincipalPolicy` sobre as roles
criadas. **14 corresponderam ao esperado**, incluindo acessos permitidos e
negativas para outro repositório, outro segredo, outro prefixo, escrita direta
S3 e montagem com access point incorreto ou ausente. Nomes de objetos/recursos
de simulação são fictícios; esses recursos não foram criados ou acessados.

O cenário de logs retornou `implicitDeny`, inclusive em simulações de controle
com ARN exato, escopo do grupo e `Resource: "*"`. A referência oficial confirma
as ações `logs:CreateLogStream`/`logs:PutLogEvents` e o tipo ARN `log-stream`
usados. Como a negativa também ocorreu no controle, o resultado permanece
**inconclusivo**; não foi ampliada a política anexada. O controle com `*`
existiu somente no simulador. A gravação real de logs será conferida na primeira
execução do ECS, depois da criação do grupo na etapa 8.

Essas simulações verificam as políticas de identidade. Não são uma conexão
real ao RDS, uma leitura de senhas, um download de imagens ou uma montagem NFS,
nem avaliam sozinhas todas as políticas de recurso. Os testes integrados ficam
para a execução da task. Não foi assumida uma role de ECS por uma identidade
humana para obter suas credenciais.

As respostas reais estão na [evidência 05](evidencias/aws/05-roles-ecs.json).
Os testes negativos esperados aparecem como `implicitDeny`, sem indicar falha
de criação da role.

## Conferir no console e continuar

Em **IAM → Roles**, procurar os dois nomes e conferir **Trust relationships**
e **Permissions**. IAM é global; os ARNs de recursos nas políticas estão
limitados à região do projeto quando aplicável.

A próxima etapa é a **8: criar o grupo de logs e cluster ECS, preencher e
registrar a task definition**. O site será publicado e testado nas etapas
seguintes. Ao encerrar o laboratório, remover estas roles depois de parar e
excluir as tasks/services que as utilizam.
A criação do grupo, cluster e definição foi executada e está no
[registro da etapa 8](AWS-ETAPA-08.md). A escrita de logs continua aguardando a
primeira execução, agora prevista para a inicialização do banco na etapa 9.

Fontes: [task role e trust policy](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html),
[execution role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html),
[S3 Files](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-prereq-policies.html),
[ações de logs e tipos ARN](https://docs.aws.amazon.com/service-authorization/latest/reference/list_logs.html)
e [ações ECR](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecr.html).
