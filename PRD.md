# PRD — TaglioTubo Optimizer

## Obiettivo
Web app standalone per l'ottimizzazione del piano di taglio di profili metallici (tubi, piatti, tondi, angolari, ecc.) recuperando i pezzi da produrre dal gestionale FactoryTubo (SQL Server).

## Problema
Il reparto taglio riceve ordini di produzione con pezzi di varie lunghezze. Senza ottimizzazione, i pezzi vengono tagliati con logiche manuali generando sfrido (scarto) eccessivo e consumo di barre superiore al necessario.

## Soluzione
App React SPA + backend FastAPI Python che:
1. Legge i pezzi da tagliare da una vista SQL su FactoryTubo
2. Raggruppa i pezzi per profilo (stesso PACOD normalizzato)
3. Esegue l'algoritmo di ottimizzazione cutting stock su barre da 6m e 12m
4. Presenta il piano di taglio con diagramma visivo per barra

---

## Utenti
- Operatori reparto taglio
- Responsabile produzione

## Flusso principale

```
[DB FactoryTubo]
    └── Vista XV_TAGLIO_PEZZI
            └── Pezzi raggruppati per PACOD (stesso profilo + sezione)
                    └── Ottimizzazione cutting stock
                            └── Piano di taglio per barra (6m / 12m)
                                    └── Visualizzazione + stampa
```

---

## Requisiti funzionali

### RF-01 — Caricamento pezzi
- L'utente vede la lista dei pezzi da tagliare recuperati dalla vista XV_TAGLIO_PEZZI
- I pezzi sono raggruppati per famiglia profilo (TR, PT, TT, QU, TO, UN, AN, ...)
- Ogni riga mostra: codice barra, descrizione, lunghezza pezzo, quantità, famiglia
- È possibile filtrare per commessa o lotto

### RF-02 — Configurazione ottimizzazione
- Lunghezze barra disponibili: 6000mm e/o 12000mm (selezionabili)
- Kerf (spessore lama): configurabile in mm (default 3mm)
- Sfrido minimo recuperabile: configurabile in mm (default 200mm)

### RF-03 — Ottimizzazione
- Algoritmo: First Fit Decreasing (FFD) con scelta ottimale tra 6m e 12m
- Raggruppa per PACOD normalizzato (senza prefisso V/W/X)
- Minimizza numero di barre usate = minimizza sfrido totale
- Esclude pezzi con lunghezza 0 o nulla

### RF-04 — Risultati
- Mostra per ogni profilo: N barre necessarie, sfrido totale (mm e %)
- Per ogni barra: layout visivo con segmenti colorati (pezzo / sfrido / kerf)
- Riepilogo globale: totale barre, totale sfrido %

### RF-05 — Configurazione DB
- File `config.json` con connection string SQL Server
- Modificabile senza ricompilare il backend

---

## Requisiti non funzionali
- RNF-01: Risposta ottimizzazione < 3s per fino a 500 pezzi
- RNF-02: Funziona in rete locale, nessun cloud richiesto
- RNF-03: UI responsive, utilizzabile su tablet

---

## Famiglie profilo supportate

| Codice | Descrizione        | Icona |
|--------|--------------------|-------|
| TR     | Tubo Q/R           | □     |
| TT     | Tubo Tondo         | ○     |
| PT     | Piatto             | ▬     |
| QU     | Quadro pieno       | ■     |
| TO     | Tondo pieno        | ●     |
| UN     | UNP                | ⊏     |
| AN     | Angolare           | ∟     |
| IP     | IPE                | I     |
| HA     | HEA                | I     |
| SS     | Tubo senza saldatura | ○  |
| Generica | Generica         | ?     |

---

## Stack tecnico
- **Backend**: Python 3.11+, FastAPI, pyodbc, uvicorn
- **Frontend**: React 18, Vite, CSS modules (no framework UI)
- **DB**: SQL Server (FactoryTubo), ODBC Driver 17
- **Algoritmo**: FFD (First Fit Decreasing) custom, OR-Tools opzionale

---

## Vista SQL principale
`XV_TAGLIO_PEZZI` — minima, estendibile per cliente

---

## Fuori scope (v1)
- Autenticazione utenti
- Salvataggio piani di taglio nel DB
- Stampa etichette
- Integrazione con macchina taglio (DXF/NC)
