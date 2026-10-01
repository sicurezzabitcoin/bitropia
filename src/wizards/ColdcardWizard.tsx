import { useMemo, useState } from 'react'
import {
  coldcardDiceToMnemonic,
  coldcardLiveHash,
  coldcardMinRolls,
  diceDistributionSuspicious,
} from '../core/coldcard.ts'
import { Callout, WizardShell, WordGrid } from '../components/ui.tsx'
import { DeriveView } from '../components/DeriveView.tsx'
import { ResultScreen } from '../components/ResultScreen.tsx'
import { ColdcardMixWizard } from './ColdcardMixWizard.tsx'
import type { Outcome, SeedLength } from './types.ts'

const STEPS = ['Preparazione', 'Lunghezza seed', 'Lanci di dado', 'Confronto parole', 'Verifica avanzata', 'Esito']

function ColdcardDiceOnlyWizard({
  onExit,
  onChangeProcedure,
}: {
  onExit: () => void
  onChangeProcedure: () => void
}) {
  const [step, setStep] = useState(0)
  const [nwords, setNwords] = useState<SeedLength | null>(null)
  const [rolls, setRolls] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const minRolls = nwords ? coldcardMinRolls(nwords) : 0
  const liveHash = useMemo(() => coldcardLiveHash(rolls), [rolls])
  const words = useMemo(
    () => (nwords && rolls.length >= minRolls ? coldcardDiceToMnemonic(rolls, nwords) : null),
    [rolls, nwords, minRolls],
  )

  const finish = (o: Outcome) => {
    setOutcome(o)
    setStep(5)
  }

  return (
    <WizardShell
      title="Coldcard"
      badge="Solo dadi"
      step={step}
      totalSteps={STEPS.length}
      stepLabel={STEPS[step]}
      onRestart={onExit}
      onBack={step === 0 ? onChangeProcedure : step < 5 ? () => setStep((s) => s - 1) : undefined}
    >
      {step === 0 && (
        <div>
          <div className="card">
            <h2>Procedura solo dadi</h2>
            <p>
              In questa procedura il seed dipende <strong>esclusivamente dai tuoi lanci</strong>:
              il Coldcard non aggiunge alcuna entropia hardware (te lo ricorderà con un avviso).
              Il seed è <code>SHA256(sequenza dei lanci)</code>, un calcolo deterministico che
              chiunque può rifare. Inserirai la <strong>stessa sequenza di prova</strong> sul
              dispositivo e in questa app, e confronterai hash live, parole e indirizzi.
            </p>
            <h3>Ti serve</h3>
            <ul>
              <li>Il Coldcard (MK4, MK5 o Q), senza seed attivo oppure usando un seed temporaneo</li>
              <li>Un dado a 6 facce (per la prova va bene anche una sequenza inventata)</li>
              <li>
                Almeno <strong>50 lanci</strong> per 12 parole o <strong>99 lanci</strong> per 24
                parole: il dispositivo impone lo stesso minimo
              </li>
            </ul>
            <h3>Sul dispositivo</h3>
            <p>
              Seed principale:{' '}
              <span className="menu-path">New Seed Words → Advanced → 12/24 Word Dice Roll</span>
              <br />
              <span className="muted small">
                (oppure, senza cancellare il seed attuale:{' '}
                <span className="menu-path">
                  Advanced/Tools → Temporary Seed → Generate Words → 12/24 Word Dice Roll
                </span>
                ; in questa procedura seed principale e temporaneo danno le stesse parole)
              </span>
            </p>
          </div>
          <Callout kind="info" title="Non confondere le due procedure">
            <p>
              Le voci <em>12 Words / 24 Words</em> senza &ldquo;Dice Roll&rdquo; avviano
              l&rsquo;altra procedura, quella standard (Coldcard + tua entropia). Se è quella che
              vuoi verificare, torna indietro e scegli &ldquo;Seed standard&rdquo;.
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
            <p className="muted">Scegli la stessa lunghezza che selezionerai sul Coldcard.</p>
          </div>
          {([24, 12] as const).map((n) => (
            <button
              key={n}
              className={`select-card${nwords === n ? ' selected' : ''}`}
              onClick={() => {
                setNwords(n)
                setStep(2)
              }}
            >
              <div className="card-title">
                {n} parole <span className="badge">{n === 24 ? '256 bit · minimo 99 lanci' : '128 bit · minimo 50 lanci'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && nwords && (
        <div>
          <div className="card">
            <h2>Inserisci i lanci (qui e sul Coldcard)</h2>
            <p className="muted small">
              Lancia il dado e inserisci ogni risultato <strong>in entrambi</strong>: prima qui,
              poi sul dispositivo (o viceversa, nello stesso ordine). L&rsquo;hash qui sotto deve
              coincidere <em>ad ogni lancio</em> con quello mostrato dal Coldcard. Tocca i tasti
              del dispositivo in modo netto: nei firmware precedenti alla 5.6.1 / 1.5.1Q un tasto
              tenuto premuto poteva registrare lanci doppi.
            </p>
            <div className="roll-counter">
              {rolls.length} <span className="target">/ {minRolls} lanci minimi</span>
            </div>
            <div className="dice-pad">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button key={v} className="dice-btn" onClick={() => setRolls((r) => r + String(v))}>
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
            <div className="field-label">Hash live — deve coincidere con quello sul Coldcard</div>
            <div className="hash-box">{liveHash}</div>
          </div>

          {diceDistributionSuspicious(rolls) && rolls.length >= 10 && (
            <Callout kind="warn" title="Il Coldcard rifiuterà questa sequenza">
              <p>
                Una faccia supera il 30% dei lanci: il Coldcard mostrerà l&rsquo;avviso
                &ldquo;Distribution of dice rolls is not random&rdquo; e interromperà la creazione
                del seed. Rendi la sequenza più varia, qui e sul dispositivo.
              </p>
            </Callout>
          )}

          <div className="btn-row">
            <button className="btn primary big push" disabled={rolls.length < minRolls || diceDistributionSuspicious(rolls)} onClick={() => setStep(3)}>
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
              Concludi l&rsquo;inserimento sul Coldcard (tasto <kbd>{'✔'}</kbd> / <kbd>ENTER</kbd>):
              mostrerà le parole del seed. Devono essere <strong>esattamente queste</strong>,
              nello stesso ordine.
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
                <Callout kind="info" title="Dove trovare questi valori sul Coldcard">
                  <p>
                    Completa il setup del seed di prova sul dispositivo, poi: fingerprint in{' '}
                    <span className="menu-path">Advanced/Tools → View Identity</span>, indirizzi in{' '}
                    <span className="menu-path">Address Explorer</span> (stesso script type e
                    percorso).
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
        <ResultScreen outcome={outcome} walletName="Coldcard" onFinish={onExit} />
      )}
    </WizardShell>
  )
}

type Procedure = 'mix' | 'dice'

const PROCEDURES: { id: Procedure; title: string; badge: string; desc: string; menu: string }[] = [
  {
    id: 'mix',
    title: 'Seed standard: Coldcard + tua entropia',
    badge: 'firmware 5.6.2 / 1.5.2Q o successivi',
    menu: 'New Seed Words → 12 Words / 24 Words',
    desc:
      'La procedura normale. Il Coldcard genera un proprio seed con i generatori hardware e lo mescola obbligatoriamente con la tua entropia (dadi o monete). Verifichi che il mix avvenga davvero, usando le parole “View TRNG Words”.',
  },
  {
    id: 'dice',
    title: 'Solo dadi',
    badge: 'nessuna entropia hardware',
    menu: 'New Seed Words → Advanced → 12/24 Word Dice Roll',
    desc:
      'La procedura avanzata. Il seed nasce esclusivamente dai tuoi lanci, senza alcun contributo del dispositivo. Verifichi che il Coldcard usi proprio i tuoi lanci.',
  },
]

export function ColdcardWizard({ onExit }: { onExit: () => void }) {
  const [procedure, setProcedure] = useState<Procedure | null>(null)
  const back = () => setProcedure(null)

  if (procedure === 'mix') return <ColdcardMixWizard onExit={onExit} onChangeProcedure={back} />
  if (procedure === 'dice') return <ColdcardDiceOnlyWizard onExit={onExit} onChangeProcedure={back} />

  return (
    <div>
      <div className="wizard-top">
        <h1>Coldcard</h1>
        <span className="badge accent">MK4 · MK5 · Q</span>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn ghost" onClick={onExit}>
          ✕ Annulla e cancella
        </button>
      </div>
      <div className="card">
        <h2>Quale procedura vuoi verificare?</h2>
        <p className="muted">
          Il Coldcard ha due modi di creare un seed con la tua entropia. Scegli quello che
          userai sul dispositivo: Bitropia rifarà esattamente quel calcolo.
        </p>
      </div>
      {PROCEDURES.map((p) => (
        <button key={p.id} className="select-card" onClick={() => setProcedure(p.id)}>
          <div className="card-title">
            {p.title}
            <span className="badge">{p.badge}</span>
          </div>
          <div className="card-desc">
            <span className="menu-path">{p.menu}</span>
            <br />
            {p.desc}
          </div>
        </button>
      ))}
    </div>
  )
}
