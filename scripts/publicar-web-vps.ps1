param(
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$Revisao
)

$ErrorActionPreference = 'Stop'
$repo = 'https://api.github.com/repos/GleidistonJR/Sistema-GYN-Acrilico'
if (-not $Revisao) {
  $Revisao = git -C $PSScriptRoot rev-parse HEAD
  if ($LASTEXITCODE -ne 0 -or $Revisao -cnotmatch '^[a-f0-9]{40}$') { throw 'Não foi possível identificar o commit.' }
}
$credencial = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($credencial | Where-Object { $_.StartsWith('password=') }) -replace '^password=', ''
if (-not $token) { throw 'Entre no GitHub pelo Git Credential Manager para baixar a imagem.' }
$headers = @{ Authorization = "Bearer $token"; 'X-GitHub-Api-Version' = '2022-11-28' }
$execucoes = Invoke-RestMethod -Uri "$repo/actions/workflows/build-web.yml/runs?head_sha=$Revisao&status=success&per_page=1" -Headers $headers
$execucao = $execucoes.workflow_runs | Select-Object -First 1
if (-not $execucao -or $execucao.head_branch -ne 'main' -or $execucao.head_sha -ne $Revisao) {
  throw "Ainda não há um build aprovado na main para $Revisao."
}
$artefatos = Invoke-RestMethod -Uri "$repo/actions/runs/$($execucao.id)/artifacts" -Headers $headers
$artefato = $artefatos.artifacts | Where-Object { -not $_.expired -and $_.name -eq "gyn-web-$Revisao" } | Select-Object -First 1
if (-not $artefato) { throw 'A imagem do GitHub Actions expirou ou não foi encontrada.' }

$temporario = Join-Path ([IO.Path]::GetTempPath()) ('gyn-web-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporario | Out-Null
try {
  $zip = Join-Path $temporario 'gyn-web.zip'
  Invoke-WebRequest -Uri "$repo/actions/artifacts/$($artefato.id)/zip" -Headers $headers -OutFile $zip
  if ($artefato.digest -and $artefato.digest -ne ('sha256:' + (Get-FileHash -LiteralPath $zip).Hash.ToLowerInvariant())) {
    throw 'O arquivo baixado não corresponde ao artefato do GitHub.'
  }
  Expand-Archive -LiteralPath $zip -DestinationPath $temporario
  $imagem = Join-Path $temporario 'gyn-web.tar.gz'
  $checksum = (Get-FileHash -LiteralPath $imagem).Hash.ToLowerInvariant()
  $destino = ssh -o BatchMode=yes gyn-vps 'mktemp -d /tmp/gyn-web.XXXXXX'
  if ($LASTEXITCODE -ne 0 -or $destino -cnotmatch '^/tmp/gyn-web\.[a-zA-Z0-9]+$') { throw 'Não foi possível preparar a transferência na VPS.' }
  scp -o BatchMode=yes $imagem "gyn-vps:${destino}/gyn-web.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao transferir a imagem.' }
  Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'ativar-web-vps.sh') |
    ssh -o BatchMode=yes gyn-vps "tr -d '\015' | bash -s -- $Revisao $destino $checksum"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao ativar a imagem na VPS.' }
} finally {
  foreach ($arquivo in @('gyn-web.zip', 'gyn-web.tar.gz')) {
    $alvo = Join-Path $temporario $arquivo
    if (Test-Path -LiteralPath $alvo -PathType Leaf) { Remove-Item -LiteralPath $alvo }
  }
  if (-not (Get-ChildItem -LiteralPath $temporario -Force)) { Remove-Item -LiteralPath $temporario }
}
