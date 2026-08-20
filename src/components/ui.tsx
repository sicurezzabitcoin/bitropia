import { useEffect, type ReactNode } from 'react'

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: 'info' | 'warn' | 'danger' | 'ok'
  title?: string
  children: ReactNode
}) {
  return (
    <div className={`callout ${kind}`}>
      {title && <div className="title">{title}</div>}
      {children}
    </div>
  )
}

export function WordGrid({
  words,
  highlight,
  startNumber = 1,
  onSelect,
  selected,
}: {
  words: readonly string[]
  highlight?: string
  startNumber?: number
  onSelect?: (word: string) => void
  selected?: string | null
}) {
  return (
    <div className="word-grid">
      {words.map((w, i) => {
        const isHl = w === highlight || w === selected
        return (
          <div
            key={`${i}-${w}`}
            className={`word-chip${isHl ? ' hl' : ''}${onSelect ? ' selectable' : ''}`}
            onClick={onSelect ? () => onSelect(w) : undefined}
            role={onSelect ? 'button' : undefined}
          >
            <span className="n">{startNumber + i}.</span>
            {w}
          </div>
        )
      })}
    </div>
  )
}

export function StepSegments({ current, total }: { current: number; total: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`seg${i <= current ? ' done' : ''}`} />
      ))}
    </div>
  )
}

export function WizardShell({
  title,
  badge,
  step,
  totalSteps,
  stepLabel,
  onBack,
  onRestart,
  children,
}: {
  title: string
  badge?: string
  step: number
  totalSteps: number
  stepLabel?: string
  onBack?: () => void
  onRestart: () => void
  children: ReactNode
}) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])
  return (
    <div>
      <div className="wizard-top">
        <h1>{title}</h1>
        {badge && <span className="badge accent">{badge}</span>}
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn ghost" onClick={onRestart}>
          ✕ Annulla e cancella
        </button>
      </div>
      <StepSegments current={step} total={totalSteps} />
      {stepLabel && (
        <div className="step-label">
          Passo {step + 1} di {totalSteps} — {stepLabel}
        </div>
      )}
      {children}
      {onBack && (
        <div className="btn-row">
          <button className="btn ghost" onClick={onBack}>
            ← Indietro
          </button>
        </div>
      )}
    </div>
  )
}
