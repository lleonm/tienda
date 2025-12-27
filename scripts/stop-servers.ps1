# Script para parar todos los servidores de desarrollo y cerrar ventanas PowerShell

Write-Host "Parando servidores de desarrollo y cerrando ventanas..." -ForegroundColor Red

$windowsClosed = 0

# Buscar procesos Node.js en los puertos 3000 y 3001 y cerrar sus ventanas PowerShell padres
Write-Host "Buscando servidores y sus ventanas..." -ForegroundColor Yellow

$processes = netstat -ano | Select-String ":300[01]\s"
foreach ($line in $processes) {
    if ($line -match '\s+(\d+)\s*$') {
        $nodeProcessId = $matches[1]
        try {
            # Obtener el proceso padre (PowerShell)
            $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$nodeProcessId" -ErrorAction SilentlyContinue).ParentProcessId
            if ($parentId) {
                $parentProcess = Get-Process -Id $parentId -ErrorAction SilentlyContinue
                if ($parentProcess -and $parentProcess.ProcessName -eq "powershell") {
                    Write-Host "   Cerrando ventana PowerShell (PID: $parentId)" -ForegroundColor Cyan
                    Stop-Process -Id $parentId -Force -ErrorAction SilentlyContinue
                    $windowsClosed++
                }
            }
            # También matar el proceso node
            Stop-Process -Id $nodeProcessId -Force -ErrorAction SilentlyContinue
        }
        catch {
            # Continuar
        }
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
