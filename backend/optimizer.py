"""
Cutting stock optimizer.

Esegue sia FFD (First Fit Decreasing) sia OR-Tools CP-SAT su ogni gruppo di profilo,
poi sceglie automaticamente il risultato con minor sfrido totale.
"""

from __future__ import annotations
from ortools.sat.python import cp_model

from models import (
    PezzoIn, RisultatoProfilo, RisultatoOttimizzazione,
    BarraTagliata, SegmentoBarra, ConfigOttimizzatore,
)


def _normalizza_cod(cod_barra: str) -> str:
    if cod_barra and cod_barra[0].upper() in ("V", "W", "X"):
        return cod_barra[1:]
    return cod_barra


# ── FFD ──────────────────────────────────────────────────────────────────────

def _ffd_piano(pezzi_mm: list[float], bar_len: int, kerf: float) -> list[list[float]]:
    """Restituisce lista di barre, ognuna lista di lunghezze pezzi."""
    barre: list[list[float]] = []
    spazio: list[float] = []

    for p in sorted(pezzi_mm, reverse=True):
        piazzato = False
        for i, s in enumerate(spazio):
            costo = p + (kerf if barre[i] else 0)
            if s >= costo:
                barre[i].append(p)
                spazio[i] -= costo
                piazzato = True
                break
        if not piazzato:
            if p > bar_len:
                raise ValueError(f"Pezzo {p}mm supera barra {bar_len}mm")
            barre.append([p])
            spazio.append(bar_len - p)

    return barre


def _run_ffd(pezzi_mm: list[float], bar_len: int, kerf: float) -> tuple[list[list[float]], float]:
    piano = _ffd_piano(pezzi_mm, bar_len, kerf)
    sfrido = sum(
        bar_len - sum(p + kerf for p in b) + kerf
        for b in piano
    )
    return piano, sfrido


# ── OR-Tools CP-SAT ───────────────────────────────────────────────────────────

def _run_ortools(pezzi_mm: list[float], bar_len: int, kerf: float, timeout_s: float = 5.0) -> tuple[list[list[float]] | None, float]:
    """
    Minimizza il numero di barre (= minimizza sfrido).
    Restituisce (piano, sfrido_mm) oppure (None, inf) se non trova soluzione.
    """
    n = len(pezzi_mm)
    # stima pessimistica: una barra per pezzo
    max_barre = n

    # scala in interi (decimi di mm per evitare floating point)
    scale = 10
    pezzi_i = [round(p * scale) for p in pezzi_mm]
    bar_i   = round(bar_len * scale)
    kerf_i  = round(kerf * scale)

    model = cp_model.CpModel()

    # x[i][j] = 1 se il pezzo i va nella barra j
    x = [[model.new_bool_var(f"x_{i}_{j}") for j in range(max_barre)] for i in range(n)]
    # y[j] = 1 se la barra j è usata
    y = [model.new_bool_var(f"y_{j}") for j in range(max_barre)]

    # ogni pezzo va in esattamente una barra
    for i in range(n):
        model.add(sum(x[i][j] for j in range(max_barre)) == 1)

    # capacità barra (con kerf tra i pezzi)
    for j in range(max_barre):
        # somma lunghezze + kerf tra pezzi (n_pezzi-1 kerf per barra)
        pezzi_in_barra = sum(x[i][j] for i in range(n))
        modello_capacita = sum(pezzi_i[i] * x[i][j] for i in range(n))
        # kerf = (pezzi_in_barra - 1) * kerf_i, ma non lineare.
        # Approssimazione conservativa: aggiungiamo kerf per ogni pezzo
        modello_capacita_con_kerf = sum((pezzi_i[i] + kerf_i) * x[i][j] for i in range(n))
        model.add(modello_capacita_con_kerf <= bar_i * y[j] + kerf_i)
        # se un pezzo è nella barra j, y[j] deve essere 1
        for i in range(n):
            model.add(x[i][j] <= y[j])

    # simmetria: barre usate prima delle non usate
    for j in range(max_barre - 1):
        model.add(y[j] >= y[j + 1])

    model.minimize(sum(y))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_s
    solver.parameters.log_search_progress = False
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, float("inf")

    piano: list[list[float]] = []
    for j in range(max_barre):
        if solver.value(y[j]):
            barra_pezzi = [pezzi_mm[i] for i in range(n) if solver.value(x[i][j])]
            if barra_pezzi:
                piano.append(barra_pezzi)

    sfrido = sum(
        bar_len - sum(p + kerf for p in b) + kerf
        for b in piano
    )
    return piano, sfrido


# ── PIANO → OGGETTI BARRA ─────────────────────────────────────────────────────

def _piano_a_barre(
    piano: list[list[float]],
    bar_len: int,
    kerf: float,
    metas: list[dict],
) -> list[BarraTagliata]:
    barre_out = []
    meta_iter = iter(metas)

    for idx, barra_pezzi in enumerate(piano):
        segmenti: list[SegmentoBarra] = []
        consumato = 0.0

        for i, lunghezza in enumerate(barra_pezzi):
            if i > 0:
                segmenti.append(SegmentoBarra(tipo="kerf", lunghezza_mm=kerf))
                consumato += kerf
            meta = next(meta_iter, {})
            segmenti.append(SegmentoBarra(
                tipo="pezzo",
                lunghezza_mm=lunghezza,
                cod_commessa=meta.get("cod_commessa"),
                cod_lotto=meta.get("cod_lotto"),
                dsc_barra=meta.get("dsc_barra"),
            ))
            consumato += lunghezza

        sfrido = bar_len - consumato
        if sfrido > 0:
            segmenti.append(SegmentoBarra(tipo="sfrido", lunghezza_mm=round(sfrido, 2)))

        barre_out.append(BarraTagliata(
            numero=idx + 1,
            lunghezza_barra_mm=bar_len,
            segmenti=segmenti,
            sfrido_mm=round(sfrido, 2),
            sfrido_pct=round(sfrido / bar_len * 100, 1),
        ))

    return barre_out


# ── ENTRY POINT ───────────────────────────────────────────────────────────────

def ottimizza(
    pezzi: list[PezzoIn],
    config: ConfigOttimizzatore | None = None,
) -> RisultatoOttimizzazione:
    if config is None:
        config = ConfigOttimizzatore()

    kerf = config.kerf_mm
    lunghezze_disponibili = sorted(config.bar_lengths_mm)

    # raggruppa per cod_barra normalizzato
    gruppi: dict[str, list[PezzoIn]] = {}
    for p in pezzi:
        key = _normalizza_cod(p.cod_barra)
        gruppi.setdefault(key, []).append(p)

    profili_out: list[RisultatoProfilo] = []
    n_barre_tot = 0
    sfrido_tot_mm = 0.0
    materiale_tot_mm = 0.0

    for cod_norm, gruppo in gruppi.items():
        # espandi quantità
        espansi: list[tuple[float, dict]] = []
        for p in gruppo:
            meta = {"cod_commessa": p.cod_commessa, "cod_lotto": p.cod_lotto, "dsc_barra": p.dsc_barra}
            for _ in range(p.qta_pezzi):
                espansi.append((p.lunghezza_mm, meta))

        lunghezze_mm = [x[0] for x in espansi]
        metas        = [x[1] for x in espansi]

        miglior_piano: list[list[float]] | None = None
        miglior_bar_len = lunghezze_disponibili[0]
        miglior_sfrido  = float("inf")
        miglior_algo    = "—"

        for bar_len in lunghezze_disponibili:
            # FFD
            try:
                ffd_piano, ffd_sfrido = _run_ffd(lunghezze_mm, bar_len, kerf)
            except ValueError:
                ffd_piano, ffd_sfrido = None, float("inf")

            # OR-Tools (se abilitato dalla config)
            if config.usa_ortools:
                ort_piano, ort_sfrido = _run_ortools(lunghezze_mm, bar_len, kerf, config.ortools_timeout_s)
            else:
                ort_piano, ort_sfrido = None, float("inf")

            # scegli il migliore tra i due per questa lunghezza barra
            if ort_piano is not None and ort_sfrido <= ffd_sfrido:
                candidato_piano, candidato_sfrido, algo = ort_piano, ort_sfrido, "OR-Tools"
            elif ffd_piano is not None:
                candidato_piano, candidato_sfrido, algo = ffd_piano, ffd_sfrido, "FFD"
            else:
                continue

            if candidato_sfrido < miglior_sfrido:
                miglior_sfrido  = candidato_sfrido
                miglior_piano   = candidato_piano
                miglior_bar_len = bar_len
                miglior_algo    = algo

        if miglior_piano is None:
            continue

        barre = _piano_a_barre(miglior_piano, miglior_bar_len, kerf, metas)
        materiale_barre = len(barre) * miglior_bar_len
        sfrido_profilo  = sum(b.sfrido_mm for b in barre)
        sfrido_pct      = round(sfrido_profilo / materiale_barre * 100, 1) if materiale_barre else 0

        primo = gruppo[0]
        profili_out.append(RisultatoProfilo(
            cod_barra_normalizzato=cod_norm,
            dsc_barra=primo.dsc_barra,
            cod_profilo=primo.cod_profilo,
            dsc_profilo=primo.dsc_profilo,
            n_pezzi_tot=len(espansi),
            n_barre=len(barre),
            barre=barre,
            sfrido_tot_mm=round(sfrido_profilo, 2),
            sfrido_tot_pct=sfrido_pct,
            algoritmo=miglior_algo,
            lunghezza_barra_mm=miglior_bar_len,
        ))

        n_barre_tot      += len(barre)
        sfrido_tot_mm    += sfrido_profilo
        materiale_tot_mm += materiale_barre

    sfrido_globale_pct = round(sfrido_tot_mm / materiale_tot_mm * 100, 1) if materiale_tot_mm else 0

    return RisultatoOttimizzazione(
        profili=sorted(profili_out, key=lambda p: p.cod_profilo),
        n_barre_tot=n_barre_tot,
        sfrido_tot_mm=round(sfrido_tot_mm, 2),
        sfrido_tot_pct=sfrido_globale_pct,
    )
