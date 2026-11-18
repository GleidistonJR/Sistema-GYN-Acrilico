$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$supervisorPath = Join-Path $PSScriptRoot 'whatsapp-supervisor.mjs'
$workerPath = Join-Path $PSScriptRoot 'whatsapp-server.mjs'
$mutex = New-Object System.Threading.Mutex($false, 'Local\GynAcrilicoWhatsAppStartup')
$acquired = $false
try {
    $acquired = $mutex.WaitOne(0)
    if (-not $acquired) { exit 0 }
    # Re-running the shortcut must not launch a second Chrome on the same profile.
    $existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
        $_.CommandLine -and ($_.CommandLine.Contains($supervisorPath) -or
        $_.CommandLine.Contains($workerPath) -or
        $_.CommandLine.Contains('scripts/whatsapp-supervisor.mjs'))
    }
    if ($existing) { Write-Output 'O servico WhatsApp ja esta em execucao.'; exit 0 }
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $logsPath = Join-Path $projectPath '.whatsapp-session\logs'
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
    $arguments = @('--env-file="' + (Join-Path $projectPath '.env') + '"',
        '--env-file-if-exists="' + (Join-Path $projectPath '.env.local') + '"',
        '"' + $supervisorPath + '"')
    Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $projectPath -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logsPath 'whatsapp-startup.log') `
        -RedirectStandardError (Join-Path $logsPath 'whatsapp-startup-error.log') | Out-Null
    Write-Output 'Servico WhatsApp iniciado em segundo plano.'
} finally {
    if ($acquired) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
