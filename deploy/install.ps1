# install.ps1 - Installazione TaglioTubo sul server del cliente (OFFLINE).
#
# Da eseguire DENTRO la cartella di installazione (es. C:\inetpub\TaglioTubo)
# dopo aver estratto TaglioTubo-deploy.zip, con PowerShell da Amministratore:
#
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# Prerequisiti gia' installati sul server:
#   - Python 3.14 a 64 bit (stessa versione major.minor dei wheel inclusi!)
#   - ODBC Driver 17 o 18 for SQL Server
#   - IIS + modulo HttpPlatformHandler

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# --- 1. Trova Python (PATH, py launcher, percorsi standard) ---
Write-Host "==> Cerco Python 3.14..." -ForegroundColor Cyan

function Find-Python {
    # 1) nel PATH
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    # 2) py launcher (installato di default con Python per tutti gli utenti)
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        $exe = & py -3.14 -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $exe) { return $exe.Trim() }
        $exe = & py -3 -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $exe) { return $exe.Trim() }
    }
    # 3) percorsi di installazione standard
    $candidates = @(
        "C:\Program Files\Python314\python.exe",
        "C:\Python314\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$python = Find-Python
if (-not $python) {
    Write-Host ""
    Write-Host "ERRORE: Python non trovato su questo server." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installa Python 3.14 (64 bit) da https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Durante il setup spunta:" -ForegroundColor Yellow
    Write-Host "  [x] Add python.exe to PATH" -ForegroundColor Yellow
    Write-Host "  e preferibilmente 'Install for all users' (Customize installation)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Poi rilancia questo script." -ForegroundColor Yellow
    exit 1
}

$pyVer = & $python --version
Write-Host "    Trovato: $pyVer ($python)"
if ($pyVer -notmatch "Python 3\.14\.") {
    Write-Host ""
    Write-Host "ATTENZIONE: i wheel inclusi sono per Python 3.14 (64 bit)." -ForegroundColor Yellow
    Write-Host "Con un'altra versione l'installazione offline fallira'." -ForegroundColor Yellow
    Write-Host ""
}

# --- 2. Virtualenv ---
Write-Host "==> Creo il virtualenv..." -ForegroundColor Cyan
if (-not (Test-Path "$root\venv")) {
    & $python -m venv "$root\venv"
    if ($LASTEXITCODE -ne 0) { throw "Creazione venv fallita." }
}

# --- 3. Dipendenze (offline, dai wheel inclusi) ---
Write-Host "==> Installo le dipendenze dai wheel inclusi (offline)..." -ForegroundColor Cyan
& "$root\venv\Scripts\python.exe" -m pip install --no-index --find-links "$root\wheels" -r "$root\requirements.txt"
if ($LASTEXITCODE -ne 0) { throw "pip install fallito." }

# --- 4. Cartella logs ---
if (-not (Test-Path "$root\logs")) {
    New-Item -ItemType Directory -Path "$root\logs" | Out-Null
}

# --- 5. config.json ---
if (-not (Test-Path "$root\config.json")) {
    Copy-Item "$root\config.example.json" "$root\config.json"
    Write-Host ""
    Write-Host "==> Creato config.json dal template." -ForegroundColor Yellow
    Write-Host "    MODIFICA la connection string (server SQL del cliente)!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installazione completata." -ForegroundColor Green
Write-Host ""
Write-Host "Prossimi passi:" -ForegroundColor Green
Write-Host "  1. Modifica config.json con la connection string del cliente"
Write-Host "  2. Crea il sito IIS con cartella fisica = $root"
Write-Host "     - Application Pool: 'No Managed Code'"
Write-Host "     - Identita' App Pool: account con accesso al DB (Windows Auth)"
Write-Host "  3. Dai all'identita' dell'App Pool permessi di scrittura su $root\logs"
Write-Host "  4. Apri http://<server>/ e verifica"
