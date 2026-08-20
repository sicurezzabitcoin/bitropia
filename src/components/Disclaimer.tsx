import { useEffect, useState } from 'react'
import { Callout } from './ui.tsx'

const STATEMENTS = [
  {
    key: 'scope',
    text:
      'Ho capito che questa applicazione è SOLO un controllo parallelo: serve a verificare che il mio hardware wallet usi davvero l’entropia che gli fornisco, replicando il calcolo in modo indipendente.',
  },
  {
    key: 'test-only',
    text:
      'L’entropia e le parole che inserirò qui sono di PROVA, "usa e getta": non le userò MAI per un portafoglio con fondi veri. Un seed passato da un telefono o un computer è da considerarsi compromesso.',
  },
  {
    key: 'redo',
    text:
      'Al termine della verifica ripeterò l’intero processo sul dispositivo, offline, con entropia NUOVA generata da me, senza inserirla in questa applicazione né in nessun altro software.',
  },
] as const

export function Disclaimer({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const allChecked = STATEMENTS.every((s) => checked[s.key])

  // Solo per l'admin del sito: stats.php risponde 200 con il conteggio delle
  // compilazioni completate; per tutti gli altri (401/403/assente) non appare nulla.
  const [completions, setCompletions] = useState<number | null>(null)
  useEffect(() => {
    fetch('stats.php')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.total === 'number') setCompletions(d.total)
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <div className="card">
        <h2>Benvenuto in Bitropia</h2>
        <p>
          Quando chiedi al tuo hardware wallet di generare il seed con i tuoi lanci di dadi, come
          fai a sapere che li sta usando davvero? Questa app ti guida in una{' '}
          <strong>prova generale con entropia di test</strong>: tu e l&rsquo;app fate lo stesso
          calcolo del dispositivo, ognuno per conto proprio, e alla fine confrontate i risultati.
          Se coincidono, il dispositivo fa quello che promette.
        </p>
        <p className="muted small">
          Wallet supportati: Coldcard (MK4 / MK5 / Q) · BitBox02 · SeedSigner. Tutto il calcolo
          avviene nel tuo browser: nessun dato lascia questa pagina.
        </p>
      </div>

      <Callout kind="danger" title="LEGGI CON ATTENZIONE PRIMA DI INIZIARE">
        <p>
          Digitare un seed reale su un telefono o un computer ne annulla la sicurezza. Questa app
          va usata <strong>solo con entropia di prova</strong>, e la verifica va conclusa
          ripetendo il processo offline con entropia nuova.
        </p>
      </Callout>

      {STATEMENTS.map((s) => (
        <label key={s.key} className="check-row">
          <input
            type="checkbox"
            checked={!!checked[s.key]}
            onChange={(e) => setChecked((c) => ({ ...c, [s.key]: e.target.checked }))}
          />
          <span>{s.text}</span>
        </label>
      ))}

      <div className="btn-row">
        <button className="btn primary big" disabled={!allChecked} onClick={onAccept}>
          Avanti →
        </button>
      </div>

      {completions !== null && (
        <p className="muted small center" style={{ marginTop: 28 }}>
          Compilazioni completate dagli utenti: <strong>{completions}</strong>
        </p>
      )}
    </div>
  )
}

export function DisclaimerFinal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <div className="card red-box">
        <div className="result-icon">⚠️</div>
        <h2 className="center">RICORDATI</h2>
        <p style={{ fontSize: 18, textAlign: 'center' }}>
          Se non si fosse capito, <strong>in nessun caso</strong> dovrai usare le parole o
          l&rsquo;entropia usati in questa pagina per un wallet reale! Serve solo per test e, una
          volta verificato il buon funzionamento del tuo hardware wallet nel processo, dovrai
          ripartire dall&rsquo;inizio ed eseguire il processo <strong>SENZA</strong> il supporto
          di questo sito.
        </p>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>
          <strong>Ho capito</strong>
        </span>
      </label>

      <div className="btn-row">
        <button className="btn primary big" disabled={!checked} onClick={onAccept}>
          Iniziamo →
        </button>
      </div>
    </div>
  )
}
