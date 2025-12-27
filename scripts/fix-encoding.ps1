# Script para limpiar caracteres mal codificados en db.json
# Usa regex para evitar problemas de encoding en el script

Write-Host "Limpiando caracteres mal codificados en db.json..." -ForegroundColor Yellow

# Leer el archivo
$content = Get-Content "$PSScriptRoot\..\db.json" -Raw -Encoding UTF8

# Correcciones con regex - caracteres comunes mal codificados
$content = $content -replace '\xC3\xA1', 'a'  # á mal codificado
$content = $content -replace '\xC3\xA9', 'e'  # é mal codificado  
$content = $content -replace '\xC3\xAD', 'i'  # í mal codificado
$content = $content -replace '\xC3\xB3', 'o'  # ó mal codificado
$content = $content -replace '\xC3\xBA', 'u'  # ú mal codificado
$content = $content -replace '\xC3\xB1', 'n'  # ñ mal codificado
$content = $content -replace '\xC3\x81', 'A'  # Á mal codificado
$content = $content -replace '\xC3\x89', 'E'  # É mal codificado
$content = $content -replace '\xC3\x93', 'O'  # Ó mal codificado
$content = $content -replace '\xC3\x9A', 'U'  # Ú mal codificado
$content = $content -replace '\xC3\x91', 'N'  # Ñ mal codificado

# Limpiar caracteres basura comunes
$content = $content -replace '\xC2\xA0', ' '  # Non-breaking space
$content = $content -replace '\xC3\x83', ''   # Basura común
$content = $content -replace '\xC3\x86', ''   # Basura común
$content = $content -replace '\xC3\x82', ''   # Basura común
$content = $content -replace '\xC2', ''       # Basura común

# Guardar con UTF-8 sin BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PSScriptRoot\..\db.json", $content, $utf8NoBom)

Write-Host "Caracteres corregidos exitosamente" -ForegroundColor Green
Write-Host "Recuerda reiniciar json-server" -ForegroundColor Cyan
