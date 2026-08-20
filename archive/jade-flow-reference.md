# Flusso Blockstream Jade — archivio per ricostruzione

Rimosso dal codice il 2026-08-20 su richiesta ("per ora"). Questo documento contiene tutto il
necessario per ricostruirlo: ricerca verificata, formule, vettori di test e il codice eliminato.

## Ricerca (fonti ufficiali, verificate ad agosto 2026)

- **Metodo ufficiale Blockstream**: 2 dadi a 16 facce (D1, D2) + 1 dado a 8 facce (D3), lanciati
  insieme → 16×16×8 = 2048 combinazioni = esattamente 1 parola BIP39 per lancio, senza bias.
  11 o 23 lanci, poi la funzione **Calculate final word** sul dispositivo.
- **Formula indice wordlist** (verificata contro JadeDiceRollsGuide.pdf, che stampa anche gli
  indici): `idx = (D1-1)*128 + (D2-1)*8 + (D3-1)`.
  - Vettori verificati: 1-1-1 → abandon (0) · 10-9-8 → **ocean (1223)** (esempio del PDF stesso)
    · 2-2-1 → baby (136) · 2-6-2 → benefit (169) · 16-16-8 → zoo (2047).
- **Sul dispositivo**: `Options → Temporary Signer → 12/24 Words` (consigliato per il test: non
  tocca il wallet salvato, si cancella allo spegnimento) oppure
  `Set Up Jade → Advanced Setup → Restore Wallet`. All'ultima parola selezionare **Calculate**:
  il Jade limita la scelta alle candidate valide (**128** per 12 parole, **8** per 24) o può
  scegliere lui a caso. Funzione presente dal **firmware ≥ 0.1.45**.
- **Verifica**: il Jade **non rimostra mai la mnemonica** dopo il setup → il confronto passa dal
  **wallet fingerprint** (8 caratteri esadecimali in basso nella schermata principale), da
  `Options → Wallet → Export Xpub` e dalla verifica indirizzi della companion app.
- **Modelli**: Jade classic, Jade Plus (camera: supporta anche import SeedQR / **CompactSeedQR**
  = entropia raw 128/256 bit via QR), Jade Core (niente camera, solo tastiera).
- Fonti: guida ufficiale https://help.blockstream.com/blockstream-jade/add-more-security-functionality/create-a-recovery-phrase-using-dice
  · PDF JadeDiceRollsGuide (storage.googleapis.com/dxp-production-assets/.../JadeDiceRollsGuide.pdf)
  · firmware: `valid_final_words` in mnemonic.c (stesso approccio brute-force delle candidate).

## Come ricostruirlo

Il wizard Jade usava l'infrastruttura condivisa `ImportFlowWizard` (config-driven, la stessa di
BitBox02) con `offerManualEntry: true`. Passi: ripristinare i 5 blocchi di codice qui sotto,
aggiungere `'jade'` a WalletId, la card in WalletSelect, la route in App.tsx e `'jade'`
nell'allowlist di `deploy/track.php`.

### 1. `src/core/wordDice.ts` — funzione lookup (con test)

```ts
/**
 * Jade — metodo Blockstream (JadeDiceRollsGuide.pdf):
 * 2 dadi a 16 facce (D1, D2) + 1 dado a 8 facce (D3), lanciati insieme.
 *
 * indice = (D1-1)·128 + (D2-1)·8 + (D3-1)
 *
 * Verificato contro la tabella ufficiale: 1-1-1 → "abandon" (0),
 * 10-9-8 → "ocean" (1223), 2-2-1 → "baby" (136).
 */
export function jadeRollsToIndex(d1: number, d2: number, d3: number): number {
  if (!Number.isInteger(d1) || d1 < 1 || d1 > 16) throw new Error('D1 deve valere da 1 a 16')
  if (!Number.isInteger(d2) || d2 < 1 || d2 > 16) throw new Error('D2 deve valere da 1 a 16')
  if (!Number.isInteger(d3) || d3 < 1 || d3 > 8) throw new Error('D3 deve valere da 1 a 8')
  return (d1 - 1) * 128 + (d2 - 1) * 8 + (d3 - 1)
}
```

Test (in `src/core/core.test.ts`):

```ts
describe('Tabella Jade (2×D16 + D8) — JadeDiceRollsGuide.pdf', () => {
  it('celle verificate contro il PDF ufficiale', () => {
    expect(indexToWord(jadeRollsToIndex(1, 1, 1))).toBe('abandon')
    expect(indexToWord(jadeRollsToIndex(10, 9, 8))).toBe('ocean') // esempio del PDF
    expect(indexToWord(jadeRollsToIndex(2, 2, 1))).toBe('baby')
    expect(indexToWord(jadeRollsToIndex(16, 16, 8))).toBe('zoo')
  })
  it('rifiuta valori fuori intervallo', () => {
    expect(() => jadeRollsToIndex(17, 1, 1)).toThrow()
    expect(() => jadeRollsToIndex(1, 0, 1)).toThrow()
    expect(() => jadeRollsToIndex(1, 1, 9)).toThrow()
  })
})
```

### 2. `src/components/entry.tsx` — builder di parola

```tsx
export function JadeWordBuilder({
  wordNumber,
  onAdd,
}: {
  wordNumber: number
  onAdd: (word: string) => void
}) {
  const [vals, setVals] = useState<number[]>([])

  const labels = ['D1 (16 facce)', 'D2 (16 facce)', 'D3 (8 facce)']
  const maxForSlot = (i: number) => (i < 2 ? 16 : 8)
  const complete = vals.length === 3
  const preview = complete ? indexToWord(jadeRollsToIndex(vals[0], vals[1], vals[2])) : null

  return (
    <div className="card">
      <h3>Parola {wordNumber} — lancia i tre dadi insieme</h3>
      <p className="muted small">
        Due dadi a 16 facce (D1, D2) e uno a 8 facce (D3): 16 × 16 × 8 = 2048 combinazioni, una
        per ogni parola BIP39, senza alcun bias.
      </p>
      <div className="slot-row">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className={`slot${vals[i] !== undefined ? ' filled' : vals.length === i ? ' next' : ''}`}>
              {vals[i] ?? '·'}
            </div>
            <span className="slot-label">{labels[i]}</span>
          </div>
        ))}
      </div>

      {!complete && (
        <div className="dice-pad">
          {Array.from({ length: maxForSlot(vals.length) }, (_, k) => k + 1).map((v) => (
            <button key={v} className="dice-btn small" onClick={() => setVals((d) => [...d, v])}>
              {v}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <p>
          Parola risultante: <code style={{ fontSize: 18 }}>{preview}</code>
        </p>
      )}

      <div className="btn-row">
        <button className="btn ghost" onClick={() => setVals([])} disabled={vals.length === 0}>
          Correggi lanci
        </button>
        <button
          className="btn primary"
          disabled={!complete}
          onClick={() => {
            onAdd(preview!)
            setVals([])
          }}
        >
          Aggiungi parola {wordNumber} →
        </button>
      </div>
    </div>
  )
}
```

### 3. `src/wizards/ImportFlowWizard.tsx` — config e export

```tsx
const jadeConfig: ImportConfig = {
  title: 'Blockstream Jade',
  badge: 'Jade · Plus · Core',
  walletName: 'Jade',
  officialLabel: '2 dadi a 16 facce + 1 a 8 facce (metodo Blockstream)',
  officialDesc:
    'Il metodo della guida ufficiale Jade: D1 e D2 a 16 facce più D3 a 8 facce lanciati insieme — 2048 combinazioni esatte, una per parola. L'app sostituisce la tabella cartacea.',
  OfficialBuilder: JadeWordBuilder,
  prepare: (
    <div>
      <div className="card">
        <h2>Come funziona la verifica</h2>
        <p>
          Il Jade non accetta dadi direttamente: il metodo ufficiale è generare le parole{' '}
          <strong>offline</strong> con i dadi e inserirle sul dispositivo, lasciando al Jade il
          calcolo dell&rsquo;ultima parola (<em>Calculate final word</em>, dal firmware 0.1.45).
          La verifica è doppia: le parole finali proposte dal Jade devono coincidere con quelle
          calcolate dall&rsquo;app, e il <strong>fingerprint del wallet</strong> deve coincidere
          con quello derivato dall&rsquo;app.
        </p>
        <h3>Ti serve</h3>
        <ul>
          <li>Un Jade, Jade Plus o Jade Core con firmware aggiornato (≥ 0.1.45)</li>
          <li>2 dadi a 16 facce + 1 dado a 8 facce</li>
        </ul>
        <h3>Sul dispositivo</h3>
        <p>
          <span className="menu-path">Options → Temporary Signer → 12/24 Words</span>
          <br />
          <span className="muted small">
            Consigliato per la prova: il Temporary Signer non tocca il wallet salvato e si
            cancella allo spegnimento. In alternativa:{' '}
            <span className="menu-path">Set Up Jade → Advanced Setup → Restore Wallet</span>
          </span>
        </p>
      </div>
      <Callout kind="warn" title="Nota importante sul Jade">
        <p>
          Dopo il setup il Jade <strong>non rimostra mai</strong> la frase di recupero: il
          confronto passa dal <em>wallet fingerprint</em> (le 8 cifre esadecimali in basso nella
          schermata principale) e dagli indirizzi — è esattamente ciò che faremo negli ultimi
          passi.
        </p>
      </Callout>
    </div>
  ),
  deviceEntry: (n) => (
    <Callout kind="info" title="Sul Jade">
      <p>
        Scegli <strong>{n} Words</strong> e inserisci le prime {n - 1} parole con la tastiera del
        dispositivo (l&rsquo;autocompletamento BIP39 accelera l&rsquo;inserimento).
      </p>
    </Callout>
  ),
  candidateInstructions: (n) => (
    <Callout kind="info" title="Sul Jade — ultima parola">
      <p>
        Alla {n}ª parola seleziona <strong>Calculate</strong>: il Jade limita la scelta alle{' '}
        {n === 24 ? '8' : '128'} parole valide, oppure può sceglierne una a caso lui stesso. Se
        lasci scegliere il Jade, seleziona qui sopra la parola che ha scelto; in ogni caso,
        verifica che le opzioni proposte dal dispositivo coincidano con la lista dell&rsquo;app.
      </p>
    </Callout>
  ),
  verifyHints: (
    <Callout kind="info" title="Dove trovare questi valori sul Jade">
      <p>
        Completato l&rsquo;inserimento, la schermata principale del Jade mostra in basso il{' '}
        <em>wallet fingerprint</em> (8 caratteri esadecimali): deve coincidere con il master
        fingerprint qui sopra. Per un controllo più profondo:{' '}
        <span className="menu-path">Options → Wallet → Export Xpub</span> e la verifica indirizzi
        della companion app (stesso script type).
      </p>
    </Callout>
  ),
  defaultScript: 'bip84',
  offerManualEntry: true,
}

export function JadeWizard({ onExit }: { onExit: () => void }) {
  return <ImportFlowWizard config={jadeConfig} onExit={onExit} />
}
```

### 4. `src/components/WalletSelect.tsx` — card

```tsx
{
  id: 'jade',
  name: 'Blockstream Jade',
  models: 'Jade · Jade Plus · Jade Core',
  method: 'Parole da dadi + "Calculate final word"',
  desc:
    'Generi le parole con 2 dadi a 16 facce e 1 a 8 facce (metodo ufficiale Blockstream), le inserisci sul Jade, e verifichi parole finali candidate e fingerprint del wallet.',
},
```

### 5. `src/App.tsx` — route

```tsx
{phase.kind === 'wizard' && phase.wallet === 'jade' && (
  <JadeWizard key={runId} onExit={exitWizard} />
)}
```

Più: `'jade'` in `WalletId` (types.ts), nel testo del disclaimer ("Wallet supportati"), nella
meta description di index.html, e nell'allowlist `$allowed_wallets` di `deploy/track.php`.
