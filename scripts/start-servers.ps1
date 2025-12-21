# Script para iniciar todos los servidores de la aplicacion
Write-Host "Iniciando servidores de la Tienda Online..." -ForegroundColor Green
Write-Host ""

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Error: node_modules no encontrado. Ejecuta 'npm install' primero." -ForegroundColor Red
    exit 1
}

# Iniciar JSON Server en una nueva ventana
Write-Host "Iniciando JSON Server (Puerto 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run json-server"

# Esperar un momento para que JSON Server inicie
Start-Sleep -Seconds 2

# Iniciar Next.js en una nueva ventana
Write-Host "Iniciando Next.js Dev Server (Puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "Servidores iniciados exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Aplicacion: http://localhost:3000" -ForegroundColor Yellow
Write-Host "API: http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener los servidores, ejecuta: npm run stop-servers" -ForegroundColor Magenta
