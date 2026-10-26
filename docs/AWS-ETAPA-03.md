# AWS: etapa 3 executada — rede e grupos de segurança

Executada em **26/10/2026**, pelo MCP oficial da AWS, na região **`us-east-1`**,
conta com final **1877**. A inspeção inicial autenticou como `root`; a troca para
uma identidade de trabalho com credenciais temporárias continua recomendada.
Esta etapa configurou rede e permissões de tráfego; ao concluí-la, ainda não
havia implantação em ECS, RDS ou S3 Files. O RDS foi criado posteriormente na
[etapa 4](AWS-ETAPA-04.md).

## VPC e sub-redes selecionadas

Foi reutilizada a VPC padrão **`vpc-0de41f84c70ccf93b`**, CIDR `172.31.0.0/16`.
As consultas confirmaram DNS habilitado, internet gateway conectado e uma rota
ativa `0.0.0.0/0` para ele. Não foi necessário criar ou alterar esses recursos.

| Uso futuro | Zona | Sub-rede | CIDR |
| --- | --- | --- | --- |
| Subnet A | `us-east-1a` | `subnet-0eab04bf2964fdeb7` | `172.31.80.0/20` |
| Subnet B | `us-east-1b` | `subnet-05d4324f091ba6877` | `172.31.16.0/20` |

São duas sub-redes existentes em zonas diferentes, ambas disponíveis. A seleção
é um registro para as próximas etapas, não uma reserva de capacidade. O ALB
usará duas zonas; o grupo de sub-redes do RDS também será criado com essas duas.
O RDS deverá continuar com **Public access: No**.

## Grupos criados

| Nome | ID | Função |
| --- | --- | --- |
| `g1-alb-sg` | `sg-0c1b056d9a92c1389` | Entrada pública do futuro balanceador. |
| `g1-web-sg` | `sg-0032fd6de918bc221` | Aplicação e prontidão, acessíveis pelo balanceador. |
| `g1-db-sg` | `sg-077c23028b341c028` | PostgreSQL, acessível pela aplicação. |
| `g1-fotos-sg` | `sg-019dba9bb8b41b0e9` | Armazenamento de fotos, acessível pela aplicação. |

Os quatro receberam as tags `Project=achados-perdidos`, `Environment=laboratorio`
e `Name` igual ao nome do grupo. O security group `default` foi preservado.

## Regras de entrada verificadas após a criação

| Grupo de destino | TCP | Origem permitida |
| --- | --- | --- |
| `g1-alb-sg` | 443 | Internet IPv4 (`0.0.0.0/0`). |
| `g1-alb-sg` | 80 | Internet IPv4; o redirecionamento para HTTPS será configurado no listener do ALB. |
| `g1-web-sg` | 80 | Somente `g1-alb-sg`. |
| `g1-web-sg` | 8082 | Somente `g1-alb-sg`, para `/healthz`. |
| `g1-db-sg` | 5432 | Somente `g1-web-sg`. |
| `g1-fotos-sg` | 2049 | Somente `g1-web-sg`. |

As regras foram consultadas novamente por `DescribeSecurityGroups` e comparadas
com esse conjunto exato. A saída padrão IPv4 liberada foi mantida nos quatro
grupos, conforme o laboratório. Não há entrada pública nas portas 5000, 5432,
8082 ou 2049 dos grupos da aplicação, banco e fotos.

Um grupo funciona como uma lista de origens e portas permitidas. As referências
a outros grupos permitem que as regras continuem válidas quando o IP de uma
task mudar. Elas só terão efeito no tráfego dos serviços quando esses grupos
forem associados às respectivas interfaces de rede.

## Como conferir no console

1. Selecione a região **Norte da Virgínia (`us-east-1`)**.
2. Abra **VPC → Security groups**.
3. Procure os quatro nomes acima ou filtre pela tag `Project=achados-perdidos`.
4. Em cada grupo, confira **Inbound rules** e **Outbound rules**.
5. Em **Subnets**, confira os IDs e as zonas da tabela de sub-redes.

As chamadas executadas e a resposta de verificação estão em
[evidencias/aws/01-rede.json](evidencias/aws/01-rede.json). Esse registro comprova
configuração, não um teste de conexão entre componentes ainda inexistentes.

## Estado para continuar

Os resultados da etapa 3 estão preservados acima. A continuação está no
[registro da etapa 4](AWS-ETAPA-04.md), que documenta o banco e os segredos.

- [x] VPC padrão e DNS conferidos.
- [x] Duas sub-redes disponíveis, em zonas diferentes, identificadas.
- [x] Quatro grupos do projeto criados com seis regras de entrada.
- [x] Leitura posterior confirma as regras e a saída padrão.
- [x] Grupo `default` preservado.
- [x] Etapa 4 executada posteriormente: dois segredos criados e RDS disponível.
- [ ] Etapas seguintes: armazenamento, imagens, IAM, ECS e ALB/HTTPS.

A senha compartilhada será aplicada pelo Nginx na etapa de publicação, conforme
[ACESSO.md](ACESSO.md). Criar grupos não publica o site nem configura um listener
HTTPS. As etapas seguintes devem usar estes IDs, sem recriar os mesmos grupos.

Fontes: [regras de security groups](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)
e [rede do Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html).
