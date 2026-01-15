# Limpiar headers del CSV para Supabase
# Sin emojis para evitar errores

$inputFile = "C:\Users\juanpablo\OneDrive\Escritorio\Base de DAtos 1\Empresarial AAA AA A y B.csv"
$outputFile = "C:\Users\juanpablo\OneDrive\Escritorio\Base de DAtos 1\Empresarial_LIMPIO.csv"

Write-Host "Leyendo CSV original..."

# Leer primera línea
$firstLine = Get-Content $inputFile -TotalCount 1 -Encoding UTF8

Write-Host "Headers originales: $firstLine"

# Limpiar headers
$cleanHeaders = $firstLine -replace 'ñ', 'n' -replace 'Ñ', 'N' -replace 'á', 'a' -replace 'é', 'e' -replace 'í', 'i' -replace 'ó', 'o' -replace 'ú', 'u' -replace 'Á', 'A' -replace 'É', 'E' -replace 'Í', 'I' -replace 'Ó', 'O' -replace 'Ú', 'U' -replace ' ', '_'

Write-Host "Headers limpios: $cleanHeaders"

# Escribir nuevo archivo
Set-Content -Path $outputFile -Value $cleanHeaders -Encoding UTF8

# Copiar resto de líneas
Get-Content $inputFile -Encoding UTF8 | Select-Object -Skip 1 | Add-Content -Path $outputFile -Encoding UTF8

Write-Host "LISTO! Archivo creado: $outputFile"
Write-Host "Tamano: $((Get-Item $outputFile).Length / 1MB) MB"
