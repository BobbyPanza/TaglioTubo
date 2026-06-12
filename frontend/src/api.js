const BASE = '/api'

export async function fetchCommesse() {
  const r = await fetch(`${BASE}/commesse`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchPezzi({ codCommesse = [], codLotto } = {}) {
  const params = new URLSearchParams()
  codCommesse.forEach(c => params.append('cod_commessa', c))
  if (codLotto) params.set('cod_lotto', codLotto)
  const r = await fetch(`${BASE}/pezzi?${params}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchConfig() {
  const r = await fetch(`${BASE}/config`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function postOttimizza(pezzi, config) {
  const r = await fetch(`${BASE}/ottimizza`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pezzi, config }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
