param(
  [Parameter(Mandatory = $true)]
  [string]$Area,
  [string]$OutputDirectory = ".cache/international"
)

$ErrorActionPreference = "Stop"
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = Resolve-Path (Join-Path $scriptDirectory "../..")
$configurationPath = Join-Path $scriptDirectory "pilot-areas.json"
$configuration = Get-Content -Raw -Encoding UTF8 $configurationPath | ConvertFrom-Json
$selectedArea = $configuration.areas | Where-Object { $_.id -eq $Area } | Select-Object -First 1

if (-not $selectedArea) {
  $validAreas = ($configuration.areas.id -join ", ")
  throw "Area no valida. Opciones: $validAreas"
}

$overtureCommand = Get-Command overturemaps -ErrorAction SilentlyContinue
if (-not $overtureCommand) {
  throw "Falta overturemaps. Instala el cliente oficial en un entorno aislado con: uv tool install overturemaps"
}

$resolvedOutputDirectory = Join-Path $repositoryRoot $OutputDirectory
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
$outputFile = Join-Path $resolvedOutputDirectory ($selectedArea.id + "-places.geojson")
$bbox = ($selectedArea.bbox -join ",")

Write-Host "Extrayendo Places para $($selectedArea.city), $($selectedArea.countryCode)..."
& $overtureCommand.Source download --bbox=$bbox --type=place -f geojson -o $outputFile

if ($LASTEXITCODE -ne 0) {
  throw "La extraccion de Overture fallo con codigo $LASTEXITCODE"
}

Write-Host "Archivo local listo: $outputFile"
Write-Host "No se ha subido ningun registro a Supabase. El siguiente paso es validar licencia, calidad y duplicados."
