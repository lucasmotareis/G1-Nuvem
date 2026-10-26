# Evidências reais da preparação AWS

Estes registros são separados das simulações locais dos arquivos 31 e 37.

| Arquivo | Legenda |
| --- | --- |
| [01-rede.json](01-rede.json) | 26/10/2026: criação real de quatro security groups na VPC padrão de `us-east-1`, seguida de leitura e comparação das seis regras, saída padrão e seleção de duas sub-redes em zonas diferentes. Inclui as chamadas de API registradas pelo MCP. |
| [02-banco-segredos.json](02-banco-segredos.json) | 26/10/2026: criação de RDS PostgreSQL privado e dois segredos; estado final `available` e quinze critérios de configuração conferidos, além de formato dos segredos e preços pela API. Inclui somente metadados e resultados sem valores de senha. |
| [03-fotos-s3files.json](03-fotos-s3files.json) | 26/10/2026: bucket S3 privado, S3 Files, role de sincronização, access point para `/uploads` e dois mount targets; sistema, access point e mount targets disponíveis, com 26 verificações de configuração aprovadas e preços consultados. A montagem e o upload pela aplicação ainda não foram testados. |
| [04-imagens-ecr.json](04-imagens-ecr.json) | 26/10/2026: builds e envios reais de `web:aws-v1` e `frontend:aws-v2`, correção de Brotli/curl no frontend, digests confirmados, API sem root, testes de autenticação, 21 verificações aprovadas e varreduras. Frontend v2 sem achados; três HIGH do backend permanecem pendentes. |
| [05-roles-ecs.json](05-roles-ecs.json) | 26/10/2026: criação/leitura das duas roles ECS, validação de políticas e 15 cenários de simulação, dos quais 14 corresponderam ao esperado. Logs tiveram resultado inconclusivo inclusive no controle e dependem do teste em execução. A conexão MCP ainda autenticou como root; nenhum usuário IAM foi alterado. |
| [06-cluster-task-definition.json](06-cluster-task-definition.json) | 26/10/2026: grupo de logs com retenção de 7 dias, cluster Fargate ativo e `achados-web:1` registrada; 33 verificações de configuração aprovadas, zero tasks/services. Inclui a falha inicial de CreateCluster e a tentativa seguinte bem-sucedida após consultar a role automática do ECS. Logs ainda dependem do teste em execução. |
| [07-inicializacao-rds.json](07-inicializacao-rds.json) | 26/10/2026: tarefa avulsa `achados-init:1` concluiu com exit code 0, aplicou o SQL original, criou três registros e confirmou TLS. Logs reais resolvem a dúvida da simulação da execution role. |
| [08-ecs-cloudfront.json](08-ecs-cloudfront.json) | 26/10/2026: service `achados-web:2`, frontend v3 sem achados no scan, ALB interno em duas novas sub-redes privadas, CloudFront Deployed, entrega de logs e onze verificações finais aprovadas. Inclui a solicitação de substituição e leitura final da nova task saudável, com a anterior parada. |
| [09-rotas-api.json](09-rotas-api.json) | 26/10/2026: quinze verificações reais por curl.exe/HTTPS; três itens e zero fotos antes, quatro itens e uma foto depois. Inclui saúde, filtro, validação de campos, autenticação, cadastro e recuperação da foto. |
| [frontend/30-frontend-testes.json](frontend/30-frontend-testes.json) | 26/10/2026: interface real na AWS por Chromium, com cadastro com/sem foto, busca, ampliação, layout móvel e ausência de erros JavaScript. Quatro cenários adicionais usam respostas simuladas e estão identificados, sem representar falhas reais da AWS. |
| [frontend/30-frontend-desktop.png](frontend/30-frontend-desktop.png) e [frontend/30-frontend-mobile.png](frontend/30-frontend-mobile.png) | Capturas reais da interface AWS autenticada, com seis itens e duas fotos. |
| [acesso/35-autenticacao-testes.json](acesso/35-autenticacao-testes.json) e [acesso/35-acesso-autenticado.png](acesso/35-acesso-autenticado.png) | Acesso sem senha e com senha incorreta negado; senha válida libera interface/API/fotos. Arquivos de segredo não são servidos; senha ausente do HTML/JS. |
| [10-persistencia-antes.json](10-persistencia-antes.json) e [11-persistencia-depois.json](11-persistencia-depois.json) | Consultas reais antes/depois da substituição da task: registros, contagens, nomes e SHA-256 das fotos. |
| [12-sincronizacao-s3.json](12-sincronizacao-s3.json) | Duas fotos exportadas por S3 Files, ETags iguais ao MD5 original e objeto real de log CloudFront no bucket de logs. Ausência de amostras nas métricas de falhas não é tratada como zero. |
| [13-https-cabecalhos.json](13-https-cabecalhos.json) | HTTPS retorna 401 sem senha, com CSP/HSTS/nosniff/frame denial/no-store; HTTP sem credencial redireciona para HTTPS. |
| [14-persistencia-comparacao.json](14-persistencia-comparacao.json) | Comparação aprovada: host mudou, IDs 1 a 6 e hashes das duas fotos foram preservados. |

A configuração e os IDs estão descritos em [AWS-ETAPA-03.md](../../AWS-ETAPA-03.md)
e [AWS-ETAPA-04.md](../../AWS-ETAPA-04.md); o armazenamento está em
[AWS-ETAPA-05.md](../../AWS-ETAPA-05.md).
As imagens e os resultados de segurança estão em
[AWS-ETAPA-06.md](../../AWS-ETAPA-06.md).
As permissões estão descritas em [AWS-ETAPA-07.md](../../AWS-ETAPA-07.md).
O registro da definição está em [AWS-ETAPA-08.md](../../AWS-ETAPA-08.md).
Os registros 01 a 06 refletem a preparação no momento de cada etapa. O registro
07 confirma a conexão SQL e os logs em execução. Os resultados finais ficam no
[roteiro de apresentação](../../AWS-APRESENTACAO.md). O registro não contém senhas ou tokens.
