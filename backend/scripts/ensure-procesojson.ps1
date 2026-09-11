$ErrorActionPreference = 'Stop'
$settingsPath = Join-Path $PSScriptRoot '..\src\Host\Perlax.Web\appsettings.Development.local.json'
if (-not (Test-Path $settingsPath)) {
    Write-Error "No existe appsettings.Development.local.json"
    exit 1
}

$raw = Get-Content -Raw -Path $settingsPath
$cs = [regex]::Match($raw, '"ProductionConnection"\s*:\s*"([^"]+)"').Groups[1].Value
if (-not $cs) {
    Write-Error "No se encontro ProductionConnection"
    exit 1
}

$hostName = [regex]::Match($cs, 'Host=([^;]+)').Groups[1].Value
$dbName = [regex]::Match($cs, 'Database=([^;]+)').Groups[1].Value
$userName = [regex]::Match($cs, 'Username=([^;]+)').Groups[1].Value
$password = [regex]::Match($cs, 'Password=([^;]+)').Groups[1].Value

Write-Host "Aplicando columna ProcesoJson en $dbName@$hostName ..."

$psql = $null
foreach ($candidate in @(
    'psql',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe',
    'C:\Program Files\PostgreSQL\15\bin\psql.exe',
    'C:\Program Files\PostgreSQL\14\bin\psql.exe'
)) {
    if ($candidate -eq 'psql') {
        $cmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($cmd) { $psql = $cmd.Source; break }
    } elseif (Test-Path $candidate) {
        $psql = $candidate
        break
    }
}

$sql = @'
ALTER TABLE IF EXISTS production."DesignPlannerJobs"
ADD COLUMN IF NOT EXISTS "Accion" character varying(4000) NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS production."DesignPlannerJobs"
ADD COLUMN IF NOT EXISTS "ProcesoJson" text NOT NULL DEFAULT (chr(123) || chr(125));
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'production' AND table_name = 'DesignPlannerJobs'
  AND column_name IN ('Accion', 'ProcesoJson')
ORDER BY column_name;
'@

if ($psql) {
    $env:PGPASSWORD = $password
    & $psql -h $hostName -U $userName -d $dbName -v ON_ERROR_STOP=1 -c $sql
    $code = $LASTEXITCODE
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    exit $code
}

Write-Host "psql no encontrado, usando Npgsql.dll"
$npgsql = Get-ChildItem -Path 'E:\Semillas\.dotnet-cache\nuget\npgsql' -Recurse -Filter 'Npgsql.dll' |
    Where-Object { $_.FullName -match '\\lib\\net8.0\\Npgsql.dll$' -or $_.FullName -match '\\lib\\net9.0\\Npgsql.dll$' } |
    Select-Object -First 1
if (-not $npgsql) {
    Write-Error "No se encontro Npgsql.dll ni psql"
    exit 1
}

Add-Type -Path $npgsql.FullName
$conn = New-Object Npgsql.NpgsqlConnection($cs)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("OK columna: " + $reader.GetString(0))
}
$reader.Close()
$conn.Close()
Write-Host "Columna ProcesoJson aplicada."
