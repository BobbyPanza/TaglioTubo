from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List

from db import fetch_pezzi, fetch_commesse, get_config
from models import (
    PezzoIn, RichiestaOttimizzazione, RisultatoOttimizzazione,
    ConfigOttimizzatore,
)
from optimizer import ottimizza

app = FastAPI(title="TaglioTubo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/commesse")
def get_commesse():
    try:
        return fetch_commesse()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pezzi", response_model=list[PezzoIn])
def get_pezzi(
    cod_commessa: List[str] = Query(default=[]),
    cod_lotto: Optional[str] = Query(None),
):
    filtri = {}
    if cod_commessa:
        filtri["cod_commesse"] = cod_commessa
    if cod_lotto:
        filtri["cod_lotto"] = cod_lotto
    try:
        rows = fetch_pezzi(filtri or None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    pezzi = []
    for r in rows:
        pezzi.append(PezzoIn(
            cod_commessa=r["CodCommessa"] or "",
            dsc_commessa=r["DscCommessa"] or "",
            cod_lotto=r["CodLotto"] or "",
            dsc_lotto=r["DscLotto"] or "",
            cod_profilo=r["CodProfilo"] or "",
            dsc_profilo=r.get("DscProfilo"),
            cod_barra=r["CodBarra"] or "",
            dsc_barra=r["DscBarra"] or "",
            qta_pezzi=int(r["QtaPezzi"] or 0),
            lunghezza_mm=float(r["LunghezzaMm"] or 0),
        ))
    return pezzi


@app.get("/api/config", response_model=ConfigOttimizzatore)
def get_optimizer_config():
    cfg = get_config().get("optimizer", {})
    return ConfigOttimizzatore(**cfg)


@app.post("/api/ottimizza", response_model=RisultatoOttimizzazione)
def post_ottimizza(body: RichiestaOttimizzazione):
    if not body.pezzi:
        raise HTTPException(status_code=400, detail="Nessun pezzo fornito")
    cfg = body.config
    if cfg is None:
        raw = get_config().get("optimizer", {})
        cfg = ConfigOttimizzatore(**raw)
    try:
        return ottimizza(body.pezzi, cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
