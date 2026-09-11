$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root 'ensure-proceso-result.txt'
$sqlFile = Join-Path $root 'ensure-design-planner-proceso.sql'
$cfgPath = Join-Path $root 'src\Host\Perlax.Web\appsettings.Development.local.json'

function Get-ConnPart([string]$cs, [string]$name) {
    if ($cs -match "(?i)$name=([^;]+)") { return $Matches[1].Trim() }
    throw "No se encontro $name en la cadena de conexion"
}

$cfg = Get-Content -Raw $cfgPath | ConvertFrom-Json
$cs = $cfg.ConnectionStrings.ProductionConnection
$env:PGPASSWORD = Get-ConnPart $cs 'Password'
$psql = 'E:\Semillas\Postgresql\bin\psql.exe'
if (-not (Test-Path $psql)) { throw "No existe $psql" }

$args = @(
    '-h', (Get-ConnPart $cs 'Host'),
    '-U', (Get-ConnPart $cs 'Username'),
    '-d', (Get-ConnPart $cs 'Database'),
    '-v', 'ON_ERROR_STOP=1',
    '-f', $sqlFile
)

$p = Start-Process -FilePath $psql -ArgumentList $args -Wait -PassThru -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError (Join-Path $root 'ensure-proceso-error.txt')
"psql_exit=$($p.ExitCode)" | Add-Content $out
exit $p.ExitCode
