from pydantic import BaseModel
from typing import Optional


class PezzoIn(BaseModel):
    cod_commessa: str
    dsc_commessa: str
    cod_lotto: str
    dsc_lotto: str
    cod_profilo: str
    dsc_profilo: Optional[str] = None
    cod_barra: str
    dsc_barra: str
    qta_pezzi: int
    lunghezza_mm: float


class SegmentoBarra(BaseModel):
    tipo: str           # "pezzo" | "sfrido" | "kerf"
    lunghezza_mm: float
    cod_commessa: Optional[str] = None
    cod_lotto: Optional[str] = None
    dsc_barra: Optional[str] = None


class BarraTagliata(BaseModel):
    numero: int
    lunghezza_barra_mm: int
    segmenti: list[SegmentoBarra]
    sfrido_mm: float
    sfrido_pct: float


class RisultatoProfilo(BaseModel):
    cod_barra_normalizzato: str
    dsc_barra: str
    cod_profilo: str
    dsc_profilo: Optional[str] = None
    n_pezzi_tot: int
    n_barre: int
    barre: list[BarraTagliata]
    sfrido_tot_mm: float
    sfrido_tot_pct: float
    algoritmo: str = "FFD"
    lunghezza_barra_mm: int = 6000


class RisultatoOttimizzazione(BaseModel):
    profili: list[RisultatoProfilo]
    n_barre_tot: int
    sfrido_tot_mm: float
    sfrido_tot_pct: float


class ConfigOttimizzatore(BaseModel):
    kerf_mm: float = 3.0
    min_offcut_mm: float = 200.0
    bar_lengths_mm: list[int] = [6000, 12000]
    usa_ortools: bool = True
    ortools_timeout_s: float = 5.0


class RichiestaOttimizzazione(BaseModel):
    pezzi: list[PezzoIn]
    config: Optional[ConfigOttimizzatore] = None
