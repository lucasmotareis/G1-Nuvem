# Índice de evidências

Verificações realizadas em 19/10/2026 nas etapas de configuração e testes.
Os arquivos abaixo registram somente comandos executados e seus resultados.
Os horários UTC/GMT originais das saídas foram preservados; as legendas usam a
data local de 19/10/2026. Os arquivos 01 a 17 correspondem à arquitetura básica;
os arquivos a partir de 18 correspondem à implementação dos bônus.

| Arquivo | Legenda e critério verificado |
| --- | --- |
| [01-validacao-configuracao.txt](01-validacao-configuracao.txt) | Validação estática do Compose e exclusão do `.env` do Git; não comprova funcionamento dos contêineres. |
| [02-tentativa-subida.txt](02-tentativa-subida.txt) | Tentativa inicial bloqueada pela permissão de acesso ao Docker; registro histórico da limitação. |
| [03-subida.txt](03-subida.txt) | Nova tentativa: build e subida concluídos fora do sandbox, com banco saudável antes do início de `web`. |
| [04-verificacao-inicial.txt](04-verificacao-inicial.txt) | Serviços em execução, banco sem porta publicada, `/health` com HTTP 200 e banco conectado, três itens iniciais, estatísticas, usuário `app` e logs do Gunicorn. |
| [05-rotas-funcionais.txt](05-rotas-funcionais.txt) | RF01 a RF04: saúde, listagem, filtro, cadastro com e sem foto, recuperação de duas imagens com bytes idênticos aos enviados e estatísticas. |
| [06-persistencia-recriacao.txt](06-persistencia-recriacao.txt) | RNF02 e recriação da Tarefa 5: os seis registros e duas fotos permanecem após `down` e `up -d`; comparação de registros completos, IDs, URLs, contagens e SHA-256. |
| [07-usuario-prontidao.txt](07-usuario-prontidao.txt) | RNF04 e RNF05: usuário `app`, UID 999, fotos pertencentes a `app` e estado dos serviços; a ordem de inicialização está em 06. |
| [08-foto-no-navegador.png](08-foto-no-navegador.png) | Foto do item 4 exibida no navegador pela rota `/fotos/d1db8ccebee64116af60f2b39b324e6d.png`, após a recriação; imagem de teste azul, sem dados pessoais. |
| [09-credenciais-e-configuracao.txt](09-credenciais-e-configuracao.txt) | RNF03 e RNF05: `.env` ignorado e ausente do índice/histórico local, variáveis externas sem credenciais literais nos arquivos da aplicação/infraestrutura, healthcheck e dependência saudável. |
| [10-subida-copia-limpa.txt](10-subida-copia-limpa.txt) | RNF01: cópia da versão de trabalho sem o `.env` local, configuração a partir de `.env.example`, build, volumes novos e API saudável com três itens iniciais; ambiente original restaurado ao final. |
| [11-arquivos-fornecidos.txt](11-arquivos-fornecidos.txt) | Seção 3: comparação de `app/app.py`, `app/requirements.txt` e `db/init.sql` com o Apêndice A, sem divergências de conteúdo; arquivos preservados desde o commit inicial e padrões de configuração conferidos. |
| [12-inspecao-volumes.txt](12-inspecao-volumes.txt) | Tarefa 5, inspeção: `volume ls`, `volume inspect` dos dois volumes, caminhos físicos, listagem das fotos e estatísticas antes/depois sem alterações. |
| [13-preservacao-antes-remocao.txt](13-preservacao-antes-remocao.txt) | Preservação local do banco e das duas fotos antes da destruição, com tamanhos e hashes; leitura dos formatos conferida, sem restauração demonstrada. |
| [14-remocao-volumes.txt](14-remocao-volumes.txt) | Tarefa 5, remoção: `down -v` e nova subida; de seis itens e duas fotos para três exemplos recriados e nenhuma foto; cadastros antigos ausentes e URLs com HTTP 404. |
| [15-inspecao-infraestrutura.txt](15-inspecao-infraestrutura.txt) | Tarefa 6, A4: `network inspect` da rede real e `image ls` da imagem web, com tamanho; portas publicadas, usuário e logs após a reinicialização. |
| [16-teste-replicas.txt](16-teste-replicas.txt) | Reflexão Q7: tentativa real de três réplicas falha por conflito na porta 8080; retorno a uma réplica sem alteração dos dados. |
| [17-parada-retomada.txt](17-parada-retomada.txt) | README: `stop` e `start` dos dois serviços, saúde restaurada e estatísticas preservadas em três itens e nenhuma foto. |
| [18-proxy-e-rotas.txt](18-proxy-e-rotas.txt) | Nginx: build, sintaxe, portas e RF01 a RF04 por meio do proxy; a primeira estatística é o baseline anterior à atualização. |
| [18-foto-4.png](18-foto-4.png) | Foto azul do item 4 recuperada pela API através do Nginx, com hash conferido em 18. |
| [18-foto-5.png](18-foto-5.png) | Foto amarela do item 5 recuperada pela API através do Nginx, com hash conferido em 18. |
| [19-backup-restauracao.txt](19-backup-restauracao.txt) | Backup com `docker run --rm`, restauração em volume novo e igualdade de nomes/contagens/SHA-256 das duas fotos; origem preservada. |
| [19-fotos-backup.tar.gz](19-fotos-backup.tar.gz) | Arquivo real do backup demonstrado em 19, contendo somente os dois PNGs de teste sem dados pessoais. |
| [20-adminer-debug.txt](20-adminer-debug.txt) | Adminer opcional: perfil padrão sem painel, ativação com `debug`, HTTP 200, consulta SQL pelo PHP do contêiner e desativação; sem login gráfico registrado. |
| [21-replicas-com-proxy.txt](21-replicas-com-proxy.txt) | Primeira tentativa: três réplicas e leitura compartilhada aprovadas, mas retorno imediato após reduzir a escala falhou por timeout; preservada como diagnóstico. |
| [21-replicas-com-proxy-tentativa-2.txt](21-replicas-com-proxy-tentativa-2.txt) | Segunda tentativa: timeout menor, mas houve HTTP 504 na redução; não comprova retomada sem erros. |
| [21-replicas-com-proxy-validado.txt](21-replicas-com-proxy-validado.txt) | Procedimento aprovado: Nginx alcança três réplicas, todas enxergam as fotos e o retorno a uma réplica funciona com reinício explícito do proxy. |
| [22-persistencia-com-proxy.txt](22-persistencia-com-proxy.txt) | Versão com bônus: registros, IDs, URLs e hashes preservados após `down` e `up`; inspeções da rede, volumes, imagem, portas, usuário e logs. |
| [22-foto-4.png](22-foto-4.png) | Foto do item 4 novamente recuperada e comparada após a recriação da versão com proxy. |
| [22-foto-5.png](22-foto-5.png) | Foto do item 5 novamente recuperada e comparada após a recriação da versão com proxy. |
| [23-clone-e-aceite.txt](23-clone-e-aceite.txt) | Clone local de snapshot sem `.env`, subida com volumes novos, todas as rotas, usuário e portas, recriação, inspeção, remoção e parada/retomada; projeto original preservado. |
| [23-manifesto-operacional.json](23-manifesto-operacional.json) | Commit do snapshot temporário e hashes dos nove arquivos operacionais testados, para comparação com os arquivos da versão entregue. |
| [24-foto-com-proxy.png](24-foto-com-proxy.png) | Foto azul do item 4 exibida no navegador pela URL `/fotos/32ca639243894b06b6a718d246401cef.png`, após os testes finais e a retomada do projeto original com Nginx. |
| [25-auditoria-entrega.txt](25-auditoria-entrega.txt) | Auditoria final de Git, credenciais, arquivos fornecidos, links, requisitos da documentação e inventário de arquivos destinados à entrega. |
| [26-conferencia-final.txt](26-conferencia-final.txt) | Conferência final contra o PDF: integridade dos arquivos operacionais, imagem original incluída, documentação, exclusão de segredos e verificação atual do ambiente; publicação remota não realizada. |
| [27-auditoria-criterios-eliminacao.txt](27-auditoria-criterios-eliminacao.txt) | Credenciais: índice, commits, objetos locais e referências atuais do GitHub sem indício de segredo real; versão remota ainda inicial, com publicação funcional pendente. |

As imagens enviadas são [foto-teste-1.png](foto-teste-1.png) e
[foto-teste-2.png](foto-teste-2.png), dois PNGs 64 × 64 de cor uniforme.
Os arquivos recuperados da API são [foto-retornada-4.png](foto-retornada-4.png)
e [foto-retornada-5.png](foto-retornada-5.png). As comparações de bytes e hashes
estão em 05 e 06.

A limitação inicial de acesso ao Docker foi superada na execução fora do sandbox.
Os testes funcionais e de recriação chegaram a seis itens e duas fotos: os três
itens iniciais e três cadastros de teste, dois deles com foto. A captura 08 é desse
período e comprova acesso à foto antes do ensaio destrutivo.

Depois do ensaio de remoção 14, o ambiente terminou em execução com três itens de
exemplo recriados e nenhuma foto. As URLs antigas passaram a retornar HTTP 404,
como esperado. O teste de réplicas 16 preservou esse estado e terminou com uma
instância de `web` e uma de `db`.

O ensaio 10 usou uma cópia limpa da versão básica, incluindo alterações ainda
não commitadas. Posteriormente, o ensaio 23 verificou um clone local do snapshot
da versão com bônus, e o manifesto registra os arquivos operacionais testados.
O `down -v` registrado em 10 limpou apenas os recursos descartáveis do projeto
isolado. O ensaio completo da Tarefa 5, com a perda dos cadastros e fotos e a
reinicialização após remoção dos volumes, foi realizado depois e está em 14.

Na versão com bônus, foram criados novos cadastros de demonstração: o ambiente
ativo tem seis itens e duas fotos, com Nginx, uma réplica de `web` e `db`.
O Adminer terminou desativado. O volume restaurado de demonstração é independente
do volume ativo. A [reflexão](../REFLEXAO.md) distingue o conflito da arquitetura
básica e o funcionamento das três réplicas atrás do proxy, incluindo a limitação
observada na redução de escala e o procedimento adotado para a retomada.
O snapshot temporário do ensaio 23 não representa publicação do repositório de
trabalho: para entregar por link, é necessário disponibilizar as alterações no
repositório. A entrega escolhida é por link, conforme o [README](../../README.md).
As menções a pacote no registro 25 e no manifesto 23 pertencem ao planejamento
anterior e foram preservadas como histórico; a conferência 26 verifica a versão
atual destinada ao repositório, sem incluir `.env` ou backups locais.
