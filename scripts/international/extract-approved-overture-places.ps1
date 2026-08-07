param(
  [Parameter(Mandatory = $true)]
  [string]$Area,
  [string]$OutputDirectory = ".cache/international"
)

$ErrorActionPreference = "Stop"
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$rolloutPath = Join-Path $scriptDirectory "expansion-markets.json"
$rollout = Get-Content -Raw -Encoding UTF8 $rolloutPath | ConvertFrom-Json
$market = $rollout.markets | Where-Object { $_.id -eq $Area } | Select-Object -First 1

if (-not $market) {
  throw "Mercado desconocido: $Area"
}

if (-not $market.extractionEnabled) {
  throw "Extraccion bloqueada para $Area. Aprueba primero el mercado en expansion-markets.json."
}

if ($market.status -notin @("planned", "extracting", "qa", "preview", "active", "paused")) {
  throw "El estado $($market.status) no permite extraccion para $Area."
}

Write-Host "Mercado aprobado: $($market.city), $($market.countryCode)"
Write-Host "Estado: $($market.status) | Lote maximo aprobado: $($market.nextTargetRecords)"

$extractor = Join-Path $scriptDirectory "extract-overture-places.ps1"
& $extractor -Area $Area -OutputDirectory $OutputDirectory

if ($LASTEXITCODE -ne 0) {
  throw "La extraccion aprobada fallo con codigo $LASTEXITCODE"
}
