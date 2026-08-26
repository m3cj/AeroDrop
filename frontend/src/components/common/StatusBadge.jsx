import { statusLabel } from '../../lib/formatters'

const statusClasses = {
  CREATED:   'badge-created',
  VALIDATED: 'badge-validated',
  READY:     'badge-ready',
  IN_FLIGHT: 'badge-in-flight',
  DELIVERED: 'badge-delivered',
  RETURNING: 'badge-returning',
  COMPLETED: 'badge-completed',
  FAILED:    'badge-failed',
  ABORTED:   'badge-aborted',
}

const dotColors = {
  CREATED:   'bg-slate-400',
  VALIDATED: 'bg-cyan',
  READY:     'bg-emerald-bright',
  IN_FLIGHT: 'bg-cyan animate-ping',
  DELIVERED: 'bg-emerald-bright',
  RETURNING: 'bg-amber-bright animate-pulse',
  COMPLETED: 'bg-emerald-bright',
  FAILED:    'bg-crimson-bright',
  ABORTED:   'bg-slate-500',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${statusClasses[status] || 'badge-created'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[status] || 'bg-slate-400'}`} />
      <span>{statusLabel(status)}</span>
    </span>
  )
}
