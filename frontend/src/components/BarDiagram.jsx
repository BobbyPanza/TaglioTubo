import styles from './BarDiagram.module.css'

const KERF_COLOR   = '#1e293b'
const SFRIDO_COLOR = '#e2e8f0'

function segKey(seg) {
  return `${seg.cod_commessa}|${seg.cod_lotto}|${seg.lunghezza_mm}`
}

export default function BarDiagram({ barra, legend }) {
  const totale = barra.lunghezza_barra_mm

  const sequenza = barra.segmenti
    .filter(s => s.tipo === 'pezzo')
    .map(s => legend?.get(segKey(s))?.letter ?? '?')
    .join(' – ')

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.num}>Barra {barra.numero}</span>
        <span className={styles.len}>{totale.toLocaleString('it-IT')} mm</span>
        <span
          className={styles.sfrido}
          style={{ color: barra.sfrido_pct > 20 ? '#e53e3e' : barra.sfrido_pct > 10 ? '#d69e2e' : '#38a169' }}
        >
          sfrido {barra.sfrido_mm.toLocaleString('it-IT')} mm ({barra.sfrido_pct}%)
        </span>
      </div>

      {/* Diagramma */}
      <div className={styles.bar}>
        {barra.segmenti.map((seg, i) => {
          const pct  = (seg.lunghezza_mm / totale) * 100
          const info = seg.tipo === 'pezzo' ? legend?.get(segKey(seg)) : null
          const bg   = seg.tipo === 'pezzo'   ? (info?.color ?? '#3b82f6')
                     : seg.tipo === 'kerf'    ? KERF_COLOR
                     : SFRIDO_COLOR

          return (
            <div
              key={i}
              className={styles.seg}
              style={{
                width:    `${Math.max(pct, seg.tipo === 'kerf' ? 0.3 : 0.5)}%`,
                background: bg,
                minWidth: seg.tipo === 'kerf' ? 2 : undefined,
              }}
              title={
                seg.tipo === 'pezzo'
                  ? `[${info?.letter}] ${seg.dsc_barra} — ${seg.lunghezza_mm} mm\n${seg.cod_commessa} / ${seg.cod_lotto}`
                  : seg.tipo === 'sfrido'
                  ? `Sfrido: ${seg.lunghezza_mm} mm`
                  : `Kerf: ${seg.lunghezza_mm} mm`
              }
            >
              {seg.tipo === 'pezzo' && info && pct > 3 && (
                <span className={styles.segLetter}>{info.letter}</span>
              )}
              {seg.tipo === 'sfrido' && pct > 4 && (
                <span className={styles.segSfrido}>{seg.lunghezza_mm}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Sequenza taglio */}
      {sequenza && (
        <div className={styles.sequenza}>
          <span className={styles.seqLabel}>Sequenza:</span>
          <span className={styles.seqValue}>{sequenza}</span>
        </div>
      )}
    </div>
  )
}
