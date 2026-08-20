import { entropyToMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

/**
 * Sorgenti di entropia generiche (indipendenti dal wallet), con estrazione
 * di bit SENZA bias:
 *
 * - D6: 1-4 → 2 bit (00,01,10,11), 5-6 → 1 bit (0,1). Condizionato al ramo,
 *   l'esito è uniforme: ogni bit emesso ha probabilità 1/2 esatta.
 * - Moneta: 1 bit per lancio (testa=0, croce=1).
 * - Hex: entropia grezza per utenti avanzati (32 o 64 cifre esadecimali).
 */

/** Bit emessi da un lancio di D6 (estrattore senza bias). */
export function d6RollToBits(roll: number): string {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6)
    throw new Error('Il dado deve valere da 1 a 6')
  if (roll <= 4) return (roll - 1).toString(2).padStart(2, '0')
  return roll === 5 ? '0' : '1'
}

export function coinFlipToBit(tails: boolean): string {
  return tails ? '1' : '0'
}

/** Impacchetta i primi nbits bit ('0'/'1') in byte di entropia BIP39. */
export function bitsToEntropy(bits: string, nbits: 128 | 256): Uint8Array {
  if (!/^[01]*$/.test(bits)) throw new Error('Sequenza di bit non valida')
  if (bits.length < nbits)
    throw new Error(`Servono ${nbits} bit, raccolti ${bits.length}`)
  const used = bits.slice(0, nbits)
  const out = new Uint8Array(nbits / 8)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(used.slice(i * 8, i * 8 + 8), 2)
  }
  return out
}

export function hexToEntropy(hex: string): Uint8Array {
  const clean = hex.toLowerCase().replace(/\s+/g, '')
  if (!/^[0-9a-f]+$/.test(clean)) throw new Error('Stringa esadecimale non valida')
  if (clean.length !== 32 && clean.length !== 64)
    throw new Error('Servono 32 cifre hex (12 parole) o 64 (24 parole)')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function entropyToWords(entropy: Uint8Array): string[] {
  return entropyToMnemonic(entropy, wordlist).split(' ')
}
