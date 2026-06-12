# TaglioTubo Optimizer

Ottimizzazione piano di taglio profili metallici da FactoryTubo.

## Prerequisiti

- Python 3.11+
- Node.js 18+
- ODBC Driver 17 for SQL Server
- Accesso al DB FactoryTubo (Windows Auth)

## Setup

### 1. Configura il database

Esegui la vista SQL (una volta sola):

```sql
-- Apri sql/XV_TAGLIO_PEZZI.sql e lancialo su FactoryTubo
```

### 2. Configura il backend

```bash
cd backend
copy config.example.json config.json
```

Modifica `config.json` con la tua connection string:

```json
{
  "database": {
    "connection_string": "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=FactoryTubo;Trusted_Connection=yes;TrustServerCertificate=yes"
  },
  "optimizer": {
    "kerf_mm": 3,
    "min_offcut_mm": 200,
    "bar_lengths_mm": [6000, 12000]
  }
}
```

### 3. Avvia il backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

API disponibile su `http://localhost:8000`  
Documentazione Swagger: `http://localhost:8000/docs`

### 4. Avvia il frontend

```bash
cd frontend
npm install
npm run dev
```

App disponibile su `http://localhost:5173`

---

## Struttura

```
TAGLIOTUBO/
├── sql/
│   └── XV_TAGLIO_PEZZI.sql     # Vista SQL da creare su FactoryTubo
├── backend/
│   ├── config.json             # Configurazione locale (non committare)
│   ├── config.example.json     # Template configurazione
│   ├── main.py                 # FastAPI endpoints
│   ├── db.py                   # Connessione SQL Server
│   ├── models.py               # Pydantic models
│   ├── optimizer.py            # Algoritmo cutting stock (FFD)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
            ├── ProfileIcon.jsx      # Icone Bootstrap per ogni famiglia
            ├── PieceList.jsx        # Lista pezzi raggruppati per profilo
            ├── OptResult.jsx        # Riepilogo risultato ottimizzazione
            └── BarDiagram.jsx       # Diagramma visivo barra con tagli
```

## API Endpoints

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/pezzi` | Lista pezzi da tagliare dalla vista XV |
| POST | `/api/ottimizza` | Esegue ottimizzazione sui pezzi forniti |
| GET | `/api/config` | Legge parametri ottimizzazione |

## Deploy su server cliente (IIS)

In produzione la **stessa app FastAPI serve sia le API sia il frontend** (la build
React viene copiata in `backend/static`). Tutto è quindi *same-origin*: niente CORS,
niente reverse proxy separato. IIS fa solo da front tramite **HttpPlatformHandler**,
avviando il processo `uvicorn` e inoltrandogli le richieste.

### Prerequisiti sul server
- **Windows Server con ruolo IIS** attivo
- **Microsoft ODBC Driver 17 (o 18) for SQL Server** — necessario a `pyodbc`
  (col Driver 18 aggiungi `Encrypt=no` o `TrustServerCertificate=yes` alla connection string)
- **Python 3.11+ (64-bit)**
- **Modulo IIS HttpPlatformHandler** → https://www.iis.net/downloads/microsoft/httpplatformhandler
- SQL Server **FactoryTubo** raggiungibile, con la vista `XV_TAGLIO_PEZZI` creata

> **Node.js NON serve sul server**: la build del frontend si fa altrove (vedi sotto).

### 1. Build (sulla tua macchina di sviluppo, dove c'è Node)
```powershell
.\build.ps1
```
Genera `frontend/dist`, lo copia in `backend/static` e crea `backend/logs`.

### 2. Copia sul server
Copia l'intera cartella **`backend`** sul server (es. `C:\inetpub\TaglioTubo`).
Include `main.py`, `static/`, `web.config`, `requirements.txt`, ecc.

### 3. Crea il virtualenv e installa le dipendenze (sul server)
```powershell
cd C:\inetpub\TaglioTubo
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```
> `web.config` punta a `.\venv\Scripts\python.exe`: tieni il venv **dentro** questa cartella.

### 4. Configura `config.json` (sul server)
```powershell
copy config.example.json config.json
```
Modifica la connection string col server SQL del cliente (Windows Auth).

### 5. Configura il sito IIS
- Crea un **sito** (o un'applicazione) con **cartella fisica = `C:\inetpub\TaglioTubo`**
  (la cartella che contiene `web.config`).
- **Application Pool**: .NET CLR = **"No Managed Code"**.
- ⚠️ **Identità dell'Application Pool**: poiché il DB usa **Windows Authentication**,
  l'identità dell'App Pool **deve essere un account con accesso a FactoryTubo**
  (un account di dominio/servizio dedicato). L'identità di default
  `ApplicationPoolIdentity` di norma **non** ha accesso a SQL Server → errore di login.
- Concedi a quell'identità i permessi di **lettura/scrittura** su `backend\logs`.

### 6. Avvia e verifica
Naviga su `http://<server>/` (o sulla porta/binding configurato): deve comparire l'app.
Le API rispondono sotto lo stesso host su `/api/...`. Gli stdout di avvio finiscono in
`backend\logs\stdout*`. In caso di errore 502, controlla quei log (tipicamente: percorso
Python errato, dipendenze mancanti o connection string/permessi DB).

## Personalizzazione query per cliente

La vista `XV_TAGLIO_PEZZI` è volutamente minima. Per aggiungere filtri specifici per cliente (es. solo certe commesse, solo certi lotti), modificare direttamente il file `sql/XV_TAGLIO_PEZZI.sql` o creare una vista aggiuntiva basata su quella.
