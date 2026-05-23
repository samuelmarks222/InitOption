param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDbUrl,

  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputDir = Join-Path ".backups" "supabase-$timestamp"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$rolesPath = Join-Path $OutputDir "roles.sql"
$schemaPath = Join-Path $OutputDir "schema.sql"
$dataPath = Join-Path $OutputDir "data.sql"

Write-Host "Writing Supabase logical backup to $OutputDir"
Write-Host "Dumping roles..."
npx supabase@latest db dump --db-url $SourceDbUrl -f $rolesPath --role-only

Write-Host "Dumping schema..."
npx supabase@latest db dump --db-url $SourceDbUrl -f $schemaPath

Write-Host "Dumping data..."
npx supabase@latest db dump --db-url $SourceDbUrl -f $dataPath --use-copy --data-only

Write-Host ""
Write-Host "Backup complete:"
Write-Host "  $rolesPath"
Write-Host "  $schemaPath"
Write-Host "  $dataPath"
Write-Host ""
Write-Host "Keep these files private. They contain production schema/data."
