param(
    [Parameter(Mandatory=$true)][string]$BaseUrl,
    [string]$EvidencePath = 'test-results/aws/rotas-api.json',
    [switch]$ReadOnly
)
$ErrorActionPreference = 'Stop'
if (([Uri]$BaseUrl).Scheme -ne 'https') { throw 'Os testes AWS exigem HTTPS com certificado valido.' }
if (-not $env:TEST_ACCESS_PASSWORD) { throw 'Defina TEST_ACCESS_PASSWORD sem exibir seu valor.' }
$g1User = if ($env:TEST_ACCESS_USER) { $env:TEST_ACCESS_USER } else { 'visitante' }
if (($g1User + $env:TEST_ACCESS_PASSWORD) -match '[\r\n]') { throw 'Credencial invalida.' }
$g1Credential = ($g1User + ':' + $env:TEST_ACCESS_PASSWORD).Replace('\', '\\').Replace('"', '\"')
$g1CurlConfig = 'user = "' + $g1Credential + '"'
$g1Results = [Collections.Generic.List[object]]::new()

function Invoke-G1Curl([string]$Route, [bool]$Authenticate = $true, [string[]]$Extra = @()) {
    $g1BodyPath = [IO.Path]::GetTempFileName()
    try {
        $g1Args = @('--silent', '--show-error', '--connect-timeout', '10', '--max-time', '45', '--output', $g1BodyPath, '--write-out', '%{http_code}')
        if ($Authenticate) { $g1Args += @('--config', '-') }
        $g1Args += $Extra
        $g1Args += ($BaseUrl.TrimEnd('/') + $Route)
        $g1Status = if ($Authenticate) { $g1CurlConfig | & curl.exe @g1Args } else { & curl.exe @g1Args }
        if ($LASTEXITCODE -ne 0) { throw "curl falhou em $Route, codigo $LASTEXITCODE" }
        $g1Body = [IO.File]::ReadAllBytes($g1BodyPath)
        $g1Text = [Text.Encoding]::UTF8.GetString($g1Body)
        $g1Json = try { $g1Text | ConvertFrom-Json -ErrorAction Stop } catch { $null }
        $g1Hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($g1Body)).ToLowerInvariant()
        return [PSCustomObject]@{route=$Route;status=[int]$g1Status;json=$g1Json;sha256=$g1Hash;bytes=$g1Body.Length}
    } finally { Remove-Item -LiteralPath $g1BodyPath -Force }
}
function Assert-G1Status($Response, [int]$Expected) {
    if ($Response.status -ne $Expected) { throw "HTTP $($Response.status) em $($Response.route); esperado $Expected" }
    $g1Results.Add($Response)
}

try {
    foreach ($g1Route in @('/', '/health', '/itens', '/estatisticas', '/fotos/inexistente.png')) {
        Assert-G1Status (Invoke-G1Curl $g1Route $false) 401
    }
    $g1Health = Invoke-G1Curl '/health'
    Assert-G1Status $g1Health 200
    if ($g1Health.json.status -ne 'ok' -or $g1Health.json.banco -ne 'conectado') { throw 'Saude invalida' }
    $g1InitialItems = Invoke-G1Curl '/itens'
    Assert-G1Status $g1InitialItems 200
    $g1Filtered = Invoke-G1Curl '/itens?local=biblio'
    Assert-G1Status $g1Filtered 200
    if (@($g1Filtered.json).Count -eq 0 -or @($g1Filtered.json | Where-Object { $_.local -notmatch 'biblio' }).Count -ne 0) { throw 'Filtro invalido' }
    $g1Before = Invoke-G1Curl '/estatisticas'
    Assert-G1Status $g1Before 200
    $g1Created = $null
    if (-not $ReadOnly) {
        Assert-G1Status (Invoke-G1Curl '/itens' $true @('-X','POST','-F','descricao=Campos incompletos de teste')) 400
        $g1PhotoPath = (Resolve-Path (Join-Path $PSScriptRoot '../docs/evidencias/foto-teste-1.png')).Path
        $g1Created = Invoke-G1Curl '/itens' $true @('-X','POST','-F','descricao=Garrafa de demonstracao AWS','-F','local=Biblioteca','-F',('foto=@'+$g1PhotoPath))
        Assert-G1Status $g1Created 201
        if (-not $g1Created.json.foto) { throw 'Cadastro nao retornou foto' }
    }
    $g1Items = Invoke-G1Curl '/itens'
    Assert-G1Status $g1Items 200
    foreach ($g1Item in @($g1Items.json | Where-Object { $_.foto })) {
        Assert-G1Status (Invoke-G1Curl $g1Item.foto $false) 401
        $g1Photo = Invoke-G1Curl $g1Item.foto
        Assert-G1Status $g1Photo 200
        if ($g1Photo.bytes -le 0) { throw 'Foto vazia' }
    }
    $g1After = Invoke-G1Curl '/estatisticas'
    Assert-G1Status $g1After 200
    if (-not $ReadOnly -and ($g1After.json.itens_no_banco -ne ($g1Before.json.itens_no_banco+1) -or $g1After.json.fotos_no_volume -ne ($g1Before.json.fotos_no_volume+1))) { throw 'Contagens nao incrementaram corretamente' }
    $g1Report = [ordered]@{legenda='Rotas reais na AWS por curl.exe; autenticacao enviada por stdin, sem credencial em argumentos/evidencias.';executadoEmUtc=[DateTime]::UtcNow.ToString('o');baseURL=$BaseUrl;readOnly=[bool]$ReadOnly;before=$g1Before.json;after=$g1After.json;created=$g1Created.json;checks=$g1Results}
    $g1OutputFull = [IO.Path]::GetFullPath($EvidencePath)
    [IO.Directory]::CreateDirectory((Split-Path $g1OutputFull -Parent)) | Out-Null
    [IO.File]::WriteAllText($g1OutputFull, ($g1Report | ConvertTo-Json -Depth 15), [Text.UTF8Encoding]::new($false))
    [PSCustomObject]@{resultado='APROVADO';verificacoes=$g1Results.Count;antes=$g1Before.json;depois=$g1After.json;evidencia=$g1OutputFull} | ConvertTo-Json -Depth 5
} finally { $g1Credential=$null; $g1CurlConfig=$null }
