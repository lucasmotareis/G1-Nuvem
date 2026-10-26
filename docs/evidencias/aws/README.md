# Evidências reais da preparação AWS

Estes registros são separados das simulações locais dos arquivos 31 e 37.

| Arquivo | Legenda |
| --- | --- |
| [01-rede.json](01-rede.json) | 26/10/2026: criação real de quatro security groups na VPC padrão de `us-east-1`, seguida de leitura e comparação das seis regras, saída padrão e seleção de duas sub-redes em zonas diferentes. Inclui as chamadas de API registradas pelo MCP. |
| [02-banco-segredos.json](02-banco-segredos.json) | 26/10/2026: criação de RDS PostgreSQL privado e dois segredos; estado final `available` e quinze critérios de configuração conferidos, além de formato dos segredos e preços pela API. Inclui somente metadados e resultados sem valores de senha. |
| [03-fotos-s3files.json](03-fotos-s3files.json) | 26/10/2026: bucket S3 privado, S3 Files, role de sincronização, access point para `/uploads` e dois mount targets; sistema, access point e mount targets disponíveis, com 26 verificações de configuração aprovadas e preços consultados. A montagem e o upload pela aplicação ainda não foram testados. |
| [04-imagens-ecr.json](04-imagens-ecr.json) | 26/10/2026: builds e envios reais de `web:aws-v1` e `frontend:aws-v2`, correção de Brotli/curl no frontend, digests confirmados, API sem root, testes de autenticação, 21 verificações aprovadas e varreduras. Frontend v2 sem achados; três HIGH do backend permanecem pendentes. |
| [05-roles-ecs.json](05-roles-ecs.json) | 26/10/2026: criação/leitura das duas roles ECS, validação de políticas e 15 cenários de simulação, dos quais 14 corresponderam ao esperado. Logs tiveram resultado inconclusivo inclusive no controle e dependem do teste em execução. A conexão MCP ainda autenticou como root; nenhum usuário IAM foi alterado. |

A configuração e os IDs estão descritos em [AWS-ETAPA-03.md](../../AWS-ETAPA-03.md)
e [AWS-ETAPA-04.md](../../AWS-ETAPA-04.md); o armazenamento está em
[AWS-ETAPA-05.md](../../AWS-ETAPA-05.md).
As imagens e os resultados de segurança estão em
[AWS-ETAPA-06.md](../../AWS-ETAPA-06.md).
As permissões estão descritas em [AWS-ETAPA-07.md](../../AWS-ETAPA-07.md).
As consultas comprovam o estado dos recursos. Ainda não houve teste de conexão de
uma aplicação implantada na AWS. O registro não contém senhas ou tokens.
