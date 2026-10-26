# Reflexão e equivalência em nuvem

Respostas referentes ao protótipo local testado em 19/10/2026. As mudanças de
segurança, escala e migração propostas abaixo não foram implementadas no código
fornecido. Fontes oficiais consultadas nessa mesma data.

## Q1 — DNS

No [Compose](../docker-compose.yml), `web` e `db` compartilham a bridge `rede_interna`.
O DNS interno do Docker resolve o nome do serviço `db` para o IP atual do contêiner,
evitando fixar um endereço que pode mudar na recriação; a [inspeção](evidencias/15-inspecao-infraestrutura.txt) confirma os dois serviços na rede.
Na bridge padrão de `docker run`, a resolução automática por nome não é oferecida como nas redes definidas pelo usuário.
Seria necessário usar uma rede própria ou outro mecanismo de resolução, conforme a [documentação do Docker](https://docs.docker.com/engine/network/drivers/bridge/).

## Q2 — Montagens

Um volume nomeado tem armazenamento administrado pelo Docker; um bind mount aponta para um caminho específico do host.
O [Compose](../docker-compose.yml) usa bind mount somente leitura para o `init.sql`, pois ele é um arquivo fornecido e versionado no repositório.
Os dados do PostgreSQL ficam no volume `dados_banco`, independente do ciclo de vida do contêiner.
O mesmo princípio mantém as fotos no volume `fotos`, sem gravá-las na camada descartável da aplicação.
Os tipos e caminhos reais das montagens foram registrados na [evidência 12](evidencias/12-inspecao-volumes.txt).

## Q3 — Inicialização

Alterar `init.sql` e executar `up -d` não aplica a alteração a um banco já inicializado.
A [imagem oficial PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/README.md) executa os scripts de inicialização somente com o diretório de dados vazio.
Para evoluir o esquema sem perder dados, deve-se aplicar uma migração SQL controlada no banco existente, com cópia de segurança e validação.
Editar o script serve também para futuras instalações vazias, mas não substitui essa migração.
Na [evidência 14](evidencias/14-remocao-volumes.txt), os exemplos só foram recriados depois da remoção dos volumes.

## Q4 — Prontidão

`depends_on` simples ordena a inicialização dos contêineres, mas um processo iniciado pode ainda não aceitar conexões.
O PostgreSQL precisa terminar sua preparação antes que a aplicação consulte o banco.
Nosso [Compose](../docker-compose.yml) combina `pg_isready` com `condition: service_healthy`, seguindo a [documentação do Compose](https://docs.docker.com/compose/how-tos/startup-order/).
A [evidência 03](evidencias/03-subida.txt) mostra `db Healthy` antes de `web Starting` na primeira subida.
A mesma ordem foi observada nas recriações; no bônus, o Nginx também aguarda `web` saudável, conforme a [evidência 18](evidencias/18-proxy-e-rotas.txt).

## Q5 — Cache

No [Dockerfile](../app/Dockerfile), a lista de dependências é copiada e instalada antes de `app.py`.
Se apenas o código mudar, o build pode reutilizar a camada de instalação do pip, refazendo a cópia do código e as etapas posteriores.
Se `requirements.txt` mudar, a instalação e as camadas seguintes precisam ser reconstruídas.
Esse comportamento segue as [regras de invalidação do cache](https://docs.docker.com/build/cache/invalidation/), e a [evidência 10](evidencias/10-subida-copia-limpa.txt) mostra camadas reutilizadas.
O uso de `--no-cache-dir` elimina o cache de downloads do pip na imagem; o cache de camadas do Docker é outro mecanismo.

## Q6 — Proteção

O banco não publica `5432`, reduzindo a exposição de um serviço que precisa ser acessado pela aplicação; a [evidência 18](evidencias/18-proxy-e-rotas.txt) confirma isso na versão com proxy.
Fotos de RG ou carteira estudantil podem identificar pessoas e conter dados pessoais, conforme o art. 5º, I, da [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
O art. 46 exige medidas de proteção; restringir a porta do banco é apenas uma parte dessa proteção.
Proponho (1) autenticação e autorização para limitar quem pode cadastrar itens e consultar fotos;
e (2) HTTPS para proteger as requisições e o transporte das imagens.
Na etapa de 19/10, eram medidas futuras e as rotas não tinham controle de acesso.
Em 26/10, esta branch acrescentou [senha compartilhada no Nginx](ACESSO.md); contas individuais e HTTPS na AWS continuam pendentes de implantação.

## Q7 — Réplicas

Na arquitetura básica, `docker compose up -d --scale web=3` falhou porque as réplicas disputaram a porta 8080, conforme a [evidência 16](evidencias/16-teste-replicas.txt).
Com o bônus, apenas o Nginx publica essa porta; o mesmo comando criou três réplicas saudáveis e o proxy alcançou os três hostnames, na [evidência 21](evidencias/21-replicas-com-proxy-validado.txt).
As três instâncias enxergaram os mesmos arquivos e hashes no volume `fotos`; os nomes UUID e permissões compatíveis permitem arquivos distintos no mesmo host.
Isso não garante atomicidade entre arquivo e SQL nem ausência de falhas em gravações concorrentes, que não foram demonstradas nesse ensaio.
Entre hosts, o volume `local` não é compartilhado automaticamente; seria necessário armazenamento de rede ou de objetos.
A redução apresentou falhas transitórias de DNS/upstream nas primeiras tentativas, preservadas nas evidências; o [procedimento validado](BONUS.md) reinicia o Nginx após reduzir a escala.
Ao final, o ambiente voltou a uma réplica, com seis itens e duas fotos; não foi demonstrada redução de escala sem interrupção.

## 5.1 — Do ambiente local para a nuvem

Esta tabela apresenta **propostas de equivalência funcional**, com os serviços
conferidos nas fontes oficiais vinculadas em cada célula. Em 26/10/2026, a
[etapa 3 da AWS](AWS-ETAPA-03.md) preparou a rede e os grupos de segurança reais;
a [etapa 4](AWS-ETAPA-04.md) criou os segredos e o RDS, confirmado como disponível.
A [etapa 5](AWS-ETAPA-05.md) criou o bucket e o sistema S3 Files para as fotos;
a montagem no ECS e os testes de integração da aplicação permanecem pendentes.
Na [etapa 6](AWS-ETAPA-06.md), as duas imagens foram publicadas no ECR, com
correção de segurança no frontend e os alertas remanescentes documentados.

| Peça do ambiente local | Microsoft Azure | AWS | Google Cloud |
| --- | --- | --- | --- |
| Contêiner `web` | [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview) | [Amazon ECS com AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) | [Cloud Run — serviço](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) |
| Contêiner `db` + volume `dados_banco` | [Azure Database for PostgreSQL — Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/overview) | [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html) | [Cloud SQL for PostgreSQL](https://docs.cloud.google.com/sql/docs/postgres/introduction) |
| Volume `fotos` | [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) | [Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) | [Cloud Storage](https://docs.cloud.google.com/storage/docs/introduction) |
| `rede_interna` | [Azure Virtual Network — VNet](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview) | [Amazon VPC](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html) | [Virtual Private Cloud — VPC](https://docs.cloud.google.com/vpc/docs/vpc) |
| Arquivo `.env` (segredos) | [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/overview) | [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html) | [Secret Manager](https://docs.cloud.google.com/secret-manager/docs/overview) |
| Imagem construída localmente | [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-intro) | [Amazon Elastic Container Registry — ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html) | [Artifact Registry](https://docs.cloud.google.com/artifact-registry/docs/overview) |

Na migração proposta, a peça que mais muda é o volume `fotos`. Atualmente, a
aplicação grava e consulta arquivos em `/app/uploads`, usando `foto.save`,
`send_from_directory` e `os.listdir`. Com Blob Storage, S3 ou Cloud Storage, as
imagens seriam objetos remotos: seria necessário adaptar o upload, a recuperação,
a contagem e as permissões de acesso para usar as APIs desses serviços. Isso
permitiria que réplicas em máquinas diferentes acessassem o mesmo acervo, sem
depender de um volume local de um único host. Portanto, mudar apenas `UPLOAD_DIR`
não seria suficiente. Trata-se de uma proposta futura; o código fornecido
permanece preservado no protótipo atual.

O banco gerenciado assume o armazenamento persistente e tarefas operacionais;
o acesso passa a usar o endpoint do serviço e sua configuração de conexão.
A VNet/VPC é uma equivalência de isolamento e conectividade, não uma bridge Docker
literal: sub-redes, regras de acesso e a integração da plataforma de contêineres
precisam ser configuradas. Os gerenciadores de segredos substituem o arquivo
local como fonte de segredos, com acesso por identidade e permissões definidas.
Os registries armazenam e distribuem a imagem construída; eles não executam o
build automaticamente apenas por serem escolhidos na tabela.

### Roteiro prático AWS

O [guia de implantação AWS](GUIA_AWS.md), preparado em 26/10/2026, desenvolve essa
proposta por etapas. A análise de fotos acima considera o uso direto das APIs de
objetos. O guia apresenta também a alternativa **S3 Files integrado ao ECS**, que
fornece uma montagem de arquivos para preservar o código do protótipo, conforme
a [documentação da AWS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/s3files-volumes.html).
As etapas de rede, banco/segredos e criação do armazenamento foram executadas
na conta AWS, assim como o envio das imagens ao ECR na etapa 6.
A montagem e a sincronização de fotos ainda precisam ser testadas;
o modelo de task definition ainda não foi registrado nem executado no ECS.
