import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { sha256 } from '@noble/hashes/sha2.js'
import { createBase58check } from '@scure/base'
import {
  p2pkhAddress,
  p2shP2wpkhAddress,
  p2trAddress,
  p2wpkhAddress,
} from './address.ts'

/**
 * Derivazione completa per la verifica: master fingerprint, xpub di account
 * e primi indirizzi di ricezione, per gli script type standard su mainnet.
 */

export type ScriptType = 'bip84' | 'bip86' | 'bip49' | 'bip44'

interface ScriptTypeDef {
  label: string
  accountPath: string
  addressPrefix: string
  slip132Version: number | null
  slip132Name: string | null
  encode: (pubkey: Uint8Array) => string
}

export const SCRIPT_TYPES: Record<ScriptType, ScriptTypeDef> = {
  bip84: {
    label: 'Native SegWit (BIP84, bc1q…)',
    accountPath: "m/84'/0'/0'",
    addressPrefix: 'bc1q',
    slip132Version: 0x04b24746,
    slip132Name: 'zpub',
    encode: p2wpkhAddress,
  },
  bip86: {
    label: 'Taproot (BIP86, bc1p…)',
    accountPath: "m/86'/0'/0'",
    addressPrefix: 'bc1p',
    slip132Version: null,
    slip132Name: null,
    encode: p2trAddress,
  },
  bip49: {
    label: 'Nested SegWit (BIP49, 3…)',
    accountPath: "m/49'/0'/0'",
    addressPrefix: '3',
    slip132Version: 0x049d7cb2,
    slip132Name: 'ypub',
    encode: p2shP2wpkhAddress,
  },
  bip44: {
    label: 'Legacy (BIP44, 1…)',
    accountPath: "m/44'/0'/0'",
    addressPrefix: '1',
    slip132Version: null,
    slip132Name: null,
    encode: p2pkhAddress,
  },
}

export interface DerivedAddress {
  path: string
  address: string
}

export interface WalletInfo {
  /** Master fingerprint BIP32 (4 byte, hex minuscolo). */
  fingerprint: string
  accountPath: string
  xpub: string
  /** Stesso xpub in formato SLIP-132 (zpub/ypub) dove applicabile. */
  slip132: { name: string; value: string } | null
  addresses: DerivedAddress[]
}

const base58check = createBase58check(sha256)

/** Riserializza un xpub con un version byte SLIP-132 (zpub/ypub). */
export function xpubToSlip132(xpub: string, version: number): string {
  const raw = base58check.decode(xpub)
  const out = new Uint8Array(raw)
  out[0] = (version >>> 24) & 0xff
  out[1] = (version >>> 16) & 0xff
  out[2] = (version >>> 8) & 0xff
  out[3] = version & 0xff
  return base58check.encode(out)
}

export function isValidMnemonic(words: readonly string[]): boolean {
  return validateMnemonic(words.join(' ').toLowerCase(), wordlist)
}

export function deriveWalletInfo(
  words: readonly string[],
  scriptType: ScriptType,
  addressCount = 5,
): WalletInfo {
  const mnemonic = words.join(' ').toLowerCase()
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error('Mnemonica non valida')
  const def = SCRIPT_TYPES[scriptType]

  // Nessuna passphrase BIP39: è il default di tutti e tre i wizard.
  const seed = mnemonicToSeedSync(mnemonic, '')
  const root = HDKey.fromMasterSeed(seed)
  const fingerprint = root.fingerprint.toString(16).padStart(8, '0')

  const account = root.derive(def.accountPath)
  const xpub = account.publicExtendedKey
  const slip132 =
    def.slip132Version !== null && def.slip132Name !== null
      ? { name: def.slip132Name, value: xpubToSlip132(xpub, def.slip132Version) }
      : null

  const external = account.deriveChild(0)
  const addresses: DerivedAddress[] = []
  for (let i = 0; i < addressCount; i++) {
    const child = external.deriveChild(i)
    if (!child.publicKey) throw new Error('Chiave pubblica non derivabile')
    addresses.push({
      path: `${def.accountPath}/0/${i}`,
      address: def.encode(child.publicKey),
    })
  }

  return { fingerprint, accountPath: def.accountPath, xpub, slip132, addresses }
}
