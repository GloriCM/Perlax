Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Perlax ERP - Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El servidor se reiniciara automaticamente si se cae." -ForegroundColor Yellow
Write-Host "Para detenerlo manualmente presione Ctrl+C." -ForegroundColor Yellow
Write-Host ""

$restartCount = 0
$env:ASPNETCORE_ENVIRONMENT = "Development"
if ($env:KESTREL_PFX_PASSWORD) {
    $env:Kestrel__Endpoints__Https__Certificate__Password = $env:KESTREL_PFX_PASSWORD
}

function Stop-PerlaxWebHostProcesses {
    Get-Process -Name 'dotnet' -ErrorAction SilentlyContinue | ForEach-Object {
        $procId = $_.Id
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -and $cmdLine -like '*Perlax.Web*') {
                Write-Host "  Cerrando proceso previo que bloquea la compilacion (dotnet PID $procId)..." -ForegroundColor DarkYellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
        catch { }
    }
    Start-Sleep -Milliseconds 1200
}

while ($true) {
    $restartCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    if ($restartCount -eq 1) {
        Write-Host "[$timestamp] Iniciando servidor backend..." -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "[$timestamp] El servidor se detuvo. Reiniciando automaticamente... (intento #$restartCount)" -ForegroundColor Red
        Write-Host "Esperando 3 segundos antes de reiniciar..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    
    try {
        Stop-PerlaxWebHostProcesses
        dotnet run --project src/Host/Perlax.Web/Perlax.Web.csproj --no-launch-profile
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Servidor detenido." -ForegroundColor Red
}
