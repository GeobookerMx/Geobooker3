# Script PowerShell para limpiar headers del CSV y preparar para importación masiva
# Ejecutar: .\scripts\clean_csv_and_import.ps1

Write-Host "🧹 Iniciando limpieza de CSV para importación masiva..." -ForegroundColor Cyan

# Configuración
$sourceFile = "C:\Users\juanpablo\OneDrive\Escritorio\Base de DAtos 1\Empresarial AAA AA A y B.csv"
$cleanedFile = "C:\Users\juanpablo\Geobooker3\data\cleaned_contacts.csv"

# Verificar que existe el archivo
if (-not (Test-Path $sourceFile)) {
    Write-Host "❌ ERROR: No se encuentra el archivo CSV en: $sourceFile" -ForegroundColor Red
    Write-Host "Por favor verifica la ruta del archivo." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo encontrado: $sourceFile" -ForegroundColor Green
$fileInfo = Get-Item $sourceFile
Write-Host "   Tamaño: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray

# Crear directorio data si no existe
$dataDir = "C:\Users\juanpablo\Geobooker3\data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "📁 Directorio creado: $dataDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Leyendo archivo..." -ForegroundColor Cyan

# Leer el archivo completo
try {
    $content = Get-Content $sourceFile -Encoding UTF8 -Raw
    
    # Obtener primera línea (header)
    $lines = $content -split "`n"
    $header = $lines[0].Trim()
    
    Write-Host "   Header original: $header" -ForegroundColor Gray
    
    # Limpiar header
    $cleanHeader = $header `
        -replace '[\s]+', '_' `
        -replace '[áàäâ]', 'a' `
        -replace '[éèëê]', 'e' `
        -replace '[íìïî]', 'i' `
        -replace '[óòöô]', 'o' `
        -replace '[úùüû]', 'u' `
        -replace '[ñ]', 'n' `
        -replace '[ÁÀÄÂ]', 'A' `
        -replace '[ÉÈËÊ]', 'E' `
        -replace '[ÍÌÏÎ]', 'I' `
        -replace '[ÓÒÖÔ]', 'O' `
        -replace '[ÚÙÜÛ]', 'U' `
        -replace '[Ñ]', 'N' `
        -replace '[^a-zA-Z0-9_,]', ''
    
    Write-Host "   Header limpio:   $cleanHeader" -ForegroundColor Green
    Write-Host ""
    
    # Contar líneas totales
    $totalLines = $lines.Count - 1  # Sin contar header
    Write-Host "📊 Total de registros: $($totalLines.ToString('N0'))" -ForegroundColor Cyan
    
    # Crear nuevo archivo con header limpio
    Write-Host ""
    Write-Host "💾 Creando archivo limpio..." -ForegroundColor Cyan
    
    # Escribir header limpio
    $cleanHeader | Out-File $cleanedFile -Encoding UTF8
    
    # Copiar el resto del contenido
    $lines[1..($lines.Count - 1)] | Out-File $cleanedFile -Encoding UTF8 -Append
    
    Write-Host "✅ Archivo limpio creado: $cleanedFile" -ForegroundColor Green
    $cleanFileInfo = Get-Item $cleanedFile
    Write-Host "   Tamaño: $([math]::Round($cleanFileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "🎯 SIGUIENTE PASO:" -ForegroundColor Yellow
    Write-Host "   1. Abre pgAdmin o Supabase SQL Editor" -ForegroundColor White
    Write-Host "   2. Ejecuta el script: supabase/import_contacts_batch.sql" -ForegroundColor White
    Write-Host "   3. Sigue las instrucciones en el script para importar por lotes" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Archivo listo para importar:" -ForegroundColor Cyan
    Write-Host "   $cleanedFile" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ Limpieza completada exitosamente!" -ForegroundColor Green
    
}
catch {
    Write-Host "❌ ERROR durante la limpieza:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
