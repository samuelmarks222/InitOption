param(
  [int]$Port = 5173,
  [string]$BindHost = "0.0.0.0",
  [int]$CheckIntervalSeconds = 5,
  [int]$StartupTimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$stateDir = Join-Path $projectRoot ".dev-server"
$logDir = Join-Path $stateDir "logs"
$serverPidFile = Join-Path $stateDir "server.pid"
$supervisorPidFile = Join-Path $stateDir "supervisor.pid"
$stdoutLog = Join-Path $logDir "vite.stdout.log"
$stderrLog = Join-Path $logDir "vite.stderr.log"
$supervisorLog = Join-Path $logDir "supervisor.log"
$viteCliPath = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$viteCliCommand = ".\node_modules\vite\bin\vite.js"

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $supervisorLog -Value "[$timestamp] $Message"
}

function Get-TrackedProcess {
  if (-not (Test-Path $serverPidFile)) {
    return $null
  }

  $rawPid = (Get-Content $serverPidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($rawPid -notmatch "^\d+$") {
    return $null
  }

  return Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
}

function Get-PortOwnerPid {
  param([int]$ListeningPort)
  $match = netstat -ano -p TCP |
    Select-String -Pattern "^\s*TCP\s+\S+:$ListeningPort\s+\S+\s+LISTENING\s+(\d+)\s*$" |
    Select-Object -First 1

  if ($null -eq $match) {
    return $null
  }

  if ($match.Matches.Count -eq 0) {
    return $null
  }

  return [int]$match.Matches[0].Groups[1].Value
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  try {
    $processInfo = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    return $processInfo.CommandLine
  } catch {
    return $null
  }
}

function Test-PortListening {
  param([int]$ListeningPort)
  return $null -ne (Get-PortOwnerPid -ListeningPort $ListeningPort)
}

function Try-AdoptExistingListener {
  param(
    [int]$ExistingProcessId,
    [int]$ListeningPort
  )

  $existingProcess = Get-Process -Id $ExistingProcessId -ErrorAction SilentlyContinue
  if (-not $existingProcess) {
    return $false
  }

  if ($existingProcess.ProcessName -ne "node") {
    return $false
  }

  $commandLine = Get-ProcessCommandLine -ProcessId $ExistingProcessId
  if ($commandLine -and $commandLine -notlike "*$viteCliPath*" -and $commandLine -notlike "*$viteCliCommand*") {
    return $false
  }

  Set-Content -Path $serverPidFile -Value $ExistingProcessId
  if ($commandLine) {
    Write-Log "Adopted existing Vite listener PID $ExistingProcessId on port $ListeningPort."
  } else {
    Write-Log "Adopted existing node listener PID $ExistingProcessId on port $ListeningPort because the command line was not accessible."
  }
  return $true
}

function Start-DevServer {
  if (-not (Test-Path $viteCliPath)) {
    throw "Vite CLI not found at $viteCliPath. Run npm install before starting the dev server."
  }

  $process = Start-Process -FilePath "node.exe" `
    -ArgumentList @($viteCliCommand, "--host", $BindHost, "--port", $Port.ToString()) `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path $serverPidFile -Value $process.Id
  Write-Log "Started dev server with PID $($process.Id) on port $Port."
  return $process
}

function Wait-ForDevServer {
  param(
    [int]$ExpectedProcessId,
    [int]$ListeningPort,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $trackedProcess = Get-Process -Id $ExpectedProcessId -ErrorAction SilentlyContinue
    if (-not $trackedProcess) {
      Write-Log "Tracked dev server PID $ExpectedProcessId exited before port $ListeningPort was ready."
      return $false
    }

    $portOwnerPid = Get-PortOwnerPid -ListeningPort $ListeningPort
    if ($portOwnerPid -eq $ExpectedProcessId) {
      return $true
    }

    Start-Sleep -Seconds 1
  }

  Write-Log "Tracked dev server PID $ExpectedProcessId did not bind port $ListeningPort within $TimeoutSeconds seconds."
  return $false
}

Set-Content -Path $supervisorPidFile -Value $PID
Write-Log "Supervisor booted with PID $PID."

while ($true) {
  $trackedProcess = Get-TrackedProcess
  $portOwnerPid = Get-PortOwnerPid -ListeningPort $Port

  if ($trackedProcess) {
    if ($portOwnerPid -eq $trackedProcess.Id) {
      Start-Sleep -Seconds $CheckIntervalSeconds
      continue
    }

    if ($null -eq $portOwnerPid) {
      Write-Log "Tracked dev server PID $($trackedProcess.Id) is running and waiting to bind port $Port."
      Start-Sleep -Seconds $CheckIntervalSeconds
      continue
    }

    Write-Log "Port $Port is owned by PID $portOwnerPid while tracked dev server PID is $($trackedProcess.Id). Leaving the existing listener alone."
    Start-Sleep -Seconds $CheckIntervalSeconds
    continue
  }

  if ($null -ne $portOwnerPid) {
    if (Try-AdoptExistingListener -ExistingProcessId $portOwnerPid -ListeningPort $Port) {
      Start-Sleep -Seconds $CheckIntervalSeconds
      continue
    }

    Write-Log "Port $Port is already listening under PID $portOwnerPid. Leaving the existing listener alone."
    Start-Sleep -Seconds $CheckIntervalSeconds
    continue
  }

  try {
    $process = Start-DevServer
    if (Wait-ForDevServer -ExpectedProcessId $process.Id -ListeningPort $Port -TimeoutSeconds $StartupTimeoutSeconds) {
      Write-Log "Dev server PID $($process.Id) is listening on port $Port."
    }
  } catch {
    Write-Log "Failed to start dev server: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $CheckIntervalSeconds
}
