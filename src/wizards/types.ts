export type WalletId = 'coldcard' | 'bitbox02' | 'seedsigner'

export type Outcome = { kind: 'match' } | { kind: 'mismatch'; where: string }

export type SeedLength = 12 | 24
