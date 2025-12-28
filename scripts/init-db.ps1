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
$customersFile = Join-Path $dataDir "customers.json"

if (Test-Path $catalogNodesFile) {
    $catalogNodes = Get-Content $catalogNodesFile -Raw | ConvertFrom-Json
    $nodeCount = $catalogNodes.Count
    Write-Host "Cargados $nodeCount nodos del catalogo" -ForegroundColor Cyan
} else {
    $catalogNodes = @()
    Write-Host "No se encontro catalogNodes.json" -ForegroundColor Yellow
}

if (Test-Path $customersFile) {
    $customersArray = Get-Content $customersFile -Raw | ConvertFrom-Json
    $customerCount = $customersArray.Count
    Write-Host "Cargados $customerCount clientes" -ForegroundColor Cyan
} else {
    $customersArray = @()
    Write-Host "No se encontro customers.json" -ForegroundColor Yellow
}

# Crear estructura de la base de datos manualmente con JSON
$customersJson = Get-Content $customersFile -Raw
$catalogNodesJson = Get-Content $catalogNodesFile -Raw

# Construir el JSON manualmente para evitar problemas de PowerShell
$dbJson = @"
{
  "users": [],
  "customers": $customersJson,
  "products": [],
  "catalogNodes": $catalogNodesJson,
  "orders": [],
  "invoices": [],
  "variantConfigs": []
}
"@

# Guardar en db.json
$dbJson | Set-Content $dbFile -Encoding UTF8

# Copiar a la raíz también
$rootDbFile = "db.json"
$dbJson | Set-Content $rootDbFile -Encoding UTF8

Write-Host ""
Write-Host "Base de datos inicializada exitosamente" -ForegroundColor Green
Write-Host "Archivo: $dbFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Yellow
Write-Host "  - Nodos del catalogo: $nodeCount" -ForegroundColor White
Write-Host "  - Clientes: $customerCount" -ForegroundColor White
Write-Host ""
Write-Host "Puedes iniciar el servidor con: npm run start-servers" -ForegroundColor Cyan

