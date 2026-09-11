Write-Host "Patching PlanesDiseno..."
$env:TEMP = 'E:\Semillas\.dotnet-cache\temp'
$env:TMP = $env:TEMP
node 'E:\Semillas\Perlax\frontend\scripts\patch-planes-diseno.cjs'
Write-Host "exit=$LASTEXITCODE"
