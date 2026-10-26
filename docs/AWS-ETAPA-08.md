# AWS: etapa 8 — cluster, logs e definição da tarefa

Executada em **26/10/2026**, pelo MCP oficial da AWS, em
**Norte da Virgínia (`us-east-1`)**. O cluster e a definição ficaram **ACTIVE**.
A leitura posterior confirmou que não há tarefas iniciadas ou services criados.
A identidade administrativa do MCP continua sendo `root`, conforme o registro
de API; os contêineres usarão as roles específicas configuradas na etapa 7.

## Recursos preparados

| Recurso | Resultado |
| --- | --- |
| Cluster ECS | `g1-achados`, ativo. |
| Capacidade | Somente `FARGATE`, como estratégia padrão. |
| Container Insights | Desativado neste laboratório. |
| CloudWatch Log Group | `/ecs/achados-web`, classe Standard. |
| Retenção dos logs | **7 dias**. |
| Definição registrada | **`achados-web:1`**, ativa. |
| Execução | Nenhuma task ou service iniciado nesta etapa. |

ARNs para continuar:

```text
Cluster:
arn:aws:ecs:us-east-1:429100831877:cluster/g1-achados

Task definition:
arn:aws:ecs:us-east-1:429100831877:task-definition/achados-web:1
```

A task definition é uma receita, não uma execução. Registrar CPU/memória e
imagens não inicia os contêineres. As sub-redes, o grupo web e o IP público
serão selecionados ao executar a tarefa na etapa 9.

## Arquivo pronto para reprodução

O [JSON preenchido](../infra/aws/task-definition.us-east-1.json) é o documento
enviado a `RegisterTaskDefinition`, com os ARNs/endpoints reais desta conta,
sem valores de senha. O [modelo com marcadores](../infra/aws/task-definition.example.json)
foi preservado para outras contas/regiões. O arquivo preenchido não é uma
exportação da resposta: ele mantém somente os parâmetros de entrada aceitos
pelo registro, permitindo registrar uma nova revisão quando necessário.

| Configuração | Valor registrado |
| --- | --- |
| Execução | Fargate, `awsvpc`, Linux, `X86_64`. |
| Recursos compartilhados | **0,25 vCPU / 512 MiB** para os dois contêineres. |
| API | `achados-web:aws-v1`, porta 5000. |
| Frontend | **`achados-frontend:aws-v2`**, portas 80 e 8082. |
| Execution role | `g1-ecs-execution-role`. |
| Task role | `g1-ecs-task-role`. |
| PostgreSQL | Endpoint privado do RDS, banco `achados`, porta 5432, `PGSSLMODE=require`. |
| Fotos | S3 Files e access point da etapa 5, com escrita em `/app/uploads`. |
| Logs | Driver `awslogs`, mesmo grupo, prefixos `web` e `frontend`. |

Os digests das imagens foram consultados novamente no ECR e correspondem às
tags imutáveis publicadas na etapa 6. A definição usa o frontend corrigido.
Os alertas remanescentes do backend continuam documentados no
[registro das imagens](AWS-ETAPA-06.md).

`DB_USER` e `DB_PASSWORD` são referências às chaves `username`/`password` do
segredo do banco, com os sufixos `:username::` e `:password::` preservados.
O frontend recebe somente `ACCESS_PASSWORD` do segredo de entrada e o usuário
`visitante`. Os valores não foram lidos para preparar ou registrar o JSON.
As variáveis normais contêm apenas configurações sem senha.

O volume usa o sistema `fs-03cc16c6148b70bad` e o access point
`fsap-02894e11d3d7d7137`. A raiz da montagem na task é `/`, pois o access point
já expõe `/uploads` com a identidade POSIX definida na etapa 5. O transporte
usa TLS na porta 2049. Somente `web` recebe essa montagem.

Os comandos de inicialização das imagens foram mantidos. O frontend depende
de `web:HEALTHY`; os dois healthchecks foram preservados. O listener interno
`8082/healthz` verifica o backend sem senha. A entrada pública será configurada
com ALB/HTTPS em etapa posterior, mantendo a restrição de rede dessa porta.

## Primeira criação do cluster e role do serviço

A primeira chamada a `CreateCluster` retornou:

```text
Unable to assume the service linked role. Please verify that the ECS service linked role exists.
```

Os comandos anteriores de criação do grupo de logs e retenção já haviam
terminado com sucesso; eles não foram repetidos. A leitura IAM confirmou a
role **`AWSServiceRoleForECS`**, criada automaticamente pelo serviço naquele
momento. Após essa consulta, uma nova tentativa de `CreateCluster` funcionou.
O registro conserva a falha inicial e a resposta da tentativa bem-sucedida,
sem atribuir sucesso à primeira chamada.

Essa role gerenciada pela AWS permite ao próprio ECS gerenciar recursos de
infraestrutura. Ela é distinta da execution role e da task role da aplicação.
Não foi criada uma role administrativa substituta nem alterado o usuário IAM.

## Verificações e limites

A leitura por `DescribeTaskDefinition` confirmou as imagens, roles, variáveis,
referências de segredos, volume, dependência, healthchecks e configurações de
logs. `DescribeClusters`, `ListTasks` e `ListServices` confirmaram cluster ativo,
zero instâncias EC2 registradas e nenhuma execução/service iniciado. A cota
Fargate On-Demand consultada foi **30 vCPUs**, suficiente para solicitar uma
task de 0,25 vCPU; a consulta não reserva capacidade.

A simulação das permissões de logs foi repetida após criar o grupo e continuou
retornando `implicitDeny`. Como na etapa 7, esse resultado permanece inconclusivo.
Criar o grupo como administrador não testa a escrita pela execution role.
A verificação real será feita na primeira execução da task, na etapa 9.
Também permanecem pendentes a conexão SQL, a carga do `init.sql`, a montagem,
o upload e a sincronização das fotos.

As chamadas, a primeira falha, o registro aceito e a leitura posterior estão na
[evidência 06](evidencias/aws/06-cluster-task-definition.json). As verificações
de configuração passaram; isso não marca os testes de execução como concluídos.
Os arquivos fornecidos da aplicação, requisitos e SQL foram preservados.

## Conferir no console e continuar

1. Selecionar **Norte da Virgínia**.
2. Em **ECS → Clusters → g1-achados**, conferir estado ativo e ausência de tasks.
3. Em **ECS → Task definitions → achados-web → revisão 1**, conferir os dois
   contêineres, as roles e o volume.
4. Em **CloudWatch → Log groups → /ecs/achados-web**, conferir retenção de 7 dias.

A próxima etapa é a **9: executar a tarefa temporária de inicialização do banco**.
Ela usará a definição registrada como base e aplicará o SQL original dentro da
VPC. O site continua aguardando a criação e publicação do service.

Não houve execução Fargate nesta etapa. Os recursos das etapas anteriores,
incluindo o RDS ligado, continuam existindo e sujeitos à cobrança correspondente.
Depois da apresentação, seguir a [limpeza do laboratório](GUIA_AWS.md#13-encerrar-o-laboratório-e-controlar-custos),
incluindo o grupo de logs e o cluster após remover tasks/services.

Fontes: [S3 Files na task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-s3files-config.html),
[execution role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
e [role vinculada ao serviço ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-service-linked-roles.html).
