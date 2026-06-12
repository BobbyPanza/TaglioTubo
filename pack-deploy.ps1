# pack-deploy.ps1 - Crea il bundle di deploy per il server del cliente.
#
# Output: deploy\TaglioTubo-deploy.zip
# Contiene TUTTO il necessario per un'installazione OFFLINE (niente internet
# richiesto sul server): backend, frontend compilato, wheel Python, web.config,
# install.ps1.
#
# NB: i wheel vengono scaricati per la versione di Python di QUESTA macchina
#     (attualmente 3.14 x64): sul server va installata la stessa major.minor.
#
# Da eseguire dalla root del progetto:  .\pack-deploy.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# --- 1. Build frontend -> backend\static ---
& "$root\build.ps1"
if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "build.ps1 fallito." }

# --- 2. Staging ---
$stage = "$root\deploy\TaglioTubo"
Write-Host "==> Preparo lo staging in $stage..." -ForegroundColor Cyan
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# Backend: codice + static + web.config (NO config.json, NO venv, NO logs, NO cache)
$backendFiles = @(
    "main.py", "db.py", "models.py", "optimizer.py",
    "requirements.txt", "config.example.json", "web.config"
)
foreach ($f in $backendFiles) {
    Copy-Item "$root\backend\$f" $stage
}
Copy-Item "$root\backend\static" "$stage\static" -Recurse

# Installer offline + SQL
Copy-Item "$root\deploy\install.ps1" $stage
New-Item -ItemType Directory -Path "$stage\sql" | Out-Null
Copy-Item "$root\sql\*.sql" "$stage\sql"

# --- 3. Wheel Python per installazione offline ---
Write-Host "==> Scarico i wheel Python (per installazione offline)..." -ForegroundColor Cyan
python -m pip download -r "$root\backend\requirements.txt" -d "$stage\wheels" --only-binary :all: -q
if ($LASTEXITCODE -ne 0) { throw "pip download fallito." }

# --- 4. Zip ---
$zip = "$root\deploy\TaglioTubo-deploy.zip"
Write-Host "==> Creo $zip..." -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$stage\*" -DestinationPath $zip

$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host ""
Write-Host "OK. Bundle pronto: $zip ($sizeMb MB)" -ForegroundColor Green
Write-Host ""
Write-Host "Sul server del cliente:" -ForegroundColor Green
Write-Host "  1. Estrai lo zip in C:\inetpub\TaglioTubo"
Write-Host "  2. Esegui .\install.ps1 (PowerShell da Amministratore)"
Write-Host "  3. Segui le istruzioni a video (config.json + sito IIS)"
