import type { WalletId } from '../wizards/types.ts'

const WALLETS: {
  id: WalletId
  name: string
  models: string
  method: string
  desc: string
}[] = [
  {
    id: 'coldcard',
    name: 'Coldcard',
    models: 'MK4 · MK5 · Q',
    method: 'Due procedure: standard e solo dadi',
    desc:
      'Verifichi entrambe le procedure del Coldcard: quella standard, in cui il seed del dispositivo è mescolato obbligatoriamente con la tua entropia, e quella solo dadi, in cui il seed nasce esclusivamente dai tuoi lanci.',
  },
  {
    id: 'bitbox02',
    name: 'BitBox02',
    models: 'BitBox02 · Nova',
    method: 'Parole da dadi + parola di controllo sul dispositivo',
    desc:
      'Generi le parole con 5 dadi e una moneta, le inserisci sul dispositivo con "Restore from recovery words", e verifichi che il dispositivo proponga le stesse 8 parole finali calcolate dall’app.',
  },
  {
    id: 'seedsigner',
    name: 'SeedSigner',
    models: 'DIY',
    method: 'Dadi inseriti sul dispositivo',
    desc:
      'Il SeedSigner calcola il seed direttamente dai tuoi lanci di dado (SHA256 della sequenza, 50 o 99 lanci esatti). Inserirai gli stessi lanci qui e sul dispositivo, e confronterai parole e fingerprint.',
  },
]

export function WalletSelect({
  onSelect,
  onFinalWordTool,
}: {
  onSelect: (w: WalletId) => void
  onFinalWordTool: () => void
}) {
  return (
    <div>
      <div className="card">
        <h2>Quale hardware wallet vuoi verificare?</h2>
        <p className="muted">
          Ogni wallet ha un processo diverso per l&rsquo;entropia utente: la procedura guidata
          replica fedelmente quello del tuo dispositivo.
        </p>
      </div>
      {WALLETS.map((w) => (
        <button key={w.id} className="select-card" onClick={() => onSelect(w.id)}>
          <div className="card-title">
            {w.name}
            <span className="badge">{w.models}</span>
            <span className="badge accent">{w.method}</span>
          </div>
          <div className="card-desc">{w.desc}</div>
        </button>
      ))}

      <div className="field-label">Strumenti rapidi</div>
      <button className="select-card" onClick={onFinalWordTool}>
        <div className="card-title">
          Calcolo parola finale
          <span className="badge accent">11 o 23 parole</span>
        </div>
        <div className="card-desc">
          Inserisci le prime 11 o 23 parole e ottieni subito le parole di controllo finali
          valide (128 o 8 candidate), senza passare dal wizard di un wallet.
        </div>
      </button>
    </div>
  )
}
