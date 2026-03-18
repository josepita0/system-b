$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$excludedDirectories = @(
  "\node_modules\",
  "\dist\",
  "\dist-electron\",
  "\.git\"
)

$sensitiveFileNames = @(
  "app.key",
  "current-session.json",
  "initial-admin-access.json"
)

$sensitiveFilePatterns = @(
  "*.db",
  "*.db-*",
  "*.sqlite",
  "*.sqlite-*",
  "*.sqlite3",
  "*.sqlite3-*",
  ".env",
  ".env.*"
)

function IsExcludedFile([string]$path) {
  foreach ($directory in $excludedDirectories) {
    if ($path -like "*$directory*") {
      return $true
    }
  }

  return $false
}

function GetTrackedAreaFiles {
  Get-ChildItem -Path $workspaceRoot -Recurse -File | Where-Object {
    -not (IsExcludedFile $_.FullName)
  }
}

$files = GetTrackedAreaFiles

$matchedSensitiveFiles = foreach ($file in $files) {
  if ($sensitiveFileNames -contains $file.Name) {
    $file.FullName
    continue
  }

  foreach ($pattern in $sensitiveFilePatterns) {
    if ($file.Name -like $pattern) {
      $file.FullName
      break
    }
  }
}

$projectDataDir = Join-Path $workspaceRoot ".data"
$envDataDir = [Environment]::GetEnvironmentVariable("SYSTEM_BARRA_DATA_DIR")
$dataDirInsideWorkspace = $false

if ($envDataDir) {
  $normalizedWorkspace = [IO.Path]::GetFullPath($workspaceRoot)
  $normalizedDataDir = [IO.Path]::GetFullPath($envDataDir)
  $dataDirInsideWorkspace = $normalizedDataDir.StartsWith($normalizedWorkspace, [System.StringComparison]::OrdinalIgnoreCase)
}

$generatedDirsPresent = @()
foreach ($directoryName in @("dist", "dist-electron", "node_modules")) {
  $directoryPath = Join-Path $workspaceRoot $directoryName
  if (Test-Path $directoryPath) {
    $generatedDirsPresent += $directoryName
  }
}

Write-Host "Preflight GitHub - Sistema Barra"
Write-Host "Workspace: $workspaceRoot"
Write-Host ""

if ($matchedSensitiveFiles) {
  Write-Host "Archivos sensibles encontrados en el arbol versionable:" -ForegroundColor Yellow
  $matchedSensitiveFiles | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "No se encontraron bases, llaves, sesiones ni .env en el arbol versionable." -ForegroundColor Green
}

if ($generatedDirsPresent.Count -gt 0) {
  Write-Host ""
  Write-Host "Artefactos locales presentes y cubiertos por .gitignore:" -ForegroundColor Cyan
  $generatedDirsPresent | ForEach-Object { Write-Host " - $_/" }
}

if ($envDataDir) {
  Write-Host ""
  Write-Host "SYSTEM_BARRA_DATA_DIR actual: $envDataDir"
  if ($dataDirInsideWorkspace) {
    Write-Host "Advertencia: SYSTEM_BARRA_DATA_DIR apunta dentro del workspace." -ForegroundColor Yellow
  } else {
    Write-Host "SYSTEM_BARRA_DATA_DIR apunta fuera del workspace." -ForegroundColor Green
  }
} else {
  Write-Host ""
  Write-Host "SYSTEM_BARRA_DATA_DIR no esta definido en el entorno actual."
  Write-Host "La app usara una ruta local segun el runtime de Electron o process.cwd() en ejecuciones no empaquetadas."
}

if ($matchedSensitiveFiles -or $dataDirInsideWorkspace) {
  exit 1
}

exit 0
