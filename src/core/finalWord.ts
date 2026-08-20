import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { wordToIndex } from './wordDice.ts'

/**
 * Parole di controllo valide (BIP39), date le prime n-1 parole.
 *
 * È lo stesso approccio del firmware BitBox02 (lastword_choices): si provano
 * tutte le 2048 parole e si tengono quelle che rendono valida la somma di
 * controllo dell'intera mnemonica.
 *
 * Risultato atteso: 128 candidate per 12 parole, 32 per 18, 8 per 24.
 */
export function finalWordCandidates(firstWords: readonly string[]): string[] {
  const n = firstWords.length + 1
  if (n !== 12 && n !== 18 && n !== 24)
    throw new Error(`Servono 11, 17 o 23 parole iniziali (ricevute: ${firstWords.length})`)
  // Valida le parole in ingresso (lancia se una non è nella wordlist)
  for (const w of firstWords) wordToIndex(w)
  const prefix = firstWords.map((w) => w.toLowerCase().trim()).join(' ')
  const candidates: string[] = []
  for (const w of wordlist) {
    if (validateMnemonic(`${prefix} ${w}`, wordlist)) candidates.push(w)
  }
  return candidates
}

/** Numero atteso di candidate per lunghezza mnemonica. */
export function expectedCandidateCount(nwords: 12 | 18 | 24): number {
  return { 12: 128, 18: 32, 24: 8 }[nwords]
}
