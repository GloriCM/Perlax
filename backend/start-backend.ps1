Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Perlax ERP - Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El servidor se reiniciara automaticamente si se cae." -ForegroundColor Yellow
Write-Host "Para detenerlo manualmente presione Ctrl+C." -ForegroundColor Yellow
Write-Host ""

$restartCount = 0

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
        dotnet run --project src/Host/Perlax.Web/Perlax.Web.csproj --no-launch-profile
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Servidor detenido." -ForegroundColor Red
}
