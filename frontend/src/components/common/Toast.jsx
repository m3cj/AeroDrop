import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { sound } from '../../lib/audioService'

const ToastContext = createContext(null)

const TOAST_DURATION = 4500

const icons = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-bright shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-bright shrink-0" />,
  error:   <XCircle className="w-4 h-4 text-crimson-bright shrink-0" />,
  info:    <Info className="w-4 h-4 text-cyan shrink-0" />,
}

const borderColors = {
  success: 'border-emerald/50 bg-emerald-950/40 shadow-[0_0_16px_rgba(16,229,153,0.2)]',
  warning: 'border-amber/50 bg-amber-950/40 shadow-[0_0_16px_rgba(245,158,11,0.2)]',
  error:   'border-crimson/50 bg-crimson-950/40 shadow-[0_0_16px_rgba(255,59,92,0.25)]',
  info:    'border-cyan/50 bg-cyan-950/40 shadow-[0_0_16px_rgba(0,240,255,0.2)]',
}

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((type, title, message, duration = TOAST_DURATION) => {
    const id = ++idCounter
    setToasts((t) => [...t.slice(-3), { id, type, title, message }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    success: (title, message) => {
      push('success', title, message)
    },
    warning: (title, message) => {
      sound.playAlert(false)
      push('warning', title, message)
    },
    error: (title, message, dur = 7000) => {
      sound.playAlert(true)
      push('error', title, message, dur)
    },
    info: (title, message) => {
      push('info', title, message)
    },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div
        id="toast-container"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-panel border rounded-xl p-3.5 flex items-start gap-3 min-w-72 max-w-sm pointer-events-auto animate-slide-up select-none ${borderColors[t.type] || borderColors.info}`}
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0 font-mono">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{t.title}</p>
              {t.message && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

export default ToastProvider
