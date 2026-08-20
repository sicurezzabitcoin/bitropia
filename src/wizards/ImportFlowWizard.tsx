import { useState, type ComponentType, type ReactNode } from 'react'
import { Callout, WizardShell, WordGrid } from '../components/ui.tsx'
import {
  BitboxWordBuilder,
  CandidateStep,
  ManualWordsForm,
} from '../components/entry.tsx'
import { DeriveView } from '../components/DeriveView.tsx'
import { ResultScreen } from '../components/ResultScreen.tsx'
import type { ScriptType } from '../core/derive.ts'
import type { Outcome, SeedLength } from './types.ts'

type Method = 'official' | 'manual'

interface ImportConfig {
  title: string
  badge: string
  walletName: string
  officialLabel: string
  officialDesc: string
  OfficialBuilder: ComponentType<{ wordNumber: number; onAdd: (w: string) => void }>
  prepare: ReactNode
  deviceEntry: (n: SeedLength) => ReactNode
  candidateInstructions: (n: SeedLength) => ReactNode
  verifyHints: ReactNode
  defaultScript: ScriptType
  /** Se true offre anche l'inserimento diretto delle parole già estratte su carta. */
  offerManualEntry: boolean
}

const STEPS = [
  'Preparazione',
  'Lunghezza seed',
  'Metodo di entropia',
  'Generazione parole',
  'Inserimento sul dispositivo',
  'Parole finali candidate',
  'Verifica derivazioni',
  'Esito',
]

function ImportFlowWizard({ config, onExit }: { config: ImportConfig; onExit: () => void }) {
  const [step, setStep] = useState(0)
  const [nwords, setNwords] = useState<SeedLength | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [built, setBuilt] = useState<string[]>([]) // parole del metodo ufficiale, una alla volta
  const [firstWords, setFirstWords] = useState<string[] | null>(null)
  const [finalWord, setFinalWord] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const target = nwords ? nwords - 1 : 0

  // Senza inserimento manuale il passo "Metodo di entropia" ha una sola opzione:
  // viene saltato e la numerazione mostrata si ricalcola di conseguenza.
  const hasMethodStep = config.offerManualEntry
  const stepLabels = hasMethodStep ? STEPS : STEPS.filter((l) => l !== 'Metodo di entropia')
  const displayStep = !hasMethodStep && step > 2 ? step - 1 : step

  const finish = (o: Outcome) => {
    setOutcome(o)
    setStep(7)
  }

  const acceptFirstWords = (words: string[]) => {
    setFirstWords(words)
    setStep(4)
  }

  const methodCards: { id: Method; title: string; badge?: string; desc: string }[] = [
    { id: 'official', title: config.officialLabel, badge: 'metodo ufficiale', desc: config.officialDesc },
    {
      id: 'manual',
      title: 'Ho già le parole',
      desc: 'Hai già estratto le parole con la tabella cartacea ufficiale del produttore: inseriscile e l’app calcolerà le parole di controllo candidate.',
    },
  ]

  return (
    <WizardShell
      title={config.title}
      badge={config.badge}
      step={displayStep}
      totalSteps={stepLabels.length}
      stepLabel={stepLabels[displayStep]}
      onRestart={onExit}
      onBack={
        step > 0 && step < 7
          ? () => setStep((s) => (s === 3 && !hasMethodStep ? 1 : s - 1))
          : undefined
      }
    >
      {step === 0 && (
        <div>
          {config.prepare}
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
            <p className="muted">La guida ufficiale usa 24 parole; scegli la stessa lunghezza che userai sul dispositivo.</p>
          </div>
          {([24, 12] as const).map((n) => (
            <button
              key={n}
              className={`select-card${nwords === n ? ' selected' : ''}`}
              onClick={() => {
                setNwords(n)
                setBuilt([])
                if (hasMethodStep) {
                  setStep(2)
                } else {
                  setMethod('official')
                  setStep(3)
                }
              }}
            >
              <div className="card-title">
                {n} parole{' '}
                <span className="badge">
                  {n === 24 ? '23 parole da generare + 8 candidate finali' : '11 parole da generare + 128 candidate finali'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && nwords && (
        <div>
          <div className="card">
            <h2>Come procedi con il metodo ufficiale?</h2>
            <p className="muted small">
              Puoi generare le parole qui, guidato passo passo, oppure inserire quelle che hai
              già estratto con la tabella cartacea ufficiale del produttore.
            </p>
          </div>
          {methodCards.map((m) => (
            <button
              key={m.id}
              className={`select-card${method === m.id ? ' selected' : ''}`}
              onClick={() => {
                setMethod(m.id)
                setBuilt([])
                setStep(3)
              }}
            >
              <div className="card-title">
                {m.title}
                {m.badge && <span className="badge accent">{m.badge}</span>}
              </div>
              <div className="card-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      {step === 3 && nwords && method === 'official' && (
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <h2>
              Genera le prime {target} parole — {built.length} fatte
            </h2>
            <div className="progress-outer">
              <div className="progress-inner" style={{ width: `${(built.length / target) * 100}%` }} />
            </div>
            {built.length > 0 && <WordGrid words={built} />}
            {built.length > 0 && (
              <button className="btn ghost" onClick={() => setBuilt((b) => b.slice(0, -1))}>
                ↩ Rimuovi ultima parola
              </button>
            )}
          </div>
          {built.length < target ? (
            <config.OfficialBuilder
              wordNumber={built.length + 1}
              onAdd={(w) => setBuilt((b) => [...b, w])}
            />
          ) : (
            <div className="btn-row">
              <button className="btn primary big push" onClick={() => acceptFirstWords(built)}>
                Ho le {target} parole →
              </button>
            </div>
          )}
        </div>
      )}

      {step === 3 && nwords && method === 'manual' && (
        <ManualWordsForm count={target} onComplete={acceptFirstWords} />
      )}

      {step === 4 && nwords && firstWords && (
        <div>
          <div className="card">
            <h2>Inserisci queste {firstWords.length} parole sul dispositivo</h2>
            <WordGrid words={firstWords} />
          </div>
          {config.deviceEntry(nwords)}
          <div className="btn-row">
            <button className="btn primary big push" onClick={() => setStep(5)}>
              Fatto, sono all&rsquo;ultima parola →
            </button>
          </div>
        </div>
      )}

      {step === 5 && nwords && firstWords && (
        <CandidateStep
          firstWords={firstWords}
          deviceInstructions={config.candidateInstructions(nwords)}
          onConfirm={(w) => {
            setFinalWord(w)
            setStep(6)
          }}
          onMismatch={() => finish({ kind: 'mismatch', where: 'parole finali candidate' })}
        />
      )}

      {step === 6 && firstWords && finalWord && (
        <div>
          <div className="card">
            <h2>Verifica finale: chiavi e indirizzi</h2>
            <p className="muted small">
              Completa il setup sul dispositivo. Poi confronta i valori qui sotto, derivati
              dall&rsquo;app in modo indipendente dalla mnemonica completa ({firstWords.length + 1}{' '}
              parole).
            </p>
            <DeriveView
              words={[...firstWords, finalWord]}
              defaultScript={config.defaultScript}
              hints={config.verifyHints}
            />
          </div>
          <div className="btn-row">
            <button
              className="btn danger"
              onClick={() => finish({ kind: 'mismatch', where: 'fingerprint / xpub / indirizzi' })}
            >
              NON coincidono
            </button>
            <button className="btn ok push big" onClick={() => finish({ kind: 'match' })}>
              Coincidono →
            </button>
          </div>
        </div>
      )}

      {step === 7 && outcome && (
        <ResultScreen outcome={outcome} walletName={config.walletName} onFinish={onExit} />
      )}
    </WizardShell>
  )
}

/* ------------------------------------------------------------------ */
/* Configurazione BitBox02                                             */
/* ------------------------------------------------------------------ */

const bitboxConfig: ImportConfig = {
  title: 'BitBox02',
  badge: 'BitBox02 · Nova',
  walletName: 'BitBox02',
  officialLabel: '5 dadi + moneta',
  officialDesc:
    'Il metodo della guida ufficiale "Roll your own Bitcoin seed": 5 dadi a 6 facce (tenendo solo 1–4) più una moneta per ogni parola. L’app sostituisce la tabella cartacea.',
  OfficialBuilder: BitboxWordBuilder,
  prepare: (
    <div>
      <div className="card">
        <h2>Come funziona la verifica</h2>
        <p>
          Il BitBox02 non accetta dadi direttamente: il percorso ufficiale per l&rsquo;entropia
          utente è generare le parole <strong>offline</strong> e importarle con{' '}
          <em>Restore from recovery words</em>. Il dispositivo calcola da sé le parole di
          controllo finali valide: qui sta la verifica — l&rsquo;app le calcola in modo
          indipendente e <strong>devono essere identiche</strong>. Poi confronterai anche
          fingerprint e xpub.
        </p>
        <h3>Ti serve</h3>
        <ul>
          <li>Un BitBox02 da inizializzare (o resettato) e la BitBoxApp</li>
          <li>5 dadi a 6 facce e una moneta</li>
          <li>
            Firmware aggiornato: dalla 9.4.0 il dispositivo mostra le 8 candidate per 24 parole,
            dalla 9.16.0 limita la tastiera alle candidate anche per 12 parole
          </li>
        </ul>
        <h3>Sul dispositivo</h3>
        <p>
          BitBoxApp → setup → <span className="menu-path">Restore from recovery words</span>
        </p>
      </div>
    </div>
  ),
  deviceEntry: (n) => (
    <Callout kind="info" title="Sul BitBox02">
      <p>
        Nel setup scegli <em>Restore from recovery words</em> e seleziona{' '}
        <strong>{n} words</strong>. Inserisci le prime {n - 1} parole nell&rsquo;ordine, usando i
        touch slider del dispositivo. Se sbagli una parola puoi tornare indietro con{' '}
        <em>Edit previous word</em>.
      </p>
    </Callout>
  ),
  candidateInstructions: (n) => (
    <Callout kind="info" title="Sul BitBox02 — ultima parola">
      <p>
        {n === 24 ? (
          <>
            Arrivato alla 24ª parola, il dispositivo mostra un <strong>menu con le 8 parole
            valide</strong>.
          </>
        ) : (
          <>
            Arrivato alla 12ª parola, la tastiera del dispositivo accetterà{' '}
            <strong>solo le 128 parole valide</strong> (prova a digitare una parola qualsiasi
            fuori lista: non deve essere selezionabile).
          </>
        )}{' '}
        Confronta le opzioni del dispositivo con la lista qui sopra.
      </p>
    </Callout>
  ),
  verifyHints: (
    <Callout kind="info" title="Dove trovare questi valori con il BitBox02">
      <p>
        Completa il setup (password) e apri la BitBoxApp: (1){' '}
        <span className="menu-path">Manage device → Show recovery words</span> per rileggere le
        parole dal dispositivo; (2) seleziona l&rsquo;account Bitcoin →{' '}
        <span className="menu-path">Account info</span>: trovi <em>Root fingerprint</em> ed{' '}
        <em>Extended public key</em> (con &ldquo;Verify on device&rdquo; l&rsquo;xpub compare
        sullo schermo del BitBox02). L&rsquo;account di default è Native SegWit → confronta lo
        zpub.
      </p>
    </Callout>
  ),
  defaultScript: 'bip84',
  offerManualEntry: false,
}

export function BitboxWizard({ onExit }: { onExit: () => void }) {
  return <ImportFlowWizard config={bitboxConfig} onExit={onExit} />
}
