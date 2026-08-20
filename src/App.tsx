import { useState } from 'react'
import { Disclaimer, DisclaimerFinal } from './components/Disclaimer.tsx'
import { WalletSelect } from './components/WalletSelect.tsx'
import { ColdcardWizard } from './wizards/ColdcardWizard.tsx'
import { SeedSignerWizard } from './wizards/SeedSignerWizard.tsx'
import { BitboxWizard } from './wizards/ImportFlowWizard.tsx'
import { FinalWordTool } from './wizards/FinalWordTool.tsx'
import type { WalletId } from './wizards/types.ts'

type Phase =
  | { kind: 'disclaimer' }
  | { kind: 'disclaimer2' }
  | { kind: 'select' }
  | { kind: 'wizard'; wallet: WalletId }
  | { kind: 'finalword' }

export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'disclaimer' })
  // Cambiare questa chiave smonta il wizard e ne azzera completamente lo stato:
  // l'entropia di prova vive solo nella memoria dei componenti.
  const [runId, setRunId] = useState(0)

  const exitWizard = () => {
    setRunId((n) => n + 1)
    setPhase({ kind: 'select' })
  }

  const isDanger = phase.kind === 'disclaimer' || phase.kind === 'disclaimer2'

  return (
    <div className={`app${isDanger ? ' danger-mode' : ''}`}>
      <header className="app-header">
        <div className="app-logo">
          <img
            src="https://sicurezzabitcoin.com/wp-content/uploads/2025/01/cropped-sicurezza_bitcoin_marco_cattaneo_logo_maxq.jpg"
            alt="Bitropia — Sicurezza Bitcoin"
          />
        </div>
      </header>

      <main className="main">
        {phase.kind === 'disclaimer' && (
          <Disclaimer onAccept={() => setPhase({ kind: 'disclaimer2' })} />
        )}
        {phase.kind === 'disclaimer2' && (
          <DisclaimerFinal onAccept={() => setPhase({ kind: 'select' })} />
        )}
        {phase.kind === 'select' && (
          <WalletSelect
            onSelect={(wallet) => setPhase({ kind: 'wizard', wallet })}
            onFinalWordTool={() => setPhase({ kind: 'finalword' })}
          />
        )}
        {phase.kind === 'finalword' && <FinalWordTool key={runId} onExit={exitWizard} />}
        {phase.kind === 'wizard' && phase.wallet === 'coldcard' && (
          <ColdcardWizard key={runId} onExit={exitWizard} />
        )}
        {phase.kind === 'wizard' && phase.wallet === 'seedsigner' && (
          <SeedSignerWizard key={runId} onExit={exitWizard} />
        )}
        {phase.kind === 'wizard' && phase.wallet === 'bitbox02' && (
          <BitboxWizard key={runId} onExit={exitWizard} />
        )}
      </main>

      <footer className="app-footer">
        Bitropia è un sistema di controllo parallelo e indipendente, non è affiliato a Coinkite,
        BitBox o Blockstream. Tutto il calcolo avviene nel browser; nessun dato viene inviato o
        salvato. Non usare mai in questa app l&rsquo;entropia del tuo portafoglio reale! Se vuoi,
        salva la pagina e usala offline, ma in ogni caso NON USARE MAI IN QUESTA APP
        L&rsquo;ENTROPIA O IL SEED DEL TUO PORTAFOGLIO REALE!
        <br />
        Bitropia è un progetto open source:{' '}
        <a href="https://github.com/sicurezzabitcoin" target="_blank" rel="noopener noreferrer">
          github.com/sicurezzabitcoin
        </a>
      </footer>
    </div>
  )
}
