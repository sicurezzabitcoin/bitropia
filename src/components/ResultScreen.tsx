import { useEffect } from 'react'
import { Callout } from './ui.tsx'
import type { Outcome } from '../wizards/types.ts'

export function ResultScreen({
  outcome,
  walletName,
  onFinish,
}: {
  outcome: Outcome
  walletName: string
  onFinish: () => void
}) {
  // Registra la compilazione completata (solo un evento anonimo: wallet usato,
  // nessun dato di entropia). Fallisce in silenzio se l'endpoint non c'è (dev).
  useEffect(() => {
    fetch('track.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletName.toLowerCase().replace(/\s+/g, '') }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {outcome.kind === 'match' ? (
        <div className="card">
          <div className="result-icon">✅</div>
          <h2 className="center">Verifica superata</h2>
          <p className="center">
            Il tuo {walletName} ha prodotto esattamente i risultati calcolati in modo indipendente
            da questa app: con l&rsquo;entropia di prova che gli hai fornito, il dispositivo ha
            fatto il suo dovere.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="result-icon">❌</div>
          <h2 className="center">I risultati NON coincidono</h2>
          <p>
            Punto in cui è emersa la differenza: <strong>{outcome.where}</strong>.
          </p>
          <p>Prima di trarre conclusioni, considera le cause più comuni (in ordine di probabilità):</p>
          <ul>
            <li>
              un errore di trascrizione o di inserimento (un lancio digitato due volte, una parola
              scambiata con una simile, un tasto tenuto premuto troppo a lungo sul dispositivo);
            </li>
            <li>la modalità sbagliata sul dispositivo;</li>
            <li>firmware datato con comportamenti diversi da quelli documentati;</li>
            <li>
              solo in ultima istanza: un dispositivo che non sta usando davvero la tua entropia.
            </li>
          </ul>
          <p>
            Ripeti la prova con una sequenza nuova, facendo attenzione agli inserimenti. Se la
            differenza persiste ed è riproducibile, <strong>non usare il dispositivo</strong> e
            contatta il produttore documentando i passaggi.
          </p>
        </div>
      )}

      <Callout kind="danger" title="Adesso la parte più importante">
        <p>
          L&rsquo;entropia e le parole usate in questa prova sono <strong>bruciate</strong>: sono
          passate da un browser, quindi non sono più segrete.
        </p>
        <p>
          Per creare il tuo portafoglio reale: spegni ogni dispositivo connesso, prendi dadi
          veri, ed esegui <strong>di nuovo l&rsquo;intero processo direttamente sul wallet</strong>{' '}
          con lanci nuovi, senza inserirli in questa app né in nessun altro software. La verifica
          che hai appena fatto vale anche per quel seed: il processo del dispositivo è lo stesso.
        </p>
      </Callout>

      <div className="btn-row">
        <button className="btn primary big" onClick={onFinish}>
          Concludi e cancella tutti i dati
        </button>
      </div>
    </div>
  )
}
