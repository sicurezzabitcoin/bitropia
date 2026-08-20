import { sha256 } from '@noble/hashes/sha2.js'
import { entropyToMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

/**
 * Replica esatta del percorso Coldcard "New Seed Words → Advanced → 12/24 Word Dice Roll"
 * (modalità dice-only), equivalente agli script ufficiali Coinkite rolls.py / rolls12.py:
 *
 *   entropy = SHA256(stringa ASCII dei lanci '1'..'6')
 *   12 parole → si troncano i primi 16 byte PRIMA di calcolare la somma di controllo BIP39
 *   24 parole → tutti i 32 byte
 *
 * Riferimento: https://coldcard.com/docs/verifying-dice-roll-math/
 */

export const COLDCARD_MIN_ROLLS_12 = 50 // 128 bit
export const COLDCARD_MIN_ROLLS_24 = 99 // 256 bit

/** Hash SHA256 della stringa vuota, mostrato dal device prima di qualsiasi lancio. */
export const EMPTY_ROLLS_HASH =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

export function isValidRolls(rolls: string): boolean {
  return /^[1-6]*$/.test(rolls)
}

/** Hash "live" mostrato sullo schermo del Coldcard durante l'inserimento dei lanci. */
export function coldcardLiveHash(rolls: string): string {
  if (!isValidRolls(rolls)) throw new Error('I lanci devono essere cifre da 1 a 6')
  return bytesToHex(sha256(new TextEncoder().encode(rolls)))
}

export function coldcardMinRolls(nwords: 12 | 24): number {
  return nwords === 12 ? COLDCARD_MIN_ROLLS_12 : COLDCARD_MIN_ROLLS_24
}

/** Entropia BIP39 derivata dai lanci (già troncata per 12 parole). */
export function coldcardDiceToEntropy(rolls: string, nwords: 12 | 24): Uint8Array {
  if (!isValidRolls(rolls)) throw new Error('I lanci devono essere cifre da 1 a 6')
  const digest = sha256(new TextEncoder().encode(rolls))
  return nwords === 12 ? digest.slice(0, 16) : digest
}

/** Mnemonica attesa dal Coldcard per la sequenza di lanci data. */
export function coldcardDiceToMnemonic(rolls: string, nwords: 12 | 24): string[] {
  const entropy = coldcardDiceToEntropy(rolls, nwords)
  return entropyToMnemonic(entropy, wordlist).split(' ')
}

/**
 * Replica del controllo firmware: avvisa se una faccia del dado supera il 30%
 * dei lanci ("Distribution of dice rolls is not random").
 */
export function diceDistributionSuspicious(rolls: string): boolean {
  if (rolls.length === 0) return false
  const counts = new Map<string, number>()
  for (const ch of rolls) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  for (const v of counts.values()) if (v / rolls.length > 0.3) return true
  return false
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
