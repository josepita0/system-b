<#
.SYNOPSIS
  Copia la carpeta data de Sistema Barra (SQLite, catalog-media, app.key u otros archivos bajo data) a un destino de backup.

.DESCRIPTION
  Por defecto intenta localizar userData de Electron para el productName "Sistema Barra".
  Alternativa: definir la variable de entorno SYSTEM_BARRA_DATA_DIR apuntando directamente
  a la carpeta que contiene system-barra.sqlite (modo dev o override).

.PARAMETER Destination
  Carpeta donde se creara la copia (se agrega subcarpeta con timestamp).

.PARAMETER DataDir
  Ruta explicita a la carpeta "data" (con system-barra.sqlite dentro). Si se omite, se usa
  $env:SYSTEM_BARRA_DATA_DIR o se deduce desde AppData.
#>
param(
  [Parameter(Mandatory = $false)]
  [string] $Destination = "",

  [Parameter(Mandatory = $false)]
  [string] $DataDir = ""
)

$ErrorActionPreference = "Stop"

function Resolve-DataDir {
  if ($DataDir -and (Test-Path $DataDir)) {
    return (Resolve-Path $DataDir).Path
  }
  $fromEnv = $env:SYSTEM_BARRA_DATA_DIR
  if ($fromEnv -and (Test-Path $fromEnv)) {
    return (Resolve-Path $fromEnv).Path
  }
  $appdata = [Environment]::GetFolderPath("ApplicationData")
  $candidate = Join-Path $appdata "Sistema Barra" "data"
  if (Test-Path $candidate) {
    return (Resolve-Path $candidate).Path
  }
  throw "No se encontro la carpeta data. Pase -DataDir o defina SYSTEM_BARRA_DATA_DIR. Esperado: ...\Sistema Barra\data"
}

$src = Resolve-DataDir
$db = Join-Path $src "system-barra.sqlite"
if (-not (Test-Path $db)) {
  throw "No se encontro system-barra.sqlite en $src"
}

$destRoot = if ($Destination) {
  if (-not (Test-Path $Destination)) {
    New-Item -ItemType Directory -Path $Destination | Out-Null
  }
  (Resolve-Path $Destination).Path
} else {
  $fallback = Join-Path $PSScriptRoot ".." "backup-export"
  if (-not (Test-Path $fallback)) {
    New-Item -ItemType Directory -Path $fallback -Force | Out-Null
  }
  (Resolve-Path $fallback).Path
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $destRoot "system-barra-data-$stamp"
New-Item -ItemType Directory -Path $target | Out-Null

Copy-Item -Path (Join-Path $src "*") -Destination $target -Recurse -Force

Write-Host "Backup copiado desde:`n  $src`n`na:`n  $target"
