import { sha256 } from '@noble/hashes/sha2.js'
import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { bytesToHex } from './coldcard.ts'

/**
 * Coldcard — generazione del seed con entropia utente OBBLIGATORIA
 * (firmware 5.6.1+, "View TRNG Words" dalla 5.6.2).
 *
 * Dal 2026 ogni nuovo seed del Coldcard mescola l'entropia del dispositivo
 * (STM32 TRNG + SE1 + SE2) con entropia fornita dall'utente. Il dispositivo
 * mostra il proprio contributo come 24 parole BIP39 PRIMA che l'utente inserisca
 * la propria entropia: è questo impegno preventivo a rendere il risultato
 * verificabile in modo indipendente.
 *
 *   base_seed    = 32 byte, le 24 parole "View TRNG Words"
 *   user_entropy = SHA256(b'CC\x01' + metodo + simboli)
 *   mix          = b'CC\x01S' + scopo + metodo + base_seed + user_entropy
 *   seed         = SHA256(SHA256(mix))        → [:16] per 12 parole
 *
 * Equivalente a docs/verify_seed_mix.py di Coinkite; verificato contro i
 * vettori prodotti da quello script (vedi core.test.ts).
 */

export type MixMethod = 'dice' | 'coin'
/** Master seed, seed temporaneo, o chiave C di CCC. */
export type MixPurpose = 'master' | 'temporary' | 'ccc'

const METHOD_ID: Record<MixMethod, number> = { dice: 0x44 /* 'D' */, coin: 0x43 /* 'C' */ }
const PURPOSE_ID: Record<MixPurpose, number> = {
  master: 0x4d /* 'M' */,
  temporary: 0x54 /* 'T' */,
  ccc: 0x43 /* 'C' */,
}

export const MIX_ALPHABET: Record<MixMethod, string> = { dice: '123456', coin: '01' }
export const MIX_MINIMUM: Record<MixMethod, number> = { dice: 50, coin: 128 }
/** Soglia del firmware oltre la quale avvisa di distribuzione non casuale. */
export const MIX_MAX_FREQ: Record<MixMethod, number> = { dice: 0.3, coin: 0.65 }

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** Le 24 parole "View TRNG Words" → i 32 byte del seed del dispositivo. */
export function trngWordsToSeed(words: readonly string[]): Uint8Array {
  if (words.length !== 24) throw new Error('Servono esattamente 24 parole TRNG')
  const entropy = mnemonicToEntropy(words.join(' ').toLowerCase().trim(), wordlist)
  if (entropy.length !== 32) throw new Error('Le parole TRNG devono codificare 256 bit')
  return entropy
}

export function isValidMixSymbols(symbols: string, method: MixMethod): boolean {
  const alphabet = MIX_ALPHABET[method]
  return symbols.split('').every((ch) => alphabet.includes(ch))
}

/**
 * Avviso di distribuzione del firmware: una faccia oltre il 30% (dadi) o
 * testa/croce oltre il 65% (monete).
 */
export function mixDistributionSuspicious(symbols: string, method: MixMethod): boolean {
  if (symbols.length === 0) return false
  const counts = new Map<string, number>()
  for (const ch of symbols) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  for (const v of counts.values()) if (v / symbols.length > MIX_MAX_FREQ[method]) return true
  return false
}

/** SHA256('CC\x01' + metodo + simboli): il contributo dell'utente. */
export function mixUserEntropy(symbols: string, method: MixMethod): Uint8Array {
  if (!isValidMixSymbols(symbols, method))
    throw new Error(`Sono ammessi solo i simboli ${MIX_ALPHABET[method]}`)
  const prefix = new Uint8Array([0x43, 0x43, 0x01, METHOD_ID[method]]) // 'C','C',0x01,metodo
  return sha256(concat(prefix, new TextEncoder().encode(symbols)))
}

/** Il seed finale atteso dal Coldcard, dati TRNG e entropia utente. */
export function coldcardMixSeed(
  baseSeed: Uint8Array,
  symbols: string,
  method: MixMethod,
  nwords: 12 | 24,
  purpose: MixPurpose = 'master',
): Uint8Array {
  if (baseSeed.length !== 32) throw new Error('Le parole TRNG devono codificare 256 bit')
  if (symbols.length < MIX_MINIMUM[method])
    throw new Error(`Servono almeno ${MIX_MINIMUM[method]} inserimenti`)

  const userEntropy = mixUserEntropy(symbols, method)
  // 'C','C',0x01,'S' + scopo + metodo + base_seed + user_entropy
  const head = new Uint8Array([0x43, 0x43, 0x01, 0x53, PURPOSE_ID[purpose], METHOD_ID[method]])
  const seed = sha256(sha256(concat(head, baseSeed, userEntropy)))
  return nwords === 12 ? seed.slice(0, 16) : seed
}

/** Mnemonica attesa, dal mix TRNG + entropia utente. */
export function coldcardMixMnemonic(
  baseSeed: Uint8Array,
  symbols: string,
  method: MixMethod,
  nwords: 12 | 24,
  purpose: MixPurpose = 'master',
): string[] {
  return entropyToMnemonic(
    coldcardMixSeed(baseSeed, symbols, method, nwords, purpose),
    wordlist,
  ).split(' ')
}

export { bytesToHex }
