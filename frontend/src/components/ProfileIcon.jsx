import {
  Square, Circle, LayoutSplit, Pentagon,
  RecordCircle, ArrowDownLeft, GripHorizontal,
  Dash, Columns, QuestionCircle,
} from 'react-bootstrap-icons'

const ICON_MAP = {
  TR:       { Icon: Square,       label: 'Tubo Q/R',            color: '#3b82f6' },
  TT:       { Icon: Circle,       label: 'Tubo Tondo',          color: '#06b6d4' },
  SS:       { Icon: RecordCircle, label: 'Tubo Senza Saldatura', color: '#0ea5e9' },
  PT:       { Icon: Dash,          label: 'Piatto',               color: '#f59e0b' },
  QU:       { Icon: Pentagon,     label: 'Quadro pieno',         color: '#8b5cf6' },
  TO:       { Icon: RecordCircle, label: 'Tondo pieno',          color: '#6366f1' },
  UN:       { Icon: Columns,      label: 'UNP',                  color: '#10b981' },
  AN:       { Icon: ArrowDownLeft,label: 'Angolare',             color: '#f97316' },
  IP:       { Icon: LayoutSplit,  label: 'IPE',                  color: '#ec4899' },
  HA:       { Icon: LayoutSplit,  label: 'HEA',                  color: '#d946ef' },
  HB:       { Icon: LayoutSplit,  label: 'HEB',                  color: '#a855f7' },
  EL:       { Icon: ArrowDownLeft,label: 'Ferro Elle',           color: '#84cc16' },
  IN:       { Icon: LayoutSplit,  label: 'INP',                  color: '#eab308' },
  TI:       { Icon: GripHorizontal, label: 'Ferro T',             color: '#14b8a6' },
}

export default function ProfileIcon({ codProfilo, size = 18, showLabel = false }) {
  const entry = ICON_MAP[codProfilo] ?? { Icon: QuestionCircle, label: codProfilo, color: '#94a3b8' }
  const { Icon, label, color } = entry
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>
      <Icon size={size} />
      {showLabel && <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>}
    </span>
  )
}

export { ICON_MAP }
