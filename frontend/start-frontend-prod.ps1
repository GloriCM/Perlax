Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Perlax ERP - Frontend (produccion)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sirve el build de Vite (dist/) en el puerto 5173." -ForegroundColor Yellow
Write-Host "Use este script para perlax.perla.work via tunel Cloudflare." -ForegroundColor Yellow
Write-Host "NO use npm run dev en produccion: causa pantalla en blanco fuera del servidor." -ForegroundColor Yellow
Write-Host ""

function Stop-ViteOnPort5173 {
    $port = 5173
    $pids = @()

    try {
        $pids += Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch { }

    Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
        $procId = $_.Id
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -and $cmdLine -like '*\frontend\*' -and $cmdLine -like '*vite*') {
                $pids += $procId
            }
        } catch { }
    }

    foreach ($procId in ($pids | Select-Object -Unique)) {
        if (-not $procId) { continue }
        Write-Host "  Cerrando proceso en puerto $port (PID $procId)..." -ForegroundColor DarkYellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 1200
}

$frontendRoot = $PSScriptRoot
$envFile = Join-Path $frontendRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "AVISO: Cree frontend/.env.local desde .env.example" -ForegroundColor Yellow
}

Set-Location $frontendRoot

Write-Host "Liberando puerto 5173 si esta ocupado..." -ForegroundColor Green
Stop-ViteOnPort5173

Write-Host "Generando build de produccion..." -ForegroundColor Green
node scripts/ensure-utf8.cjs
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fallido. Corrija errores antes de continuar." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Iniciando vite preview en https://0.0.0.0:5173 ..." -ForegroundColor Green
Write-Host "Detener con Ctrl+C." -ForegroundColor Yellow
Write-Host ""

npm run preview -- --host