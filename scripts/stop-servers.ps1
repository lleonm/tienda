# Script para parar todos los servidores de desarrollo y cerrar ventanas PowerShell

Write-Host "Parando servidores de desarrollo y cerrando ventanas..." -ForegroundColor Red

$windowsClosed = 0

# Buscar procesos Node.js en los puertos 3000 y 3001 y cerrar sus ventanas PowerShell padres
Write-Host "Buscando servidores y sus ventanas..." -ForegroundColor Yellow

# Buscar todas las ventanas PowerShell
$allPowershellProcesses = Get-Process powershell -ErrorAction SilentlyContinue

foreach ($process in $allPowershellProcesses) {
    try {
        # Usar WMI para obtener información de línea de comandos
        $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)" -ErrorAction SilentlyContinue).CommandLine
        
        if ($commandLine) {
            # Verificar si la línea de comandos contiene comandos relacionados a nuestros servidores
            if ($commandLine -like "*json-server*" -or 
                $commandLine -like "*npm run dev*" -or
                $commandLine -like "*next dev*" -or
                $commandLine -like "*puerto 3000*" -or
                $commandLine -like "*puerto 3001*") {
                
                Write-Host "   Cerrando ventana con comando: $($commandLine.Substring(0, [Math]::Min(60, $commandLine.Length)))..." -ForegroundColor Cyan
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-Host "   Ventana cerrada (PID: $($process.Id))" -ForegroundColor Green
            }
        }
    }
    catch {
        # Continuar si no se puede acceder a algún proceso
    }
}

if ($windowsClosed -eq 0) {
    Write-Host "   No se encontraron ventanas de servidores" -ForegroundColor Gray
} else {
    Write-Host "   $windowsClosed ventana(s) cerrada(s)" -ForegroundColor Green
}

# Asegurar que los puertos estén libres
Write-Host "`nLiberando puertos..." -ForegroundColor Yellow
$port3000 = netstat -ano | Select-String ":3000\s"
foreach ($line in $port3000) {
    if ($line -match '\s+(\d+)\s*$') {
        Stop-Process -Id $matches[1] -Force -ErrorAction SilentlyContinue
    }
}

$port3001 = netstat -ano | Select-String ":3001\s"
foreach ($line in $port3001) {
    if ($line -match '\s+(\d+)\s*$') {
        Stop-Process -Id $matches[1] -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   Puertos liberados" -ForegroundColor Green

Write-Host "`nTodos los servidores y ventanas han sido cerrados" -ForegroundColor Green
Write-Host "Para iniciar nuevamente usa: npm run start-servers" -ForegroundColor Cyan
