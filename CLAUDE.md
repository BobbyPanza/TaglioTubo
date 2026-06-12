# TaglioTubo — Contesto progetto per Claude

## Cos'è questo progetto
Web app standalone per l'**ottimizzazione del piano di taglio profili metallici**.
Stack: **FastAPI (Python)** backend + **React (Vite)** SPA frontend.

## Database
- **Server**: localhost (Windows Auth)
- **Database**: FactoryTubo (SQL Server)
- **Connection**: Windows Authentication (Trusted_Connection=yes)
- La connection string di produzione è in `backend/config.json` (non committare credenziali)

## Schema DB rilevante

### Tabelle principali
| Tabella | Descrizione |
|---------|-------------|
| `A_LAV` | Lavorazioni di taglio. Filtro: `FACOD IN ('X030','F030')`, `LAQTP > 0` |
| `A_LOT` | Lotti di produzione |
| `A_COM` | Commesse |
| `l_cmfe` | Materia prima da prelevare (join su CONUM + LOCLP=LOCOD) |
| `a_fam` | Famiglie materiali (codice profilo + descrizione) |

### Campi chiave
- `A_LAV.LAQTP` = quantità pezzi da produrre nella lavorazione
- `l_cmfe.LOQDB` = quantità totale grezzo da prelevare (in mm)
- `l_cmfe.PACOD` = codice barra (primo carattere V/W/X = lunghezza barra, **da ignorare** per ottimizzazione)
- `l_cmfe.FMCOD` = codice famiglia profilo (es. TR, PT, TT, QU, TO, UN, AN...)
- **Lunghezza pezzo** = `LOQDB / LAQTP` (in mm)
- **Escludere** righe con `LOQDB = 0`

### Vista SQL
`XV_TAGLIO_PEZZI` — definita in `sql/XV_TAGLIO_PEZZI.sql`
Le viste devono sempre avere prefisso `XV`.

## Famiglie profilo rilevanti
| FMCOD | Descrizione | Icona SVG |
|-------|-------------|-----------|
| TR | Tubo Q/R (quadro/rettangolare) | □ |
| TT | Tubo Tondo | ○ |
| PT | Piatto | ▬ |
| QU | Quadro pieno | ■ |
| TO | Tondo pieno | ● |
| UN | UNP | ⊏ |
| AN | Angolare | ∟ |
| IP | IPE | I |
| HA | HEA | I |
| SS | Tubo senza saldatura | ○ |

Da escludere dall'ottimizzazione: Generica, VITERIA, DM, Finiti, MISURA

## Algoritmo ottimizzazione
- **Cutting stock problem** (bin packing variant)
- Raggruppa per `PACOD` normalizzato (senza prefisso V/W/X, cioè `PACOD[1:]`)
- Lunghezze barra disponibili: **6000mm** e **12000mm**
- Parametri configurabili: kerf (default 3mm), sfrido minimo recuperabile (default 200mm)
- Algoritmo: **FFD (First Fit Decreasing)** — ordina pezzi per lunghezza decrescente, prova a piazzarli nelle barre aperte
- L'algoritmo sceglie automaticamente tra 6m e 12m la lunghezza più efficiente per ogni profilo

## Struttura progetto
```
TAGLIOTUBO/
├── CLAUDE.md              ← questo file
├── PRD.md                 ← requisiti prodotto
├── README.md              ← setup e avvio
├── sql/
│   └── XV_TAGLIO_PEZZI.sql
├── backend/
│   ├── config.json        ← connection string + parametri (NON committare)
│   ├── config.example.json
│   ├── main.py            ← FastAPI app + endpoints
│   ├── db.py              ← connessione SQL Server
│   ├── models.py          ← Pydantic models
│   ├── optimizer.py       ← algoritmo cutting stock
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── ProfileIcon.jsx
    │       ├── PieceList.jsx
    │       ├── OptResult.jsx
    │       └── BarDiagram.jsx
    ├── package.json
    └── vite.config.js
```

## Avvio sviluppo
```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev   # porta 5173
```

## Convenzioni
- Le viste SQL hanno sempre prefisso `XV`
- Le query SQL sono in `sql/` e devono essere facili da modificare per aggiungere filtri cliente
- `config.json` non viene committato (in `.gitignore`), usare `config.example.json` come template
- Lunghezze sempre in **mm**
