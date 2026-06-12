# build.ps1 - Prepara la build di produzione di TaglioTubo.
#
# Cosa fa:
#   1. builda il frontend React (Vite)  -> frontend\dist
#   2. copia la build in                -> backend\static  (servita da FastAPI)
#   3. crea backend\logs                (richiesta da web.config per gli stdout)
#
# Node.js serve SOLO qui (in build). Sul server di produzione non e' necessario.
# Da eseguire dalla cartella root del progetto:  .\build.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> Build frontend (Vite)..." -ForegroundColor Cyan
Push-Location "$root\frontend"
try {
    if (Test-Path "package-lock.json") { npm ci } else { npm install }
    npm run build
} finally {
    Pop-Location
}

$dist = "$root\frontend\dist"
$static = "$root\backend\static"

if (-not (Test-Path $dist)) {
    throw "Build non trovata in $dist - la build del frontend e' fallita."
}

Write-Host "==> Copia build in backend\static..." -ForegroundColor Cyan
if (Test-Path $static) { Remove-Item $static -Recurse -Force }
Copy-Item $dist $static -Recurse

Write-Host "==> Creo backend\logs (per gli stdout di IIS)..." -ForegroundColor Cyan
$logs = "$root\backend\logs"
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }

Write-Host ""
Write-Host "OK. Pronto per il deploy." -ForegroundColor Green
Write-Host "Cartella da pubblicare su IIS: $root\backend" -ForegroundColor Green
