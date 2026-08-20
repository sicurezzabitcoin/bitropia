import { useMemo, useState, type ReactNode } from 'react'
import { bitboxRollsToIndex, indexToWord, wordlist } from '../core/wordDice.ts'
import { finalWordCandidates } from '../core/finalWord.ts'
import { Callout } from './ui.tsx'

/* ------------------------------------------------------------------ */
/* BitBox02: 5×D6 (1-4, si rilanciano 5 e 6) + moneta → 1 parola      */
/* ------------------------------------------------------------------ */

export function BitboxWordBuilder({
  wordNumber,
  onAdd,
}: {
  wordNumber: number
  onAdd: (word: string) => void
}) {
  const [dice, setDice] = useState<number[]>([])
  const [coin, setCoin] = useState<boolean | null>(null)

  const complete = dice.length === 5 && coin !== null
  const preview = complete ? indexToWord(bitboxRollsToIndex(dice, coin!)) : null

  const reset = () => {
    setDice([])
    setCoin(null)
  }

  return (
    <div className="card">
      <h3>Parola {wordNumber} — lancia 5 dadi e una moneta</h3>
      <p className="muted small">
        Allinea i dadi che mostrano 1–4 (da sinistra a destra); rilancia ogni dado che mostra 5 o
        6 finché non esce 1–4. Senza moneta: un dado con 1–3 vale testa, 4–6 vale croce.
      </p>
      <div className="slot-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className={`slot${dice[i] !== undefined ? ' filled' : dice.length === i ? ' next' : ''}`}>
              {dice[i] ?? '·'}
            </div>
            <span className="slot-label">Dado {i + 1}</span>
          </div>
        ))}
        <div>
          <div className={`slot${coin !== null ? ' filled' : dice.length === 5 ? ' next' : ''}`}>
            {coin === null ? '·' : coin ? 'C' : 'T'}
          </div>
          <span className="slot-label">Moneta</span>
        </div>
      </div>

      {dice.length < 5 ? (
        <div className="dice-pad">
          {[1, 2, 3, 4].map((v) => (
            <button key={v} className="dice-btn" onClick={() => setDice((d) => [...d, v])}>
              {v}
            </button>
          ))}
        </div>
      ) : coin === null ? (
        <div className="dice-pad">
          <button className="btn big" onClick={() => setCoin(false)}>
            Testa
          </button>
          <button className="btn big" onClick={() => setCoin(true)}>
            Croce
          </button>
        </div>
      ) : null}

      {preview && (
        <p>
          Parola risultante: <code style={{ fontSize: 18 }}>{preview}</code>
        </p>
      )}

      <div className="btn-row">
        <button className="btn ghost" onClick={reset} disabled={dice.length === 0 && coin === null}>
          Correggi lanci
        </button>
        <button
          className="btn primary"
          disabled={!complete}
          onClick={() => {
            onAdd(preview!)
            reset()
          }}
        >
          Aggiungi parola {wordNumber} →
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inserimento manuale delle prime n-1 parole                          */
/* ------------------------------------------------------------------ */

export function ManualWordsForm({
  count,
  onComplete,
}: {
  count: number
  onComplete: (words: string[]) => void
}) {
  const [values, setValues] = useState<string[]>(Array(count).fill(''))
  const states = values.map((v) => {
    const w = v.toLowerCase().trim()
    if (w === '') return 'empty'
    return wordlist.includes(w) ? 'ok' : 'bad'
  })
  const allOk = states.every((s) => s === 'ok')

  return (
    <div className="card">
      <h3>Inserisci le prime {count} parole</h3>
      <p className="muted small">
        Hai già estratto le parole con il metodo cartaceo ufficiale? Inseriscile qui (solo parole
        di PROVA). L&rsquo;ultima parola si calcola al passo successivo.
      </p>
      <datalist id="bip39-wordlist">
        {wordlist.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>
      <div className="word-input-grid">
        {values.map((v, i) => (
          <div key={i} className="wi">
            <span className="n">{i + 1}.</span>
            <input
              type="text"
              value={v}
              list="bip39-wordlist"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={states[i] === 'bad' ? { borderColor: 'var(--err)' } : undefined}
              onChange={(e) =>
                setValues((vals) => vals.map((x, j) => (j === i ? e.target.value : x)))
              }
            />
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button
          className="btn primary"
          disabled={!allOk}
          onClick={() => onComplete(values.map((v) => v.toLowerCase().trim()))}
        >
          Continua →
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Passo delle parole finali candidate                                 */
/* ------------------------------------------------------------------ */

export function CandidateStep({
  firstWords,
  deviceInstructions,
  onConfirm,
  onMismatch,
}: {
  firstWords: readonly string[]
  deviceInstructions: ReactNode
  onConfirm: (finalWord: string) => void
  onMismatch: () => void
}) {
  const candidates = useMemo(() => finalWordCandidates(firstWords), [firstWords])
  const [selected, setSelected] = useState<string | null>(null)
  const [listConfirmed, setListConfirmed] = useState(false)

  return (
    <div>
      <div className="card">
        <h3>
          Le {candidates.length} parole finali valide calcolate dall&rsquo;app
        </h3>
        <p className="muted small">
          Con le prime {firstWords.length} parole fissate, solo {candidates.length} parole della
          lista BIP39 rendono valida la somma di controllo. Un dispositivo onesto deve proporre{' '}
          <strong>esattamente queste</strong> — né una in più, né una in meno.
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
        <Callout kind="info" title="Scegli la parola finale">
          <p>
            Scegli l&rsquo;ultima parola <strong>a caso</strong> tra le candidate (ad esempio con
            un altro lancio di dado) sul dispositivo, poi selezionala anche qui sopra, così
            l&rsquo;app potrà derivare fingerprint e indirizzi da confrontare.
          </p>
        </Callout>
      </div>

      {deviceInstructions}

      <label className="check-row">
        <input
          type="checkbox"
          checked={listConfirmed}
          onChange={(e) => setListConfirmed(e.target.checked)}
        />
        <span>
          Ho confrontato: il dispositivo propone esattamente le stesse {candidates.length} parole
          candidate mostrate qui sopra.
        </span>
      </label>

      <div className="btn-row">
        <button className="btn danger" onClick={onMismatch}>
          Le candidate NON coincidono
        </button>
        <button
          className="btn primary push"
          disabled={!listConfirmed || !selected}
          onClick={() => onConfirm(selected!)}
        >
          Coincidono, continua →
        </button>
      </div>
    </div>
  )
}
