$ErrorActionPreference = 'Stop'
$startupPath = [Environment]::GetFolderPath('Startup')
$launcherPath = Join-Path $PSScriptRoot 'iniciar-whatsapp.ps1'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $startupPath 'GYN Acrilico - WhatsApp.lnk'))
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $launcherPath + '"'
$shortcut.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Reconecta o atendimento ao WhatsApp usando a sessao salva neste computador.'
$shortcut.Save()
Write-Output 'Inicializacao automatica do WhatsApp instalada para este usuario do Windows.'
