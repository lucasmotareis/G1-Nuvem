# Etapa 9 — Inicialização real do PostgreSQL

Em 26/10/2026, a tarefa temporária `achados-init:1` executou o arquivo original
`db/init.sql` no RDS privado. Nenhum arquivo fornecido pelo professor foi alterado.

A tarefa usou a imagem `achados-web:aws-v1`, a execution role e as referências
do segredo do banco. As credenciais foram injetadas pelo ECS; não foram copiadas
para comandos, evidências ou arquivos versionados. A task não precisou do
frontend, da montagem de fotos ou de uma porta aberta no banco para a internet.

Antes de aplicar o SQL, o script verificou que `public.itens` não existia.
A execução ocorreu em uma transação, evitando uma inicialização parcial.
Não executar novamente para acrescentar exemplos: o script interrompe se a
tabela já existe. Mudanças futuras devem usar migrações específicas.

Resultado real dos logs:

```text
Inicializacao concluida; itens: 3 TLS: True
```

O contêiner encerrou com `exitCode: 0`. `EssentialContainerExited` é o motivo
normal desta tarefa avulsa: seu trabalho terminou. Ela não é o service da aplicação.
O teste confirma conexão SQL, TLS e escrita de logs com a execution role,
resolvendo a dúvida da simulação da etapa 7 sem ampliar sua política.

[Evidência real: execução, estado final e logs](evidencias/aws/07-inicializacao-rds.json).

Próxima etapa: executar `achados-web` como service, validar fotos e disponibilizar HTTPS.
