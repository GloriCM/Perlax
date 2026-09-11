# Solo apaga backend Perlax (5262/5263). NO toca 5144 (Tiempo de procesos).
$ErrorActionPreference = 'Continue'
Write-Host 'Revisando puertos y procesos Perlax...' -ForegroundColor Cyan

function Show-Port($port) {
    $rows = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $rows) {
        Write-Host "  Puerto ${port}: libre"
        return
    }
    foreach ($r in $rows) {
        $p = Get-Process -Id $r.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  Puerto ${port}: PID $($r.OwningProcess) ($($p.ProcessName))"
    }
}

Write-Host 'ANTES:'
Show-Port 5262
Show-Port 5263
Show-Port 5144

Write-Host ''
Write-Host 'Cerrando solo Perlax...' -ForegroundColor Yellow

Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*start-backend.ps1*' } |
    ForEach-Object {
        Write-Host "  Stop start-backend script PID $($_.ProcessId)"
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

Get-Process -Name 'Perlax.Web' -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Stop Perlax.Web PID $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Get-Process -Name 'dotnet' -ErrorAction SilentlyContinue | ForEach-Object {
    $id = $_.Id
    $cmd = $null
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue).CommandLine
    } catch {}
    if ($cmd -and (
            $cmd -like '*Perlax.Web*' -or
            $cmd -like '*\Perlax\backend\*' -or
            $cmd -like '*Semillas\Perlax\backend*'
        ) -and $cmd -notlike '*5144*') {
        Write-Host "  Stop dotnet PID $id"
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
}

foreach ($port in 5262, 5263) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.OwningProcess -gt 0) {
            $name = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName
            Write-Host "  Liberando $port PID $($_.OwningProcess) ($name)"
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 2
Write-Host ''
Write-Host 'DESPUES:' -ForegroundColor Green
Show-Port 5262
Show-Port 5263
Show-Port 5144
Write-Host ''
Write-Host 'Listo. Si 5262/5263 estan libres, ejecuta UNA sola vez start-backend.ps1' -ForegroundColor Cyan
