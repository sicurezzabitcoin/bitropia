import { useMemo, useState } from 'react'
import { Callout, WizardShell, WordGrid } from '../components/ui.tsx'
import { ManualWordsForm } from '../components/entry.tsx'
import { expectedCandidateCount, finalWordCandidates } from '../core/finalWord.ts'

/**
 * Strumento rapido: dalle prime 11 o 23 parole calcola le parole di controllo
 * finali valide (128 o 8 candidate). Nessun wallet coinvolto.
 */

const STEPS = ['Lunghezza seed', 'Inserimento parole', 'Parole finali valide']

export function FinalWordTool({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0)
  const [nwords, setNwords] = useState<12 | 24 | null>(null)
  const [words, setWords] = useState<string[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const candidates = useMemo(
    () => (words ? finalWordCandidates(words) : null),
    [words],
  )

  return (
    <WizardShell
      title="Calcolo parola finale"
      badge="strumento rapido"
      step={step}
      totalSteps={STEPS.length}
      stepLabel={STEPS[step]}
      onRestart={onExit}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
    >
      {step === 0 && (
        <div>
          <div className="card">
            <h2>Quante parole avrà la mnemonica completa?</h2>
            <p className="muted small">
              Inserirai tutte le parole tranne l&rsquo;ultima: l&rsquo;app calcola quali parole
              della lista BIP39 sono valide come parola di controllo. È lo stesso calcolo che
              fanno il BitBox02 sull&rsquo;ultima parola e il SeedSigner con &ldquo;Calc
              12th/24th word&rdquo;.
            </p>
          </div>
          {([24, 12] as const).map((n) => (
            <button
              key={n}
              className={`select-card${nwords === n ? ' selected' : ''}`}
              onClick={() => {
                setNwords(n)
                setWords(null)
                setSelected(null)
                setStep(1)
              }}
            >
              <div className="card-title">
                {n} parole{' '}
                <span className="badge">
                  inserisci {n - 1} parole → {expectedCandidateCount(n)} candidate finali
                </span>
              </div>
            </button>
          ))}
          <Callout kind="danger" title="Solo parole di prova">
            <p>
              Non inserire mai qui le parole di un portafoglio reale: un seed passato da un
              browser è da considerarsi compromesso.
            </p>
          </Callout>
        </div>
      )}

      {step === 1 && nwords && (
        <ManualWordsForm
          count={nwords - 1}
          onComplete={(w) => {
            setWords(w)
            setSelected(null)
            setStep(2)
          }}
        />
      )}

      {step === 2 && nwords && words && candidates && (
        <div>
          <div className="card">
            <h2>
              {candidates.length} parole finali valide
            </h2>
            <p className="muted small">
              Con le {words.length} parole inserite, solo queste {candidates.length} parole della
              lista BIP39 completano una mnemonica con somma di controllo valida. Tocca una candidata per
              vedere la mnemonica completa.
            </p>
            <div className="candidate-grid">
              {candidates.map((w) => (
                <div
                  key={w}
                  className={`word-chip selectable${w === selected ? ' hl' : ''}`}
                  onClick={() => setSelected(w)}
                  role="button"
                >
                  {w}
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <div className="card">
              <h3>Mnemonica completa con &ldquo;{selected}&rdquo;</h3>
              <WordGrid words={[...words, selected]} highlight={selected} />
            </div>
          )}

          <Callout kind="info" title="Come scegliere la parola finale">
            <p>
              Se le prime {words.length} parole vengono dai tuoi lanci, scegli l&rsquo;ultima{' '}
              <strong>a caso</strong> tra le candidate (es. con un lancio di dado): aggiunge{' '}
              {nwords === 24 ? '3' : '7'} bit di entropia. Sceglierla &ldquo;a occhio&rdquo;
              introduce bias.
            </p>
          </Callout>

          <div className="btn-row">
            <button
              className="btn ghost"
              onClick={() => {
                setWords(null)
                setSelected(null)
                setStep(1)
              }}
            >
              ↩ Nuovo calcolo
            </button>
            <button className="btn primary push" onClick={onExit}>
              Concludi e cancella
            </button>
          </div>
        </div>
      )}
    </WizardShell>
  )
}
