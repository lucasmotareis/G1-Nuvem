# Conferência final com o enunciado

**Nota de versão (26/10/2026):** esta conferência registra a entrega anterior ao
frontend. A branch `codex/frontend-achados-perdidos` acrescenta uma interface
separada, preservando os arquivos fornecidos; seus testes estão nas
[evidências 29 a 33](evidencias/README.md#estado-da-branch-com-frontend).
O Mermaid e os roteiros local/AWS foram atualizados. O frontend ainda não foi
publicado no repositório remoto nem implantado na AWS.
A proteção por senha foi acrescentada em seguida, também sem alterar a aplicação
fornecida. Os testes 34 a 38 e [ACESSO.md](ACESSO.md) documentam essa etapa.

Revisão de `G1-CN-2N.pdf`, seções 2 a 7 e Apêndice A, em 19/10/2026.
A implementação local atende aos requisitos obrigatórios conferidos abaixo.
A versão foi publicada no GitHub, com repositório público e clone real conferido
na [verificação 28](evidencias/28-publicacao-github.txt). A imagem também foi
confirmada no HTML do README renderizado pelo GitHub. Resta enviar o link no
ambiente virtual.

| Parte do enunciado | Resultado e onde conferir |
| --- | --- |
| Estrutura — Tarefa 1 | Pastas `app/`, `db/` e `docs/`, Compose, exemplo de ambiente, exclusões e README presentes. O nome local `G1-Nuvem` foi mantido. |
| Código fornecido — seção 3 / Apêndice A | `app.py`, `requirements.txt` e `init.sql` preservados: [comparação 11](evidencias/11-arquivos-fornecidos.txt) e [conferência 26](evidencias/26-conferencia-final.txt). |
| Dockerfile — Tarefa 2 / RNF04 | Python 3.12 slim, dependências antes do código, pip sem cache, uploads pertencentes ao usuário `app`, `USER`, `EXPOSE 5000` e Gunicorn na forma exec: [Dockerfile](../app/Dockerfile). Exclusões em [`.dockerignore`](../app/.dockerignore). Usuário comprovado em 23 e 26. |
| Compose — Tarefa 3 / RNF03 e RNF05 | PostgreSQL 16 alpine, variáveis do `.env`, banco sem porta publicada, bridge própria, dois volumes, SQL somente leitura, `pg_isready`, dependência saudável e política de reinício: [Compose](../docker-compose.yml), [relatório (b)](RELATORIO.md) e [conferência 26](evidencias/26-conferencia-final.txt). |
| Funcionamento — RF01 a RF04 / Tarefa 4 | Saúde, listagem, filtro, cadastro com/sem foto, recuperação de fotos, estatísticas e logs: [18](evidencias/18-proxy-e-rotas.txt), [23](evidencias/23-clone-e-aceite.txt) e [foto no navegador 24](evidencias/24-foto-com-proxy.png). |
| Subida do zero — RNF01 | Clone local de snapshot com volumes novos, somente `.env.example` copiado e `up -d --build`: [23](evidencias/23-clone-e-aceite.txt). Os nove arquivos operacionais atuais têm os mesmos hashes: [26](evidencias/26-conferencia-final.txt). O clone real do GitHub e a configuração com o exemplo foram posteriormente conferidos em [28](evidencias/28-publicacao-github.txt), sem repetir a subida já testada com os mesmos arquivos. |
| Persistência — RNF02 / Tarefa 5 | Recriação preserva registros, IDs, URLs e fotos; inspeção identifica volumes e caminhos; remoção elimina cadastros/fotos e recria os três exemplos: [22](evidencias/22-persistencia-com-proxy.txt), [23](evidencias/23-clone-e-aceite.txt) e [relatório (d)](RELATORIO.md). |
| A1 — README | Objetivo, pré-requisitos, clonagem, `.env`, subida, testes, rotas, parada e destruição: [README](../README.md). |
| A2 — Diagrama | Imagem fornecida incluída sem alterações em [arquitetura.png](arquitetura.png), com [fonte Mermaid](ARQUITETURA.md). Mostra host, portas, contêineres, rede, volumes, caminhos e bind mounts. |
| A3 — Relatório | Quatro partes (a) a (d), incluindo a gravação da foto antes do SQL, na ordem do código: [relatório](RELATORIO.md). |
| A4 — Evidências | Comandos reais, imagens, legendas e histórico das versões: [índice](evidencias/README.md). Inspeções da rede e tamanho da imagem em 22/23. |
| A5 — Reflexão / seção 5.1 | Sete respostas de 3 a 8 linhas no Markdown, seis peças e três provedores, com fontes oficiais: [reflexão](REFLEXAO.md). Migração descrita como proposta. |
| Bônus — seção 6 | Nginx, backup real com `docker run --rm` e restauração em volume novo, Adminer no perfil `debug`: [procedimentos](BONUS.md) e evidências 18 a 21. |

## Diferenças permitidas e limites registrados

A seção 6 permite que o Nginx substitua a publicação direta `8080:5000` de `web`.
Nesta versão, apenas o Nginx publica `8080:80`; `web` e `db` ficam sem publicação.
O Adminer é opcional e publica somente `127.0.0.1:8081` quando o perfil `debug`
é ativado. Assim, os serviços extras correspondem aos bônus do próprio enunciado.

O teste com três réplicas funcionou atrás do proxy, mas a redução de escala
apresentou erros transitórios nas tentativas iniciais. O procedimento validado
reinicia o Nginx após reduzir para uma réplica, causando breve interrupção;
isso está explicado em [BONUS.md](BONUS.md) e na resposta Q7. Não se afirma
redução sem interrupção nem segurança de gravação concorrente não testada.

Os registros antigos foram mantidos com identificação da arquitetura básica.
A conferência 26 verifica a versão atual contra o manifesto do ensaio 23;
as alterações desta revisão atingem somente documentação e a imagem.
O `.tar.gz` em evidências é o backup de duas fotos de teste exigido pelo bônus,
não um pacote do projeto para entrega.

## Entrega por repositório

O endereço configurado é [github.com/lucasmotareis/G1-Nuvem](https://github.com/lucasmotareis/G1-Nuvem).
Antes de entregar no ambiente virtual:

- [x] Fazer commit e push da infraestrutura, imagem, documentos e evidências: [verificação 28](evidencias/28-publicacao-github.txt).
- [x] Conferir o clone real e a imagem no HTML do README do GitHub: [verificação 28](evidencias/28-publicacao-github.txt).
- [x] Repositório com visibilidade pública confirmada: [verificação 28](evidencias/28-publicacao-github.txt).
- [ ] Enviar o link do repositório no ambiente virtual.

O `.env` permanece somente local, ignorado e ausente do histórico Git local
verificado. O arquivo `.env.example`, com valores fictícios para demonstração,
deve continuar versionado. Não é necessário gerar ou enviar um ZIP do projeto.

## Auditoria dos critérios que zeram a avaliação

A [auditoria 27](evidencias/27-auditoria-criterios-eliminacao.txt) verificou
índice, histórico, objetos Git locais e referências atuais do GitHub, sem indício
de senha real versionada. O `.env` permanece excluído; o modelo contém valores
fictícios permitidos. Não foi identificado motivo para reescrever o histórico.

Na auditoria 27, o GitHub ainda apontava para o commit inicial com Compose
vazio. Essa pendência foi resolvida pelo push da versão funcional e pela
[verificação 28](evidencias/28-publicacao-github.txt), que confirmou o clone real,
os arquivos operacionais, a imagem no README e a ausência do `.env` no histórico
publicado. A auditoria anterior permanece como registro da situação antes do push.
