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

# Perfil de usuario con cuota llena: redirigir Temp/NuGet/AppData a E:\Semillas
$dotnetCache = "E:\Semillas\.dotnet-cache"
New-Item -ItemType Directory -Force -Path `
    "$dotnetCache\temp", `
    "$dotnetCache\nuget", `
    "$dotnetCache\cli", `
    "$dotnetCache\localappdata", `
    "$dotnetCache\appdata\NuGet" | Out-Null

$srcNuget = Join-Path $env:USERPROFILE "AppData\Roaming\NuGet\NuGet.Config"
if (Test-Path $srcNuget) {
    Copy-Item $srcNuget "$dotnetCache\appdata\NuGet\NuGet.Config" -Force -ErrorAction SilentlyContinue
}

$env:TEMP = "$dotnetCache\temp"
$env:TMP = "$dotnetCache\temp"
$env:NUGET_PACKAGES = "$dotnetCache\nuget"
$env:DOTNET_CLI_HOME = "$dotnetCache\cli"
$env:LOCALAPPDATA = "$dotnetCache\localappdata"
$env:APPDATA = "$dotnetCache\appdata"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"

$project = Join-Path $PSScriptRoot "src/Host/Perlax.Web/Perlax.Web.csproj"
$localSettings = Join-Path $PSScriptRoot "src/Host/Perlax.Web/appsettings.Development.local.json"
$logFile = Join-Path $PSScriptRoot "server_log.txt"

if (-not (Test-Path $localSettings)) {
    Write-Host "AVISO: Cree appsettings.Development.local.json desde appsettings.Development.example.json" -ForegroundColor Yellow
}
if ($env:KESTREL_PFX_PASSWORD) {
    $env:Kestrel__Endpoints__Https__Certificate__Password = $env:KESTREL_PFX_PASSWORD
}
elseif (-not $env:Kestrel__Endpoints__Https__Certificate__Password) {
    $frontendEnv = Join-Path (Split-Path $PSScriptRoot -Parent) "frontend/.env.local"
    if (Test-Path $frontendEnv) {
        $match = Select-String -Path $frontendEnv -Pattern '^\s*VITE_DEV_CERT_PASS\s*=\s*(.+)\s*$' | Select-Object -First 1
        if ($match -and $match.Matches.Groups[1].Value.Trim()) {
            $env:Kestrel__Endpoints__Https__Certificate__Password = $match.Matches.Groups[1].Value.Trim()
        }
    }
}

if (-not $env:Kestrel__Endpoints__Https__Certificate__Password) {
    Write-Host "AVISO: Falta VITE_DEV_CERT_PASS en frontend/.env.local (clave del perla.pfx)." -ForegroundColor Yellow
}

function Stop-PerlaxWebHostProcesses {
    Get-Process -Name 'Perlax.Web' -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  Cerrando Perlax.Web (PID $($_.Id))..." -ForegroundColor DarkYellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Get-Process -Name 'dotnet' -ErrorAction SilentlyContinue | ForEach-Object {
        $procId = $_.Id
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue).CommandLine
            # Solo matar hosts en ejecucion, no workers genericos de MSBuild
            if ($cmdLine -and (
                    $cmdLine -like '*Perlax.Web.dll*' -or
                    $cmdLine -like '*run --project*Perlax.Web*' -or
                    $cmdLine -like '*run --project*Perlax.Web.csproj*'
                )) {
                Write-Host "  Cerrando host previo (dotnet PID $procId)..." -ForegroundColor DarkYellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
        catch { }
    }

    # Liberar puertos si quedo un proceso huerfano (causa del bucle "address already in use")
    foreach ($port in 5262, 5263) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            $owner = $_.OwningProcess
            if ($owner -gt 0) {
                $name = (Get-Process -Id $owner -ErrorAction SilentlyContinue).ProcessName
                Write-Host "  Liberando puerto $port (PID $owner / $name)..." -ForegroundColor DarkYellow
                Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Milliseconds 1500
}

# Compilar una vez fuera del bucle para ver errores reales
Write-Host "Compilando backend (una vez)..." -ForegroundColor Green
Stop-PerlaxWebHostProcesses
$buildLog = Join-Path $PSScriptRoot "build_log.txt"
& dotnet build $project -v minimal 2>&1 | Tee-Object -FilePath $buildLog
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FALLO. Revise build_log.txt. No se inicia el bucle." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "Build OK. Iniciando host con --no-build..." -ForegroundColor Green
Write-Host "Log en vivo tambien en: $logFile" -ForegroundColor DarkGray
Write-Host ""

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
        # --no-build evita recompilar (y fallar) por cuota del perfil en cada reinicio
        & dotnet run --project $project --no-launch-profile --no-build 2>&1 |
            Tee-Object -FilePath $logFile -Append
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        $_ | Out-File -FilePath $logFile -Append
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Servidor detenido." -ForegroundColor Red
}
