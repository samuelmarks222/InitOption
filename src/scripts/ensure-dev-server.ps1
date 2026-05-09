$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$stateDir = Join-Path $projectRoot ".dev-server"
$logDir = Join-Path $stateDir "logs"
$supervisorPidFile = Join-Path $stateDir "supervisor.pid"
$supervisorStdoutLog = Join-Path $logDir "supervisor.stdout.log"
$supervisorStderrLog = Join-Path $logDir "supervisor.stderr.log"
$supervisorScript = ".\scripts\dev-supervisor.ps1"

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Get-RunningSupervisor {
  if (-not (Test-Path $supervisorPidFile)) {
    return $null
  }

  $rawPid = (Get-Content $supervisorPidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($rawPid -notmatch "^\d+$") {
    return $null
  }

  return Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
}

$existing = Get-RunningSupervisor
if ($existing) {
  Write-Output "Dev supervisor already running with PID $($existing.Id)."
  exit 0
}

$process = Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $supervisorScript) `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $supervisorStdoutLog `
  -RedirectStandardError $supervisorStderrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $supervisorPidFile -Value $process.Id
Start-Sleep -Seconds 2

$running = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if (-not $running) {
  Remove-Item -Path $supervisorPidFile -ErrorAction SilentlyContinue

  $stderr = ""
  if (Test-Path $supervisorStderrLog) {
    $stderr = ((Get-Content $supervisorStderrLog -Tail 20) -join [Environment]::NewLine).Trim()
  }

  $stdout = ""
  if (Test-Path $supervisorStdoutLog) {
    $stdout = ((Get-Content $supervisorStdoutLog -Tail 20) -join [Environment]::NewLine).Trim()
  }

  $details = @()
  if ($stderr) {
    $details += "stderr:"
    $details += $stderr
  }
  if ($stdout) {
    $details += "stdout:"
    $details += $stdout
  }

  if ($details.Count -gt 0) {
    throw ("Dev supervisor exited during startup." + [Environment]::NewLine + ($details -join [Environment]::NewLine))
  }

  throw "Dev supervisor exited during startup."
}

Write-Output "Started dev supervisor with PID $($process.Id)."
