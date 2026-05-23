param(
  [Parameter(Mandatory = $true)]
  [string]$TargetDbUrl,

  [Parameter(Mandatory = $true)]
  [string]$BackupDir,

  [switch]$SkipRoles
)

$ErrorActionPreference = "Stop"

$rolesPath = Join-Path $BackupDir "roles.sql"
$schemaPath = Join-Path $BackupDir "schema.sql"
$dataPath = Join-Path $BackupDir "data.sql"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql was not found. Install PostgreSQL client tools before restoring."
}

if (-not (Test-Path -LiteralPath $schemaPath)) {
  throw "Missing schema dump: $schemaPath"
}

if (-not (Test-Path -LiteralPath $dataPath)) {
  throw "Missing data dump: $dataPath"
}

$psqlArgs = @(
  "--single-transaction",
  "--variable", "ON_ERROR_STOP=1"
)

if (-not $SkipRoles) {
  if (-not (Test-Path -LiteralPath $rolesPath)) {
    throw "Missing roles dump: $rolesPath. Re-run with -SkipRoles if the target already has compatible roles."
  }

  $psqlArgs += @("--file", $rolesPath)
}

$psqlArgs += @(
  "--file", $schemaPath,
  "--command", "SET session_replication_role = replica",
  "--file", $dataPath,
  "--dbname", $TargetDbUrl
)

Write-Host "Restoring backup from $BackupDir"
Write-Host "Target: $TargetDbUrl"
Write-Host ""
Write-Host "This will write to the target database. Continue only if this is a test or intended cutover target."

psql @psqlArgs

Write-Host ""
Write-Host "Restore complete. Run verification queries before using this target in production."
