# Script para iniciar servidores de desarrollo
# Ejecuta JSON Server y Next.js en ventanas separadas

Write-Host "Iniciando entorno de desarrollo Tienda Online..." -ForegroundColor Yellow
Write-Host "Verificando puertos..." -ForegroundColor Gray

# Verificar si los puertos están en uso
$port3000InUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port3001InUse = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($port3000InUse -or $port3001InUse) {
    Write-Host "Detectados servidores ejecutandose. Limpiando puertos..." -ForegroundColor Yellow
    
    # Liberar puerto 3000 (Next.js)
    if ($port3000InUse) {
        $process3000 = Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -ErrorAction SilentlyContinue
        if ($process3000) {
            Stop-Process -Id $process3000.Id -Force
            Write-Host "Puerto 3000 liberado" -ForegroundColor Green
        }
    }
    
    # Liberar puerto 3001 (JSON Server)
    if ($port3001InUse) {
        $process3001 = Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -ErrorAction SilentlyContinue
        if ($process3001) {
            Stop-Process -Id $process3001.Id -Force
            Write-Host "Puerto 3001 liberado" -ForegroundColor Green
        }
    }
    
    Start-Sleep -Seconds 2
}

# Cambiar al directorio del proyecto
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -Path $projectRoot

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Error: node_modules no encontrado. Ejecuta 'npm install' primero." -ForegroundColor Red
    exit 1
}

Write-Host "Iniciando servidores..." -ForegroundColor Green

# Iniciar Next.js en ventana separada (puerto 3000)
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot'; Write-Host 'Tienda Online - Next.js (Puerto 3000)' -ForegroundColor Green; npm run dev"

# Esperar un momento antes de iniciar JSON Server
Start-Sleep -Seconds 3

# Iniciar JSON Server en ventana separada (puerto 3001)
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot'; Write-Host 'Tienda Online - JSON Server (Puerto 3001)' -ForegroundColor Blue; npm run json-server"

Write-Host "`nServidores iniciandose en ventanas separadas..." -ForegroundColor Green
Write-Host "URLs disponibles:" -ForegroundColor Cyan
Write-Host "   Aplicacion:     http://localhost:3000" -ForegroundColor Green
Write-Host "   API:            http://localhost:3001" -ForegroundColor Blue
Write-Host "   Admin Panel:    http://localhost:3000/admin" -ForegroundColor Magenta

Write-Host "`nComandos utiles:" -ForegroundColor Yellow
Write-Host "   npm run stop-servers  - Parar todos los servidores" -ForegroundColor Gray
Write-Host "   npm run start-servers - Reiniciar servidores" -ForegroundColor Gray

Write-Host "`nEntorno listo para desarrollo!" -ForegroundColor Green -BackgroundColor Black
