import { useMemo, useState, type ReactNode } from 'react'
import { SCRIPT_TYPES, deriveWalletInfo, type ScriptType } from '../core/derive.ts'
import { Callout } from './ui.tsx'

/**
 * Mostra la derivazione indipendente dell'app: master fingerprint, xpub di
 * account e primi indirizzi, da confrontare con quanto mostrato dal
 * dispositivo o dalla companion app.
 */
export function DeriveView({
  words,
  defaultScript = 'bip84',
  hints,
}: {
  words: readonly string[]
  defaultScript?: ScriptType
  hints?: ReactNode
}) {
  const [script, setScript] = useState<ScriptType>(defaultScript)
  const info = useMemo(() => {
    try {
      return deriveWalletInfo(words, script, 5)
    } catch {
      return null
    }
  }, [words, script])

  if (!info) {
    return (
      <Callout kind="danger" title="Mnemonica non valida">
        <p>Le parole raccolte non formano una mnemonica BIP39 valida: torna indietro e ricontrolla.</p>
      </Callout>
    )
  }

  return (
    <div>
      <div className="field-label">Master fingerprint (BIP32)</div>
      <div className="fingerprint">{info.fingerprint.toUpperCase()}</div>

      <div className="field-label">Script type</div>
      <select value={script} onChange={(e) => setScript(e.target.value as ScriptType)}>
        {(Object.keys(SCRIPT_TYPES) as ScriptType[]).map((k) => (
          <option key={k} value={k}>
            {SCRIPT_TYPES[k].label}
          </option>
        ))}
      </select>

      <div className="field-label">Xpub di account — {info.accountPath}</div>
      <div className="hash-box">{info.xpub}</div>
      {info.slip132 && (
        <>
          <div className="field-label">Stesso xpub in formato {info.slip132.name} (SLIP-132)</div>
          <div className="hash-box">{info.slip132.value}</div>
        </>
      )}

      <div className="field-label">Primi 5 indirizzi di ricezione</div>
      <ul className="addr-list">
        {info.addresses.map((a) => (
          <li key={a.path}>
            <span className="path">{a.path}</span>
            <span>{a.address}</span>
          </li>
        ))}
      </ul>

      {hints}
    </div>
  )
}
