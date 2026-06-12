import { useState, useEffect, useMemo } from 'react'
import { Scissors, GearFill, PlayFill, ArrowClockwise, Search, CheckSquare, Square as SquareIcon } from 'react-bootstrap-icons'
import { fetchCommesse, fetchPezzi, fetchConfig, postOttimizza } from './api.js'
import ProfileIcon, { ICON_MAP } from './components/ProfileIcon.jsx'
import OptResult from './components/OptResult.jsx'
import styles from './App.module.css'

function PezziTable({ pezzi, selected, onSelectionChange }) {
  const [filtroTesto, setFiltroTesto] = useState('')
  const [filtroProfilo, setFiltroProfilo] = useState('')

  const famiglie = useMemo(() => [...new Set(pezzi.map(p => p.cod_profilo))].sort(), [pezzi])

  const visibili = useMemo(() => {
    const testo = filtroTesto.toLowerCase()
    return pezzi.filter((p, i) => {
      const matchProfilo = !filtroProfilo || p.cod_profilo === filtroProfilo
      const matchTesto   = !testo ||
        p.dsc_barra?.toLowerCase().includes(testo) ||
        p.cod_barra?.toLowerCase().includes(testo) ||
        p.dsc_lotto?.toLowerCase().includes(testo)
      return matchProfilo && matchTesto
    })
  }, [pezzi, filtroTesto, filtroProfilo])

  const indiciVisibili = useMemo(
    () => new Set(visibili.map(p => pezzi.indexOf(p))),
    [visibili, pezzi]
  )

  const tuttiSelezionati = visibili.length > 0 && visibili.every((p) => selected.has(pezzi.indexOf(p)))
  const nessuno = visibili.every((p) => !selected.has(pezzi.indexOf(p)))

  function toggleAll() {
    const next = new Set(selected)
    if (tuttiSelezionati) {
      indiciVisibili.forEach(i => next.delete(i))
    } else {
      indiciVisibili.forEach(i => next.add(i))
    }
    onSelectionChange(next)
  }

  function toggleOne(idx) {
    const next = new Set(selected)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    onSelectionChange(next)
  }

  const nSelezionati = [...indiciVisibili].filter(i => selected.has(i)).length

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableToolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchBox}>
            <Search size={13} color="#94a3b8" />
            <input
              placeholder="Cerca descrizione, codice…"
              value={filtroTesto}
              onChange={e => setFiltroTesto(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: 200 }}
            />
          </div>
          <select value={filtroProfilo} onChange={e => setFiltroProfilo(e.target.value)}>
            <option value="">Tutti i profili</option>
            {famiglie.map(f => (
              <option key={f} value={f}>{f} — {ICON_MAP[f]?.label ?? f}</option>
            ))}
          </select>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.selCount}>
            {nSelezionati} / {visibili.length} selezionati
          </span>
          <button className="ghost" onClick={toggleAll} style={{ padding: '.3rem .7rem', fontSize: 12 }}>
            {tuttiSelezionati
              ? <><SquareIcon size={13} /> Deseleziona tutti</>
              : <><CheckSquare size={13} /> Seleziona tutti</>
            }
          </button>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={tuttiSelezionati}
                  ref={el => { if (el) el.indeterminate = !tuttiSelezionati && !nessuno }}
                  onChange={toggleAll}
                />
              </th>
              <th>Profilo</th>
              <th>Codice barra</th>
              <th>Descrizione</th>
              <th>Commessa / Lotto</th>
              <th style={{ textAlign: 'right' }}>Lungh. (mm)</th>
              <th style={{ textAlign: 'right' }}>Qtà</th>
            </tr>
          </thead>
          <tbody>
            {visibili.map((p) => {
              const idx = pezzi.indexOf(p)
              const checked = selected.has(idx)
              return (
                <tr
                  key={idx}
                  className={checked ? styles.rowSelected : ''}
                  onClick={() => toggleOne(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(idx)} />
                  </td>
                  <td><ProfileIcon codProfilo={p.cod_profilo} size={15} showLabel /></td>
                  <td><code className={styles.code}>{p.cod_barra}</code></td>
                  <td>{p.dsc_barra}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{p.cod_commessa}</span>
                    <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 12 }}>{p.cod_lotto}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Number(p.lunghezza_mm).toLocaleString('it-IT')}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.qta_pezzi}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfigPanel({ config, onChange }) {
  return (
    <div className={styles.configGrid}>
      <label>
        <span>Kerf lama (mm)</span>
        <input
          type="number" min="0" max="20" step="0.5"
          value={config.kerf_mm}
          onChange={e => onChange({ ...config, kerf_mm: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        <span>Sfrido min recuperabile (mm)</span>
        <input
          type="number" min="0" max="1000" step="10"
          value={config.min_offcut_mm}
          onChange={e => onChange({ ...config, min_offcut_mm: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        <span>Lunghezze barra disponibili</span>
        <div className={styles.barLenChecks}>
          {[6000, 12000].map(len => (
            <label key={len} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={config.bar_lengths_mm.includes(len)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...config.bar_lengths_mm, len].sort((a, b) => a - b)
                    : config.bar_lengths_mm.filter(l => l !== len)
                  onChange({ ...config, bar_lengths_mm: next })
                }}
              />
              {(len / 1000).toLocaleString('it-IT')} m
            </label>
          ))}
        </div>
      </label>
      <div className={styles.configDivider} />
      <label className={styles.checkLabel} style={{ alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={config.usa_ortools ?? true}
          onChange={e => onChange({ ...config, usa_ortools: e.target.checked })}
        />
        <span style={{ fontSize: 13, color: 'var(--text)' }}>Usa OR-Tools (CP-SAT)</span>
      </label>
      {(config.usa_ortools ?? true) && (
        <label>
          <span>Timeout OR-Tools (sec)</span>
          <input
            type="number" min="1" max="120" step="1"
            value={config.ortools_timeout_s ?? 5}
            onChange={e => onChange({ ...config, ortools_timeout_s: parseFloat(e.target.value) })}
          />
        </label>
      )}
    </div>
  )
}

export default function App() {
  const [commesse, setCommesse]         = useState([])
  const [commesseScelte, setCommesseScelte] = useState(new Set())
  const [pezzi, setPezzi]               = useState([])
  const [selected, setSelected]         = useState(new Set())
  const [config, setConfig]             = useState({ kerf_mm: 3, min_offcut_mm: 200, bar_lengths_mm: [6000, 12000] })
  const [risultato, setRisultato]       = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [showConfig, setShowConfig]     = useState(false)
  const [tab, setTab]                   = useState('pezzi')

  useEffect(() => {
    fetchCommesse().then(setCommesse).catch(() => {})
    fetchConfig().then(setConfig).catch(() => {})
  }, [])

  function toggleCommessa(cod) {
    setCommesseScelte(prev => {
      const next = new Set(prev)
      next.has(cod) ? next.delete(cod) : next.add(cod)
      return next
    })
  }

  async function caricaPezzi() {
    setLoading(true); setError(null)
    try {
      const data = await fetchPezzi({ codCommesse: [...commesseScelte] })
      setPezzi(data)
      setSelected(new Set(data.map((_, i) => i)))   // tutti selezionati di default
      setRisultato(null)
      setTab('pezzi')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const pezziSelezionati = useMemo(
    () => pezzi.filter((_, i) => selected.has(i)),
    [pezzi, selected]
  )

  async function eseguiOttimizzazione() {
    if (!pezziSelezionati.length) return
    setLoading(true); setError(null)
    try {
      const res = await postOttimizza(pezziSelezionati, config)
      setRisultato(res)
      setTab('risultato')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.layout}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Scissors size={22} />
          <span>TaglioTubo</span>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabelRow}>
            <span className={styles.sideLabel}>Commesse</span>
            {commesseScelte.size > 0 && (
              <button
                className={styles.clearBtn}
                onClick={() => setCommesseScelte(new Set())}
                title="Deseleziona tutte"
              >
                ✕ tutte
              </button>
            )}
          </div>
          <div className={styles.commesseList}>
            {commesse.length === 0 && (
              <span className={styles.commesseEmpty}>Nessuna commessa disponibile</span>
            )}
            {commesse.map(c => (
              <label key={c.cod} className={styles.commessaRow}>
                <input
                  type="checkbox"
                  checked={commesseScelte.has(c.cod)}
                  onChange={() => toggleCommessa(c.cod)}
                />
                <span className={styles.commessaCod}>{c.cod}</span>
                {c.dsc && <span className={styles.commessaDsc}>{c.dsc}</span>}
              </label>
            ))}
          </div>
          {commesseScelte.size === 0 && (
            <span className={styles.commesseHint}>Nessuna selezionata = tutte</span>
          )}
        </div>

        <button className="primary" onClick={caricaPezzi} disabled={loading} style={{ width: '100%' }}>
          {loading ? <ArrowClockwise size={14} className={styles.spin} /> : null}
          {' '}Carica pezzi
        </button>

        {pezzi.length > 0 && (
          <button
            className="primary"
            onClick={eseguiOttimizzazione}
            disabled={loading || pezziSelezionati.length === 0}
            style={{ width: '100%', background: '#059669' }}
          >
            <PlayFill size={14} /> Ottimizza ({pezziSelezionati.length} pz)
          </button>
        )}

        <div className={styles.sideDivider} />

        <button className="ghost" onClick={() => setShowConfig(o => !o)} style={{ width: '100%' }}>
          <GearFill size={13} /> Parametri taglio
        </button>
        {showConfig && (
          <ConfigPanel config={config} onChange={setConfig} />
        )}

        <div className={styles.sideDivider} />
        <div className={styles.sideLabel}>Profili</div>
        <div className={styles.legend}>
          {Object.entries(ICON_MAP).map(([cod, { Icon, label, color }]) => (
            <div key={cod} className={styles.legRow}>
              <Icon size={14} color={color} />
              <span className={styles.legCod}>{cod}</span>
              <span className={styles.legDsc}>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.tabs}>
            <button
              className={tab === 'pezzi' ? styles.tabActive : styles.tab}
              onClick={() => setTab('pezzi')}
            >
              Pezzi da tagliare
              {pezzi.length > 0 && (
                <span className="badge gray">
                  {pezziSelezionati.length}/{pezzi.length}
                </span>
              )}
            </button>
            {risultato && (
              <button
                className={tab === 'risultato' ? styles.tabActive : styles.tab}
                onClick={() => setTab('risultato')}
              >
                Piano di taglio <span className="badge green">{risultato.n_barre_tot} barre</span>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className={styles.errorBar}>
            <strong>Errore:</strong> {error}
          </div>
        )}

        <div className={styles.content}>
          {tab === 'pezzi' && (
            pezzi.length > 0
              ? <PezziTable pezzi={pezzi} selected={selected} onSelectionChange={setSelected} />
              : (
                <div className={styles.empty}>
                  <Scissors size={48} color="#cbd5e1" />
                  <p>Seleziona una commessa e clicca <strong>Carica pezzi</strong> per iniziare.</p>
                </div>
              )
          )}
          {tab === 'risultato' && risultato && (
            <OptResult risultato={risultato} />
          )}
        </div>
      </main>
    </div>
  )
}
