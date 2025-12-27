# Script para inicializar la base de datos con datos de ejemplo

Write-Host "Inicializando base de datos..." -ForegroundColor Green

# Ruta de archivos
$dataDir = "data"
$dbFile = Join-Path $dataDir "db.json"

# Verificar si el directorio existe
if (-not (Test-Path $dataDir)) {
    Write-Host "Error: No se encuentra el directorio data" -ForegroundColor Red
    exit 1
}

# Leer datos de cada archivo JSON
$catalogNodesFile = Join-Path $dataDir "catalogNodes.json"

if (Test-Path $catalogNodesFile) {
    $catalogNodes = Get-Content $catalogNodesFile -Raw | ConvertFrom-Json
    $nodeCount = $catalogNodes.Count
    Write-Host "Cargados $nodeCount nodos del catalogo" -ForegroundColor Cyan
} else {
    $catalogNodes = @()
    Write-Host "No se encontro catalogNodes.json" -ForegroundColor Yellow
}

# Crear estructura de la base de datos
$database = @{
    users = @()
    customers = @()
    products = @()
    catalogNodes = $catalogNodes
    orders = @()
    invoices = @()
    variantConfigs = @()
}

# Guardar en db.json
$database | ConvertTo-Json -Depth 10 | Set-Content $dbFile

Write-Host ""
Write-Host "Base de datos inicializada exitosamente" -ForegroundColor Green
Write-Host "Archivo: $dbFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Yellow
Write-Host "  - Nodos del catalogo: $nodeCount" -ForegroundColor White
Write-Host ""
Write-Host "Puedes iniciar el servidor con: npm run start-servers" -ForegroundColor Cyan

