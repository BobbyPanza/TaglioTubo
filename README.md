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

## Personalizzazione query per cliente

La vista `XV_TAGLIO_PEZZI` è volutamente minima. Per aggiungere filtri specifici per cliente (es. solo certe commesse, solo certi lotti), modificare direttamente il file `sql/XV_TAGLIO_PEZZI.sql` o creare una vista aggiuntiva basata su quella.
