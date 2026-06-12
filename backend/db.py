import json
import pyodbc
from pathlib import Path

_config: dict | None = None


def get_config() -> dict:
    global _config
    if _config is None:
        cfg_path = Path(__file__).parent / "config.json"
        with open(cfg_path, encoding="utf-8") as f:
            _config = json.load(f)
    return _config


def get_connection() -> pyodbc.Connection:
    conn_str = get_config()["database"]["connection_string"]
    return pyodbc.connect(conn_str)


def fetch_pezzi(filtri: dict | None = None) -> list[dict]:
    """
    Legge i pezzi da tagliare dalla vista XV_TAGLIO_PEZZI.
    `filtri` può contenere: cod_commessa, cod_lotto (per WHERE aggiuntivi).
    """
    sql = """
        SELECT
            CodCommessa,
            DscCommessa,
            CodLotto,
            DscLotto,
            CodProfilo,
            DscProfilo,
            CodBarra,
            DscBarra,
            QtaPezzi,
            QtaGrezzoTot,
            LunghezzaMm
        FROM XV_TAGLIO_PEZZI
        WHERE 1=1
    """
    params: list = []

    if filtri:
        if filtri.get("cod_commesse"):
            placeholders = ",".join("?" * len(filtri["cod_commesse"]))
            sql += f" AND CodCommessa IN ({placeholders})"
            params.extend(filtri["cod_commesse"])
        if filtri.get("cod_lotto"):
            sql += " AND CodLotto = ?"
            params.append(filtri["cod_lotto"])

    sql += " ORDER BY CodProfilo, CodBarra"

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        cols = [c[0] for c in cur.description]
        return [
            {k: (v.strip() if isinstance(v, str) else v) for k, v in zip(cols, row)}
            for row in cur.fetchall()
        ]


def fetch_commesse() -> list[dict]:
    sql = """
        SELECT DISTINCT CodCommessa, DscCommessa
        FROM XV_TAGLIO_PEZZI
        ORDER BY CodCommessa
    """
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql)
        return [{"cod": r[0], "dsc": (r[1] or "").strip()} for r in cur.fetchall()]
