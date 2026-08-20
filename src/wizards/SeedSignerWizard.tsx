import { useMemo, useState } from 'react'
import {
  // SeedSigner usa lo stesso identico algoritmo del Coldcard:
  // SHA256 della stringa ASCII dei lanci '1'..'6', troncato a 16 byte per 12
  // parole prima della somma di controllo (src/seedsigner/helpers/mnemonic_generation.py).
  coldcardDiceToMnemonic as seedsignerDiceToMnemonic,
} from '../core/coldcard.ts'
import { Callout, WizardShell, WordGrid } from '../components/ui.tsx'
import { DeriveView } from '../components/DeriveView.tsx'
import { ResultScreen } from '../components/ResultScreen.tsx'
import type { Outcome, SeedLength } from './types.ts'

const STEPS = ['Preparazione', 'Lunghezza seed', 'Lanci di dado', 'Confronto parole', 'Verifica avanzata', 'Esito']

/** SeedSigner richiede un numero ESATTO di lanci (non un minimo). */
function exactRolls(nwords: SeedLength): number {
  return nwords === 12 ? 50 : 99
}

export function SeedSignerWizard({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0)
  const [nwords, setNwords] = useState<SeedLength | null>(null)
  const [rolls, setRolls] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const target = nwords ? exactRolls(nwords) : 0
  const complete = rolls.length === target
  const words = useMemo(
    () => (nwords && complete ? seedsignerDiceToMnemonic(rolls, nwords) : null),
    [rolls, nwords, complete],
  )

  const finish = (o: Outcome) => {
    setOutcome(o)
    setStep(5)
  }

  return (
    <WizardShell
      title="SeedSigner"
      badge="DIY"
      step={step}
      totalSteps={STEPS.length}
      stepLabel={STEPS[step]}
      onRestart={onExit}
      onBack={step > 0 && step < 5 ? () => setStep((s) => s - 1) : undefined}
    >
      {step === 0 && (
        <div>
          <div className="card">
            <h2>Come funziona la verifica</h2>
            <p>
              Il SeedSigner, in modalità dadi, calcola il seed come{' '}
              <code>SHA256(sequenza dei lanci)</code>: un calcolo deterministico che chiunque può
              rifare. Inserirai la <strong>stessa sequenza di prova</strong> sul dispositivo e in
              questa app, e confronterai parole, fingerprint e indirizzi.
            </p>
            <h3>Ti serve</h3>
            <ul>
              <li>Un SeedSigner assemblato con il firmware ufficiale</li>
              <li>Un dado a 6 facce (per la prova va bene anche una sequenza inventata)</li>
              <li>
                Esattamente <strong>50 lanci</strong> per 12 parole o <strong>99 lanci</strong>{' '}
                per 24 parole: il dispositivo richiede il numero esatto
              </li>
            </ul>
            <h3>Sul dispositivo</h3>
            <p>
              Menu: <span className="menu-path">Tools → New Seed (icona dadi) → 12 words (50 rolls) / 24 words (99 rolls)</span>
            </p>
          </div>
          <Callout kind="warn" title="Usa i dadi, non la fotocamera">
            <p>
              Il SeedSigner offre anche la generazione del seed da un&rsquo;immagine della
              fotocamera: quel metodo <strong>non è riproducibile</strong> e quindi non è
              verificabile. Per questa prova usa solo la modalità a dadi.
            </p>
          </Callout>
          <div className="btn-row">
            <button className="btn primary big" onClick={() => setStep(1)}>
              Avanti →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="card">
            <h2>Quante parole?</h2>
            <p className="muted">Scegli la stessa lunghezza che selezionerai sul SeedSigner.</p>
          </div>
          {([24, 12] as const).map((n) => (
            <button
              key={n}
              className={`select-card${nwords === n ? ' selected' : ''}`}
              onClick={() => {
                setNwords(n)
                setRolls('')
                setStep(2)
              }}
            >
              <div className="card-title">
                {n} parole <span className="badge">{n === 24 ? '256 bit · 99 lanci esatti' : '128 bit · 50 lanci esatti'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && nwords && (
        <div>
          <div className="card">
            <h2>Inserisci i lanci (qui e sul SeedSigner)</h2>
            <p className="muted small">
              Lancia il dado e inserisci ogni risultato <strong>in entrambi</strong>: prima qui,
              poi sul dispositivo (o viceversa, nello stesso ordine). A differenza del Coldcard,
              il SeedSigner non mostra un hash durante l&rsquo;inserimento: il confronto avviene
              sulle parole al termine.
            </p>
            <div className="roll-counter">
              {rolls.length} <span className="target">/ {target} lanci</span>
            </div>
            <div className="dice-pad">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  className="dice-btn"
                  disabled={complete}
                  onClick={() => setRolls((r) => r + String(v))}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button className="btn ghost" disabled={rolls.length === 0} onClick={() => setRolls((r) => r.slice(0, -1))}>
                ↩ Annulla ultimo
              </button>
              <button className="btn danger" disabled={rolls.length === 0} onClick={() => setRolls('')}>
                Azzera
              </button>
            </div>
            <div className="field-label">Sequenza inserita</div>
            <div className="rolls-view">{rolls || '—'}</div>
          </div>

          <div className="btn-row">
            <button className="btn primary big push" disabled={!complete} onClick={() => setStep(3)}>
              Ho finito i lanci →
            </button>
          </div>
        </div>
      )}

      {step === 3 && words && (
        <div>
          <div className="card">
            <h2>Confronta le {nwords} parole</h2>
            <p className="muted small">
              Concluso l&rsquo;ultimo lancio, il SeedSigner mostrerà le parole del seed. Devono
              essere <strong>esattamente queste</strong>, nello stesso ordine.
            </p>
            <WordGrid words={words} />
          </div>
          <div className="btn-row">
            <button className="btn danger" onClick={() => finish({ kind: 'mismatch', where: 'confronto delle parole del seed' })}>
              NON coincidono
            </button>
            <button className="btn ok push big" onClick={() => setStep(4)}>
              Coincidono tutte →
            </button>
          </div>
        </div>
      )}

      {step === 4 && words && (
        <div>
          <div className="card">
            <h2>Verifica avanzata (consigliata)</h2>
            <p className="muted small">
              Le parole coincidono: ottimo. Per una conferma ancora più forte, verifica che il
              dispositivo derivi anche le stesse chiavi e gli stessi indirizzi.
            </p>
            <DeriveView
              words={words}
              defaultScript="bip84"
              hints={
                <Callout kind="info" title="Dove trovare questi valori sul SeedSigner">
                  <p>
                    Completa la creazione del seed di prova: il SeedSigner mostra il{' '}
                    <em>fingerprint</em> nella schermata di riepilogo del seed. Per gli indirizzi:{' '}
                    <span className="menu-path">Tools → Address Explorer</span> (stesso script
                    type, Native SegWit).
                  </p>
                </Callout>
              }
            />
          </div>
          <div className="btn-row">
            <button className="btn danger" onClick={() => finish({ kind: 'mismatch', where: 'fingerprint / indirizzi derivati' })}>
              NON coincidono
            </button>
            <button className="btn ghost" onClick={() => finish({ kind: 'match' })}>
              Salta questo passo
            </button>
            <button className="btn ok push big" onClick={() => finish({ kind: 'match' })}>
              Coincidono →
            </button>
          </div>
        </div>
      )}

      {step === 5 && outcome && (
        <ResultScreen outcome={outcome} walletName="SeedSigner" onFinish={onExit} />
      )}
    </WizardShell>
  )
}
