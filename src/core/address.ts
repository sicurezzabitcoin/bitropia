import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { bech32, bech32m, createBase58check } from '@scure/base'
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js'

/** Codifica degli indirizzi Bitcoin mainnet dai pubkey compressi (33 byte). */

const base58check = createBase58check(sha256)

/** Ordine della curva secp256k1 (BIP340/341). */
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data))
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) {
    out.set(a, off)
    off += a.length
  }
  return out
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let v = 0n
  for (const b of bytes) v = (v << 8n) | BigInt(b)
  return v
}

/** Legacy P2PKH — indirizzi che iniziano con 1 (BIP44). */
export function p2pkhAddress(pubkey: Uint8Array): string {
  return base58check.encode(concatBytes(new Uint8Array([0x00]), hash160(pubkey)))
}

/** Nested SegWit P2SH-P2WPKH — indirizzi che iniziano con 3 (BIP49). */
export function p2shP2wpkhAddress(pubkey: Uint8Array): string {
  const redeemScript = concatBytes(new Uint8Array([0x00, 0x14]), hash160(pubkey))
  return base58check.encode(concatBytes(new Uint8Array([0x05]), hash160(redeemScript)))
}

/** Native SegWit P2WPKH — indirizzi bc1q (BIP84). */
export function p2wpkhAddress(pubkey: Uint8Array): string {
  return bech32.encode('bc', [0, ...bech32.toWords(hash160(pubkey))])
}

/**
 * Taproot P2TR — indirizzi bc1p (BIP86/BIP341), key-path spend senza script tree:
 * Q = lift_x(P) + int(taggedHash("TapTweak", x(P)))·G
 */
export function p2trAddress(pubkey: Uint8Array): string {
  const xonly = pubkey.slice(1, 33)
  const P = schnorr.utils.lift_x(bytesToBigInt(xonly))
  const t = bytesToBigInt(schnorr.utils.taggedHash('TapTweak', xonly))
  if (t >= SECP256K1_N) throw new Error('Tweak taproot fuori dall\'ordine della curva')
  const Q = P.add(secp256k1.Point.BASE.multiply(t))
  const outputKey = schnorr.utils.pointToBytes(Q)
  return bech32m.encode('bc', [1, ...bech32m.toWords(outputKey)])
}
