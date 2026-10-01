import { describe, expect, it } from 'vitest'
import {
  EMPTY_ROLLS_HASH,
  coldcardDiceToMnemonic,
  coldcardLiveHash,
  diceDistributionSuspicious,
} from './coldcard.ts'
import { bitboxRollsToIndex, indexToWord, wordToIndex } from './wordDice.ts'
import { expectedCandidateCount, finalWordCandidates } from './finalWord.ts'
import { bitsToEntropy, coinFlipToBit, d6RollToBits, entropyToWords, hexToEntropy } from './generic.ts'
import { deriveWalletInfo, xpubToSlip132 } from './derive.ts'
import {
  bytesToHex,
  coldcardMixMnemonic,
  coldcardMixSeed,
  mixDistributionSuspicious,
  mixUserEntropy,
  trngWordsToSeed,
} from './coldcardMix.ts'

const ABANDON_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('Coldcard dice-only (rolls.py / rolls12.py)', () => {
  it('hash della stringa vuota (mostrato dal device prima dei lanci)', () => {
    expect(coldcardLiveHash('')).toBe(EMPTY_ROLLS_HASH)
  })

  it('vettore ufficiale Coinkite: rolls "123456"', () => {
    // https://coldcard.com/docs/verifying-dice-roll-math/
    expect(coldcardLiveHash('123456')).toBe(
      '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    )
    const w24 = coldcardDiceToMnemonic('123456', 24)
    expect(w24).toHaveLength(24)
    expect(w24[0]).toBe('mirror')
    expect(w24[23]).toBe('garment')
    const w12 = coldcardDiceToMnemonic('123456', 12)
    expect(w12).toHaveLength(12)
    expect(w12[0]).toBe('mirror')
    expect(w12[11]).toBe('owner')
  })

  it('troncamento a 16 byte PRIMA della somma di controllo (12 parole)', () => {
    // Le prime 11 parole di 12 e 24 derivano dagli stessi 128 bit iniziali
    // solo se la somma di controllo è calcolata dopo il troncamento; la 12ª differisce.
    const w12 = coldcardDiceToMnemonic('123456', 12)
    const w24 = coldcardDiceToMnemonic('123456', 24)
    expect(w12.slice(0, 11)).toEqual(w24.slice(0, 11))
    expect(w12[11]).not.toBe(w24[11])
  })

  it('warning distribuzione: una faccia oltre il 30%', () => {
    expect(diceDistributionSuspicious('111111')).toBe(true)
    expect(diceDistributionSuspicious('123456'.repeat(20))).toBe(false)
    expect(diceDistributionSuspicious('')).toBe(false)
  })

  it('rifiuta caratteri non validi', () => {
    expect(() => coldcardLiveHash('12x')).toThrow()
    expect(() => coldcardDiceToMnemonic('107', 24)).toThrow()
  })
})

describe('BIP39 entropia → mnemonica (vettori Trezor)', () => {
  it('zeri (128 bit) → abandon…about', () => {
    expect(entropyToWords(hexToEntropy('00'.repeat(16))).join(' ')).toBe(ABANDON_12)
  })
  it('0xff (256 bit) → zoo…vote', () => {
    const w = entropyToWords(hexToEntropy('ff'.repeat(32)))
    expect(w).toHaveLength(24)
    expect(w.slice(0, 23).every((x) => x === 'zoo')).toBe(true)
    expect(w[23]).toBe('vote')
  })
  it('0x7f (128 bit) → legal winner…yellow', () => {
    expect(entropyToWords(hexToEntropy('7f'.repeat(16))).join(' ')).toBe(
      'legal winner thank year wave sausage worth useful legal winner thank yellow',
    )
  })
})

describe('Tabella BitBox02 (5×D6 + moneta) — BitBox_Diceware_LookupTable.pdf', () => {
  it('celle verificate contro il PDF ufficiale', () => {
    expect(indexToWord(bitboxRollsToIndex([1, 1, 1, 1, 1], false))).toBe('abandon')
    expect(indexToWord(bitboxRollsToIndex([1, 1, 1, 1, 1], true))).toBe('ability')
    expect(indexToWord(bitboxRollsToIndex([1, 1, 1, 2, 1], false))).toBe('absurd')
    expect(indexToWord(bitboxRollsToIndex([1, 2, 1, 2, 1], false))).toBe('baby')
    expect(indexToWord(bitboxRollsToIndex([1, 4, 1, 4, 1], false))).toBe('credit')
    expect(indexToWord(bitboxRollsToIndex([4, 4, 4, 4, 4], true))).toBe('zoo')
  })
  it('rifiuta dadi fuori 1..4 (5 e 6 si rilanciano)', () => {
    expect(() => bitboxRollsToIndex([1, 1, 1, 1, 5], false)).toThrow()
    expect(() => bitboxRollsToIndex([1, 1, 1, 1], false)).toThrow()
  })
})

describe('Parole finali candidate (come il BitBox02 sull\'ultima parola)', () => {
  it('11 parole → 128 candidate, include la parola vera', () => {
    const c = finalWordCandidates(Array(11).fill('abandon'))
    expect(c).toHaveLength(expectedCandidateCount(12))
    expect(c).toContain('about')
  })
  it('23 parole → 8 candidate, include la parola vera', () => {
    const c = finalWordCandidates(Array(23).fill('abandon'))
    expect(c).toHaveLength(expectedCandidateCount(24))
    expect(c).toContain('art')
  })
  it('17 parole → 32 candidate', () => {
    const c = finalWordCandidates(Array(17).fill('zoo'))
    expect(c).toHaveLength(expectedCandidateCount(18))
  })
  it('rifiuta lunghezze e parole non valide', () => {
    expect(() => finalWordCandidates(Array(10).fill('abandon'))).toThrow()
    expect(() => finalWordCandidates([...Array(10).fill('abandon'), 'notaword'])).toThrow()
  })
})

describe('Entropia generica senza bias', () => {
  it('D6 → bit', () => {
    expect(d6RollToBits(1)).toBe('00')
    expect(d6RollToBits(2)).toBe('01')
    expect(d6RollToBits(3)).toBe('10')
    expect(d6RollToBits(4)).toBe('11')
    expect(d6RollToBits(5)).toBe('0')
    expect(d6RollToBits(6)).toBe('1')
    expect(() => d6RollToBits(7)).toThrow()
  })
  it('moneta → bit', () => {
    expect(coinFlipToBit(false)).toBe('0')
    expect(coinFlipToBit(true)).toBe('1')
  })
  it('bit → entropia → mnemonica', () => {
    const w = entropyToWords(bitsToEntropy('0'.repeat(128), 128))
    expect(w.join(' ')).toBe(ABANDON_12)
    expect(() => bitsToEntropy('0'.repeat(100), 128)).toThrow()
  })
  it('hex valida solo 32/64 cifre', () => {
    expect(() => hexToEntropy('abcd')).toThrow()
    expect(() => hexToEntropy('gg'.repeat(16))).toThrow()
    expect(hexToEntropy('AB'.repeat(16))).toHaveLength(16)
  })
})

describe('Derivazioni (mnemonica di test BIP84/BIP86: abandon…about)', () => {
  const words = ABANDON_12.split(' ')

  it('master fingerprint 73c5da0a', () => {
    expect(deriveWalletInfo(words, 'bip84', 1).fingerprint).toBe('73c5da0a')
  })

  it('BIP84: zpub e primi indirizzi (vettori ufficiali BIP84)', () => {
    const info = deriveWalletInfo(words, 'bip84', 2)
    expect(info.slip132?.name).toBe('zpub')
    expect(info.slip132?.value).toBe(
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
    )
    expect(info.addresses[0].address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')
    expect(info.addresses[1].address).toBe('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g')
    expect(info.addresses[0].path).toBe("m/84'/0'/0'/0/0")
  })

  it('BIP86: primi indirizzi taproot (vettori ufficiali BIP86)', () => {
    const info = deriveWalletInfo(words, 'bip86', 2)
    expect(info.addresses[0].address).toBe(
      'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
    )
    expect(info.addresses[1].address).toBe(
      'bc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0was9fqzwh',
    )
  })

  it('BIP44: primo indirizzo legacy', () => {
    const info = deriveWalletInfo(words, 'bip44', 1)
    expect(info.addresses[0].address).toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA')
  })

  it('BIP49: primo indirizzo nested segwit', () => {
    const info = deriveWalletInfo(words, 'bip49', 1)
    expect(info.slip132?.name).toBe('ypub')
    expect(info.addresses[0].address).toBe('37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf')
  })

  it('xpubToSlip132 mantiene il payload', () => {
    const info = deriveWalletInfo(words, 'bip84', 1)
    // Riconversione zpub → xpub deve restituire l'originale
    expect(xpubToSlip132(info.slip132!.value, 0x0488b21e)).toBe(info.xpub)
  })

  it('rifiuta mnemoniche non valide', () => {
    expect(() => deriveWalletInfo(Array(12).fill('abandon'), 'bip84')).toThrow()
  })
})

describe('Coerenza incrociata wordDice/wordToIndex', () => {
  it('wordToIndex inverte indexToWord', () => {
    for (const i of [0, 1, 136, 408, 1223, 2047]) {
      expect(wordToIndex(indexToWord(i))).toBe(i)
    }
  })
})

describe('Coldcard mix TRNG + entropia utente (firmware 5.6.1+)', () => {
  // Vettori prodotti dallo script ufficiale Coinkite docs/verify_seed_mix.py
  const TRNG_WORDS =
    'maid photo evoke riot head entry waste peace fuel curtain sponsor same jaguar topic cloth since way midnight today cruise broccoli purchase approve year'.split(
      ' ',
    )
  const TRNG_HEX = '861475385d16a0977ded0e5de6c749df7773ca0af649f8118f8d1a51c75c42b7'
  const DICE = '456123456123456123456123456123456123456123456123456123456123' // 60 lanci
  const COINS =
    '01100100110010011001001100100110010011001001100100110010011001001100100110010011001001100100110010011001001100100110010011001001' // 128

  it('le 24 parole TRNG decodificano nei 32 byte del dispositivo', () => {
    expect(bytesToHex(trngWordsToSeed(TRNG_WORDS))).toBe(TRNG_HEX)
    expect(() => trngWordsToSeed(TRNG_WORDS.slice(0, 12))).toThrow()
  })

  it('dadi, master, 24 parole → vettore di verify_seed_mix.py', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    expect(bytesToHex(coldcardMixSeed(base, DICE, 'dice', 24))).toBe(
      '1b406d648d117849f6e80a7cab93d330bb59ae1ccfb0b9cfd9124e6e960b7ab6',
    )
  })

  it('dadi, master, 12 parole → primi 16 byte dello stesso hash', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    expect(bytesToHex(coldcardMixSeed(base, DICE, 'dice', 12))).toBe(
      '1b406d648d117849f6e80a7cab93d330',
    )
  })

  it('seed temporaneo (scopo T) produce un risultato diverso dal master', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    expect(bytesToHex(coldcardMixSeed(base, DICE, 'dice', 24, 'temporary'))).toBe(
      '804eaa7f8d8bf268b8d578243ba185f34d69f8497ffaf7ac5b70fe05e078d0be',
    )
  })

  it('monete, master, 24 parole → vettore di verify_seed_mix.py', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    expect(bytesToHex(coldcardMixSeed(base, COINS, 'coin', 24))).toBe(
      '1e3ea81ec31a6fa90af586adbe5fe116ccf46e056a3964ff50dfed714016c698',
    )
  })

  it('mnemonica attesa completa (24 parole)', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    const w = coldcardMixMnemonic(base, DICE, 'dice', 24)
    expect(w).toHaveLength(24)
    expect(w[0]).toBe('brave')
    expect(w[23]).toBe('soup')
  })

  it('separazione di dominio: stesso simbolo, metodo diverso → entropia diversa', () => {
    expect(bytesToHex(mixUserEntropy('1'.repeat(128), 'dice'))).not.toBe(
      bytesToHex(mixUserEntropy('1'.repeat(128), 'coin')),
    )
  })

  it('soglie minime e alfabeto applicati', () => {
    const base = trngWordsToSeed(TRNG_WORDS)
    const fifty = '12345'.repeat(10) // esattamente 50: accettato
    expect(fifty).toHaveLength(50)
    expect(() => coldcardMixSeed(base, fifty, 'dice', 24)).not.toThrow()
    expect(() => coldcardMixSeed(base, fifty.slice(0, 49), 'dice', 24)).toThrow() // 49: rifiutato
    expect(() => coldcardMixSeed(base, '10'.repeat(63) + '1', 'coin', 24)).toThrow() // 127 < 128
    expect(() => coldcardMixSeed(base, '7'.repeat(50), 'dice', 24)).toThrow()
    expect(() => coldcardMixSeed(base, '2'.repeat(128), 'coin', 24)).toThrow()
  })

  it('avvisi di distribuzione come il firmware (dadi >30%, monete >65%)', () => {
    expect(mixDistributionSuspicious('1'.repeat(50), 'dice')).toBe(true)
    expect(mixDistributionSuspicious('123456'.repeat(10), 'dice')).toBe(false)
    expect(mixDistributionSuspicious('1'.repeat(90) + '0'.repeat(38), 'coin')).toBe(true)
    expect(mixDistributionSuspicious('10'.repeat(64), 'coin')).toBe(false)
  })
})
