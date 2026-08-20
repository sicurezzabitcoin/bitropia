import { wordlist } from '@scure/bip39/wordlists/english.js'

/**
 * Metodo ufficiale "dadi → parola BIP39" del BitBox02: ogni combinazione mappa
 * su un indice 0..2047 della wordlist inglese, senza bias (2048 combinazioni esatte).
 */

/**
 * BitBox02 — metodo Shift Crypto (BitBox_Diceware_LookupTable.pdf):
 * 5 lanci di D6 tenendo solo 1-4 (5 e 6 si rilanciano) + 1 moneta
 * (in alternativa alla moneta: un D6 dove 1-3 = testa, 4-6 = croce).
 *
 * indice = base-4 dei lanci 1..5, poi bit della moneta:
 *   (r1-1)·512 + (r2-1)·128 + (r3-1)·32 + (r4-1)·8 + (r5-1)·2 + (croce ? 1 : 0)
 *
 * Verificato contro la tabella ufficiale: 1-1-1-1-1-testa → "abandon" (0),
 * 1-1-1-2-1-testa → "absurd" (8), 2-2-1-1-1-testa → "baby" (136).
 */
export function bitboxRollsToIndex(rolls: readonly number[], coinTails: boolean): number {
  if (rolls.length !== 5) throw new Error('Servono esattamente 5 lanci di dado')
  for (const r of rolls) {
    if (!Number.isInteger(r) || r < 1 || r > 4)
      throw new Error('Ogni dado deve valere da 1 a 4 (5 e 6 si rilanciano)')
  }
  const [r1, r2, r3, r4, r5] = rolls
  return (r1 - 1) * 512 + (r2 - 1) * 128 + (r3 - 1) * 32 + (r4 - 1) * 8 + (r5 - 1) * 2 + (coinTails ? 1 : 0)
}

export function indexToWord(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 2047)
    throw new Error('Indice parola fuori intervallo')
  return wordlist[index]
}

export function wordToIndex(word: string): number {
  const idx = wordlist.indexOf(word.toLowerCase().trim())
  if (idx === -1) throw new Error(`"${word}" non è una parola BIP39 valida`)
  return idx
}

export { wordlist }
