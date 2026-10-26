# Entrada por senha compartilhada

A interface e todas as rotas públicas da API exigem **HTTP Basic Authentication**
no Nginx. O Flask fornecido pelo professor permanece intacto. Ao abrir o site,
o navegador pede o usuário (por padrão, **`visitante`**) e a senha compartilhada.
Não há cadastro de contas ou uma senha embutida no JavaScript.

## Configuração local

O `.env` local contém `ACCESS_USER` e `ACCESS_PASSWORD`, além das três variáveis
`POSTGRES_*`. O Compose repassa as duas variáveis de acesso somente ao Nginx.
O arquivo é ignorado pelo Git; não envie seu conteúdo ou capturas dele.

O `.env.example` contém somente uma credencial pública de demonstração, suficiente
para copiar o exemplo e executar o exercício. **Troque a senha para uso real.**
A senha deve ter de 20 a 72 bytes, sem quebra de linha; o limite superior evita
truncamento pelo bcrypt. Frases longas são aceitas. Não reutilize a senha do banco.

Depois de editar a configuração local:

```sh
docker compose up -d --build
```

Abra **http://localhost:8080** e informe o usuário e a senha do seu `.env`.
A publicação HTTP local está restrita a `127.0.0.1`; para acesso pela internet,
use o procedimento HTTPS da AWS abaixo.

Na inicialização, [40-access-password.sh](../frontend/40-access-password.sh)
gera um hash **bcrypt**, custo 10, em `/run/nginx-auth/htpasswd`. A senha entra
no `htpasswd` pela entrada padrão, não como argumento de processo. O arquivo fica
fora do diretório público, com leitura apenas para root e grupo nginx. Não é
copiado para a imagem nem versionado. A ausência do segredo, senha curta/demasiado
longa ou usuário inválido impedem o início do Nginx.

Basic Auth protege `/`, os arquivos estáticos, `/health`, `/itens`,
`/estatisticas`, os cadastros e `/fotos/...`. O proxy remove `Authorization`
antes de encaminhar a requisição ao Flask. Consultar apenas a API ou o link
direto de uma foto não contorna a entrada por senha.

O navegador pode lembrar a credencial na sessão. Para demonstrar o pedido de
senha novamente, abra uma janela privativa. Não há botão de logout com sessão
própria; em computador compartilhado, feche a janela privativa depois de usar.

## Testar com curl sem gravar a senha no comando

Sem credenciais, o resultado esperado é HTTP 401:

```powershell
curl.exe -i http://localhost:8080/health
```

Para acessar, informe **somente o usuário** no comando; o curl pedirá a senha:

```powershell
curl.exe --user visitante -i http://localhost:8080/health
curl.exe --user visitante -i http://localhost:8080/itens
curl.exe --user visitante -i -F 'descricao=Teste protegido' -F 'local=Biblioteca' -F 'foto=@docs/evidencias/foto-teste-1.png' http://localhost:8080/itens
```

Não use `--user usuario:senha`, URL com credenciais, `curl -v`, `set -x` ou
saída completa de `docker compose config` em evidências. Adapte o nome do usuário
se tiver alterado `ACCESS_USER`. Um HTTP 401 com senha incorreta é esperado.

## Disponibilizar na AWS

O [ambiente da apresentação](AWS-APRESENTACAO.md) usa o domínio padrão HTTPS
do CloudFront, com certificado fornecido pela AWS. O ALB permanece interno,
acessível pelo CloudFront por VPC origin. O usuário pode acessar de outra rede
e informar a senha; não precisa cadastrar seu IP. O [roteiro AWS](GUIA_AWS.md)
também mantém a alternativa com domínio próprio e certificado ACM no ALB.

Crie um **segredo separado do banco**, por exemplo `g1/achados/acesso`, com a
chave `password`. O valor real é informado somente no console do Secrets Manager.
No modelo ECS, o contêiner `frontend` recebe a chave em `ACCESS_PASSWORD` por
referência ao ARN; o usuário `visitante` é configuração sem segredo. A execution
role recebe `GetSecretValue` nos dois segredos específicos.

O security group da task aceita a porta 80 **somente dos grupos de ALB definidos
para o laboratório**. Na implantação atual, CloudFront termina o TLS e gera
`CloudFront-Forwarded-Proto: https`; o ALB interno encaminha HTTP pela VPC.
O frontend v3 aceita esse indicador ou `X-Forwarded-Proto: https`, usado na
alternativa com TLS no próprio ALB. Sem indicação HTTPS, retorna 426.
Os cabeçalhos dependem das restrições de rede. Somente CloudFront recebe
requisições públicas; seu HTTP redireciona para HTTPS.

Os healthchecks não precisam conhecer a senha: existe um listener separado em
`8082`, somente com `/healthz`. Ele não serve a interface, fotos ou outros
caminhos da API. Localmente não há publicação dessa porta; na AWS, libere-a
somente a partir do security group do ALB. O healthcheck do ECS usa localhost,
e o target group do ALB usa HTTP, porta 8082, caminho `/healthz`.

Para trocar a senha, atualize o segredo e force novo deployment do service.
Faça a troca em todas as réplicas e confirme o término das tasks antigas:
durante a substituição, elas ainda podem aceitar a senha anterior.

## Verificação de desenvolvimento

Os testes de navegador recebem a senha por `TEST_ACCESS_PASSWORD`, nunca por
argumento. No PowerShell, é possível digitá-la sem eco:

```powershell
$LoginCredential = Get-Credential -UserName visitante -Message 'Credencial do ambiente de teste'
$env:TEST_ACCESS_USER = $LoginCredential.UserName
$env:TEST_ACCESS_PASSWORD = $LoginCredential.GetNetworkCredential().Password
try {
    npm run test:access
    npm run test:frontend
} finally {
    Remove-Item Env:TEST_ACCESS_PASSWORD
}
```

Os resultados são salvos em `test-results/`, ignorado pelo Git. As evidências
34 em diante documentam a implementação desta proteção; as anteriores registram
a versão sem senha. A senha real não integra as evidências.

Fontes: [Nginx Basic Auth](https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html),
[htpasswd](https://httpd.apache.org/docs/2.4/programs/htpasswd.html),
[healthchecks do ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
e [segredos no ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html).
