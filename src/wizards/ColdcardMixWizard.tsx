import { useMemo, useState } from 'react'
import {
  MIX_MINIMUM,
  coldcardMixMnemonic,
  mixDistributionSuspicious,
  trngWordsToSeed,
  type MixMethod,
  type MixPurpose,
} from '../core/coldcardMix.ts'
import { Callout, WizardShell, WordGrid } from '../components/ui.tsx'
import { ManualWordsForm } from '../components/entry.tsx'
import { DeriveView } from '../components/DeriveView.tsx'
import { ResultScreen } from '../components/ResultScreen.tsx'
import type { Outcome, SeedLength } from './types.ts'

/**
 * Coldcard — procedura standard (firmware ≥ 5.6.2 / 1.5.2Q): il seed del
 * dispositivo (STM32 TRNG + SE1 + SE2) viene mescolato obbligatoriamente con
 * entropia dell'utente. Il dispositivo mostra il proprio contributo ("View TRNG
 * Words") PRIMA che l'utente inserisca i lanci: con quelle 24 parole e gli
 * stessi lanci l'app ricalcola le parole finali (ricetta di verify_seed_mix.py).
 */

const STEPS = [
  'Preparazione',
  'Tipo di seed',
  'Lunghezza seed',
  'Parole TRNG del Coldcard',
  'Metodo',
  'Inserimento',
  'Confronto parole',
  'Verifica avanzata',
  'Esito',
]

const PURPOSE_INFO: Record<
  Exclude<MixPurpose, 'ccc'>,
  { title: string; menu: string; desc: string }
> = {
  master: {
    title: 'Seed principale',
    menu: 'New Seed Words → 12 Words / 24 Words',
    desc: 'Disponibile solo se il Coldcard non ha ancora un seed.',
  },
  temporary: {
    title: 'Seed temporaneo',
    menu: 'Advanced/Tools → Temporary Seed → Generate Words → 12 Words / 24 Words',
    desc: 'Non tocca il seed già presente: adatto alla prova su un Coldcard già in uso.',
  },
}

export function ColdcardMixWizard({
  onExit,
  onChangeProcedure,
}: {
  onExit: () => void
  onChangeProcedure: () => void
}) {
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<'master' | 'temporary' | null>(null)
  const [nwords, setNwords] = useState<SeedLength | null>(null)
  const [trngWords, setTrngWords] = useState<string[] | null>(null)
  const [method, setMethod] = useState<MixMethod | null>(null)
  const [symbols, setSymbols] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const min = method ? MIX_MINIMUM[method] : 0
  const suspicious = method ? mixDistributionSuspicious(symbols, method) : false
  const words = useMemo(() => {
    if (!trngWords || !method || !nwords || !purpose || symbols.length < min) return null
    return coldcardMixMnemonic(trngWordsToSeed(trngWords), symbols, method, nwords, purpose)
  }, [trngWords, method, nwords, purpose, symbols, min])

  const finish = (o: Outcome) => {
    setOutcome(o)
    setStep(8)
  }

  return (
    <WizardShell
      title="Coldcard"
      badge="Dispositivo + tua entropia"
      step={step}
      totalSteps={STEPS.length}
      stepLabel={STEPS[step]}
      onRestart={onExit}
      onBack={
        step === 0 ? onChangeProcedure : step < 8 ? () => setStep((s) => s - 1) : undefined
      }
    >
      {step === 0 && (
        <div>
          <div className="card">
            <h2>Procedura standard: Coldcard + tua entropia</h2>
            <p>
              Dal firmware 5.6.1 (MK4/MK5) e 1.5.1Q (Q) il Coldcard non crea più un seed usando
              solo i propri generatori hardware: ti chiede <strong>sempre</strong> di aggiungere
              entropia tua. Il seed finale è un mix dei due contributi, così se uno dei due fosse
              debole l&rsquo;altro lo protegge.
            </p>
            <p>
              Per poterlo verificare, il Coldcard ti mostra il proprio contributo, 24 parole
              (&ldquo;View TRNG Words&rdquo;), <strong>prima</strong> che tu inserisca i lanci.
              Con quelle parole e i tuoi stessi lanci, Bitropia rifà lo stesso calcolo e ottiene
              le parole che il dispositivo deve mostrarti alla fine.
            </p>
            <h3>Ti serve</h3>
            <ul>
              <li>
                Il Coldcard con firmware <strong>5.6.2 o successivo</strong> (MK4, MK5) oppure{' '}
                <strong>1.5.2Q o successivo</strong> (Q). Nella 5.6.1 / 1.5.1Q &ldquo;View TRNG
                Words&rdquo; non c&rsquo;è: lì la verifica non è possibile.
              </li>
              <li>
                Un dado a 6 facce (almeno <strong>50 lanci</strong>) oppure una moneta (almeno{' '}
                <strong>128 lanci</strong>): per la prova va bene anche una sequenza inventata,
                purché varia
              </li>
            </ul>
          </div>
          <Callout kind="warn" title="Usa dadi o monete, non Mash Keys">
            <p>
              Il Coldcard offre anche &ldquo;Mash Keys&rdquo; (premere tasti a caso): usa
              l&rsquo;istante esatto di ogni pressione, che nessuno può conoscere né ripetere.
              Per questo non è verificabile.
            </p>
          </Callout>
          <Callout kind="warn" title="La regola per il seed vero">
            <p>
              Quando creerai il seed vero, ripeti <strong>esattamente gli stessi passi</strong>,
              compresa l&rsquo;apertura di &ldquo;View TRNG Words&rdquo; (senza trascriverle né
              inserirle qui). Il dispositivo sa se le hai aperte: se lo fai sempre, non può
              distinguere la prova dal seed vero.
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
            <h2>Che tipo di seed crei sul Coldcard?</h2>
            <p className="muted">Scegli lo stesso tipo che userai sul dispositivo.</p>
          </div>
          {(['master', 'temporary'] as const).map((p) => (
            <button
              key={p}
              className={`select-card${purpose === p ? ' selected' : ''}`}
              onClick={() => {
                setPurpose(p)
                setStep(2)
              }}
            >
              <div className="card-title">{PURPOSE_INFO[p].title}</div>
              <div className="card-desc">
                <span className="menu-path">{PURPOSE_INFO[p].menu}</span>
                <br />
                {PURPOSE_INFO[p].desc}
              </div>
            </button>
          ))}
          <Callout kind="info" title="Perché la scelta conta">
            <p>
              Il Coldcard inserisce nel calcolo un&rsquo;etichetta diversa per i due tipi di seed.
              A parità di parole TRNG e di lanci, le parole finali cambiano completamente: se qui
              scegli il tipo sbagliato, la verifica fallirà anche con un dispositivo onesto.
            </p>
          </Callout>
        </div>
      )}

      {step === 2 && (
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
                setStep(3)
              }}
            >
              <div className="card-title">
                {n} parole <span className="badge">{n === 24 ? '256 bit' : '128 bit'}</span>
              </div>
            </button>
          ))}
          <Callout kind="info" title="Le parole TRNG sono sempre 24">
            <p>
              Anche per un seed da 12 parole il Coldcard usa tutti i 256 bit del proprio
              contributo e accorcia solo il risultato finale: al prossimo passo inserirai
              comunque 24 parole.
            </p>
          </Callout>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="card">
            <h2>Apri &ldquo;View TRNG Words&rdquo; sul Coldcard</h2>
            <p>
              Dopo il tipo di seed e la lunghezza, il Coldcard mostra il menu
              dell&rsquo;entropia: <em>Mash Keys · Dice Rolls · Coin Flips · View TRNG Words</em>.
              Apri <strong>View TRNG Words prima di scegliere il metodo</strong>: dopo aver
              inserito i lanci non è più possibile vederle.
            </p>
          </div>
          <Callout kind="danger" title="Sono segrete come un seed">
            <p>
              Chi conosce queste 24 parole insieme ai tuoi lanci può ricreare il wallet. Inserirle
              qui va bene solo perché si tratta di una prova.
            </p>
          </Callout>
          <ManualWordsForm
            count={24}
            initial={trngWords}
            title="Le 24 parole TRNG mostrate dal Coldcard"
            intro="Copiale nello stesso ordine in cui le mostra il dispositivo."
            validate={(w) => {
              try {
                trngWordsToSeed(w)
                return null
              } catch {
                return 'Le parole non formano una sequenza valida: controlla di averle copiate tutte e nell’ordine giusto.'
              }
            }}
            onComplete={(w) => {
              setTrngWords(w)
              setStep(4)
            }}
          />
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="card">
            <h2>Con cosa aggiungi la tua entropia?</h2>
            <p className="muted">Sul Coldcard sceglierai lo stesso metodo.</p>
          </div>
          {(['dice', 'coin'] as const).map((m) => (
            <button
              key={m}
              className={`select-card${method === m ? ' selected' : ''}`}
              onClick={() => {
                setMethod(m)
                setSymbols('')
                setStep(5)
              }}
            >
              <div className="card-title">
                {m === 'dice' ? 'Dadi' : 'Monete'}
                <span className="badge">
                  {m === 'dice' ? 'Dice Rolls · minimo 50 lanci' : 'Coin Flips · minimo 128 lanci'}
                </span>
              </div>
            </button>
          ))}
          <div className="select-card" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <div className="card-title">
              Mash Keys <span className="badge">non verificabile</span>
            </div>
            <div className="card-desc">
              Usa l&rsquo;istante esatto delle pressioni dei tasti: impossibile da ripetere qui.
            </div>
          </div>
        </div>
      )}

      {step === 5 && method && (
        <div>
          <div className="card">
            <h2>
              Inserisci {method === 'dice' ? 'i lanci' : 'le monete'} (qui e sul Coldcard)
            </h2>
            <p className="muted small">
              Inserisci ogni risultato <strong>in entrambi</strong>, nello stesso ordine. In
              questa procedura il Coldcard non mostra un hash durante l&rsquo;inserimento: il
              confronto avverrà sulle parole finali. Puoi andare oltre il minimo, ma il numero
              di inserimenti deve essere identico sui due lati.
            </p>
            <div className="roll-counter">
              {symbols.length} <span className="target">/ {min} minimi</span>
            </div>
            <div className="dice-pad">
              {method === 'dice' ? (
                [1, 2, 3, 4, 5, 6].map((v) => (
                  <button
                    key={v}
                    className="dice-btn"
                    onClick={() => setSymbols((s) => s + String(v))}
                  >
                    {v}
                  </button>
                ))
              ) : (
                <>
                  <button className="btn big" onClick={() => setSymbols((s) => s + '1')}>
                    1 · Testa
                  </button>
                  <button className="btn big" onClick={() => setSymbols((s) => s + '0')}>
                    0 · Croce
                  </button>
                </>
              )}
            </div>
            {method === 'coin' && (
              <p className="muted small">
                Come sul Coldcard: <kbd>1</kbd> = testa, <kbd>0</kbd> = croce.
              </p>
            )}
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button
                className="btn ghost"
                disabled={symbols.length === 0}
                onClick={() => setSymbols((s) => s.slice(0, -1))}
              >
                ↩ Annulla ultimo
              </button>
              <button
                className="btn danger"
                disabled={symbols.length === 0}
                onClick={() => setSymbols('')}
              >
                Azzera
              </button>
            </div>
            <div className="field-label">Sequenza inserita</div>
            <div className="rolls-view">{symbols || '—'}</div>
          </div>

          {suspicious && symbols.length >= 10 && (
            <Callout kind="warn" title="Il Coldcard rifiuterà questa sequenza">
              <p>
                {method === 'dice'
                  ? 'Una faccia supera il 30% dei lanci'
                  : 'Testa o croce supera il 65% dei lanci'}
                : il Coldcard mostrerà l&rsquo;avviso di distribuzione non casuale e ti farà
                ripetere l&rsquo;inserimento (le parole TRNG restano le stesse). Rendi la
                sequenza più varia, qui e sul dispositivo.
              </p>
            </Callout>
          )}

          <div className="btn-row">
            <button
              className="btn primary big push"
              disabled={symbols.length < min || suspicious}
              onClick={() => setStep(6)}
            >
              Ho finito →
            </button>
          </div>
        </div>
      )}

      {step === 6 && words && (
        <div>
          <div className="card">
            <h2>Confronta le {nwords} parole</h2>
            <p className="muted small">
              Concludi l&rsquo;inserimento sul Coldcard (tasto <kbd>{'✔'}</kbd> /{' '}
              <kbd>ENTER</kbd>): mostrerà le parole del nuovo seed. Devono essere{' '}
              <strong>esattamente queste</strong>, nello stesso ordine.
            </p>
            <WordGrid words={words} />
          </div>
          <div className="btn-row">
            <button
              className="btn danger"
              onClick={() => finish({ kind: 'mismatch', where: 'confronto delle parole del seed' })}
            >
              NON coincidono
            </button>
            <button className="btn ok push big" onClick={() => setStep(7)}>
              Coincidono tutte →
            </button>
          </div>
        </div>
      )}

      {step === 7 && words && (
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
                    <span className="menu-path">Advanced/Tools → View Identity</span>, indirizzi
                    in <span className="menu-path">Address Explorer</span> (stesso script type e
                    percorso).
                  </p>
                </Callout>
              }
            />
          </div>
          <div className="btn-row">
            <button
              className="btn danger"
              onClick={() => finish({ kind: 'mismatch', where: 'fingerprint / indirizzi derivati' })}
            >
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

      {step === 8 && outcome && (
        <ResultScreen outcome={outcome} walletName="Coldcard" onFinish={onExit} />
      )}
    </WizardShell>
  )
}
