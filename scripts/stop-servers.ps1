# Script para detener todos los servidores de la aplicacion
Write-Host "Deteniendo servidores de la Tienda Online..." -ForegroundColor Red
Write-Host ""

# Detener procesos de Node que estan usando los puertos 3000 y 3001
$stoppedProcesses = 0

# Buscar y detener proceso en puerto 3001 (JSON Server)
Write-Host "Buscando JSON Server (Puerto 3001)..." -ForegroundColor Cyan
$jsonServerProcess = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($jsonServerProcess) {
    foreach ($pid in $jsonServerProcess) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pid -Force
            Write-Host "  JSON Server detenido (PID: $pid)" -ForegroundColor Green
            $stoppedProcesses++
        }
    }
} else {
    Write-Host "  JSON Server no esta ejecutandose" -ForegroundColor Gray
}

# Buscar y detener proceso en puerto 3000 (Next.js)
Write-Host "Buscando Next.js Server (Puerto 3000)..." -ForegroundColor Cyan
$nextProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($nextProcess) {
    foreach ($pid in $nextProcess) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pid -Force
            Write-Host "  Next.js Server detenido (PID: $pid)" -ForegroundColor Green
            $stoppedProcesses++
        }
    }
} else {
    Write-Host "  Next.js Server no esta ejecutandose" -ForegroundColor Gray
}

Write-Host ""
if ($stoppedProcesses -gt 0) {
    Write-Host "Se detuvieron $stoppedProcesses proceso(s)" -ForegroundColor Green
} else {
    Write-Host "No habia servidores ejecutandose" -ForegroundColor Yellow
}
