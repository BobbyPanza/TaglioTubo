import { useState } from 'react'
import { ChevronDown, ChevronRight, BarChart, Rulers } from 'react-bootstrap-icons'
import ProfileIcon from './ProfileIcon.jsx'
import BarDiagram from './BarDiagram.jsx'
import styles from './OptResult.module.css'

const PIECE_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
  '#6366f1','#d946ef','#0ea5e9','#65a30d','#b45309',
  '#dc2626','#7c3aed','#0891b2','#15803d','#c2410c',
]

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function idxToLabel(n) {
  let label = ''
  n++
  while (n > 0) {
    n--
    label = ALPHA[n % 26] + label
    n = Math.floor(n / 26)
  }
  return label
}

function buildLegend(barre) {
  const map = new Map()
  let idx = 0
  for (const barra of barre) {
    for (const seg of barra.segmenti) {
      if (seg.tipo !== 'pezzo') continue
      const key = `${seg.cod_commessa}|${seg.cod_lotto}|${seg.lunghezza_mm}`
      if (!map.has(key)) {
        map.set(key, {
          letter: idxToLabel(idx),
          color:  PIECE_COLORS[idx % PIECE_COLORS.length],
          cod_commessa: seg.cod_commessa,
          cod_lotto:    seg.cod_lotto,
          lunghezza_mm: seg.lunghezza_mm,
          dsc_barra:    seg.dsc_barra,
        })
        idx++
      }
    }
  }
  return map
}

function SfridoBadge({ pct }) {
  const cls = pct <= 8 ? 'green' : pct <= 18 ? 'orange' : 'red'
  return <span className={`badge ${cls}`}>{pct}% sfrido</span>
}

function LegendaTable({ legend }) {
  if (!legend.size) return null
  return (
    <div className={styles.legendaWrap}>
      <div className={styles.legendaTitle}>Legenda pezzi</div>
      <div className={styles.legendaGrid}>
        {[...legend.entries()].map(([key, info]) => (
          <div key={key} className={styles.legendaRow}>
            <span className={styles.legendaLettera} style={{ background: info.color }}>
              {info.letter}
            </span>
            <span className={styles.legendaComm}>{info.cod_commessa}</span>
            <span className={styles.legendaLotto}>{info.cod_lotto}</span>
            <span className={styles.legendaLen}>{Number(info.lunghezza_mm).toLocaleString('it-IT')} mm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfiloCard({ profilo }) {
  const [open, setOpen] = useState(false)
  const legend = buildLegend(profilo.barre)

  return (
    <div className={styles.profiloCard}>
      <button className={styles.profiloHeader} onClick={() => setOpen(o => !o)}>
        <span className={styles.profiloLeft}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <ProfileIcon codProfilo={profilo.cod_profilo} size={20} />
          <span className={styles.profiloCod}>{profilo.cod_barra_normalizzato}</span>
          <span className={styles.profiloDsc}>{profilo.dsc_barra}</span>
        </span>
        <span className={styles.profiloStats}>
          <span className="badge blue">{profilo.n_barre} {profilo.lunghezza_barra_mm / 1000}m</span>
          <span className="badge gray">{profilo.n_pezzi_tot} pz</span>
          <SfridoBadge pct={profilo.sfrido_tot_pct} />
          <span className="badge gray" style={{ fontSize: 10 }}>{profilo.algoritmo}</span>
        </span>
      </button>

      {open && (
        <div className={styles.profiloBody}>
          {profilo.barre.map(b => (
            <BarDiagram key={b.numero} barra={b} legend={legend} />
          ))}
          <LegendaTable legend={legend} />
        </div>
      )}
    </div>
  )
}

export default function OptResult({ risultato }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.riepilogo}>
        <div className={styles.kpi}>
          <BarChart size={22} color="#3b82f6" />
          <div>
            <div className={styles.kpiVal}>{risultato.n_barre_tot}</div>
            <div className={styles.kpiLbl}>Barre totali</div>
          </div>
        </div>
        <div className={styles.kpi}>
          <Rulers size={22} color="#f59e0b" />
          <div>
            <div className={styles.kpiVal}>{risultato.sfrido_tot_mm.toLocaleString('it-IT')} mm</div>
            <div className={styles.kpiLbl}>Sfrido totale</div>
          </div>
        </div>
        <div className={styles.kpi}>
          <SfridoBadge pct={risultato.sfrido_tot_pct} />
          <div>
            <div className={styles.kpiLbl} style={{ marginTop: 4 }}>Sfrido globale %</div>
          </div>
        </div>
      </div>

      <div className={styles.profiliList}>
        {risultato.profili.map(p => (
          <ProfiloCard key={p.cod_barra_normalizzato} profilo={p} />
        ))}
      </div>
    </div>
  )
}
