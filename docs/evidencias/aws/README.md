# Evidências reais da preparação AWS

Estes registros são separados das simulações locais dos arquivos 31 e 37.

| Arquivo | Legenda |
| --- | --- |
| [01-rede.json](01-rede.json) | 26/10/2026: criação real de quatro security groups na VPC padrão de `us-east-1`, seguida de leitura e comparação das seis regras, saída padrão e seleção de duas sub-redes em zonas diferentes. Inclui as chamadas de API registradas pelo MCP. |

A configuração e os IDs estão descritos em [AWS-ETAPA-03.md](../../AWS-ETAPA-03.md).
As consultas comprovam o estado da rede. Ainda não houve teste de conexão de
uma aplicação implantada na AWS. O registro não contém senhas ou tokens.
