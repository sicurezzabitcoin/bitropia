# Bitropia

**Controllo parallelo della generazione del seed con entropia utente sugli hardware wallet.**

Quando chiedi al tuo hardware wallet di generare il seed a partire dai tuoi lanci di dadi, come
fai a sapere che li sta usando davvero? Bitropia ti guida in una **prova generale con
entropia di test**: tu e l'app fate lo stesso calcolo del dispositivo, ognuno per conto proprio,
e alla fine confrontate i risultati (parole, parole finali candidate, master fingerprint, xpub,
indirizzi). Se coincidono, il dispositivo fa quello che promette.

> ⚠️ **Solo entropia di PROVA.** Un seed passato da un telefono o un computer è compromesso per
> definizione. Al termine della verifica il processo va ripetuto offline sul dispositivo, con
> entropia nuova, senza inserirla in questa app né in nessun altro software.

> App riservata agli studenti: **https://corsi.sicurezzabitcoin.com/bitropia** (accesso con
> account WordPress e acquisto di uno dei corsi di [Sicurezza Bitcoin](https://sicurezzabitcoin.com),
> gatekeeper Easy Digital Downloads)

## Wallet supportati

| Wallet | Metodo verificato | Fonte |
| --- | --- | --- |
| **Coldcard MK4 / MK5 / Q** | Due procedure. **Standard** (fw ≥ 5.6.2 / 1.5.2Q, `New Seed Words → 12/24 Words`): il seed del dispositivo (24 parole "View TRNG Words") è mescolato con dadi o monete — `SHA256d(b'CC\x01S' + scopo + metodo + seed_device + SHA256(b'CC\x01' + metodo + simboli))`, equivalente a `verify_seed_mix.py`; "Mash Keys" non è verificabile. **Solo dadi** (`New Seed Words → Advanced → 12/24 Word Dice Roll`): `SHA256(sequenza ASCII dei lanci)`, troncato a 16 byte per 12 parole — equivalente a `rolls.py` / `rolls12.py` | [verify_seed_mix.py](https://github.com/Coldcard/firmware/blob/master/docs/verify_seed_mix.py) · [Verifying Dice Roll Math](https://coldcard.com/docs/verifying-dice-roll-math/) |
| **BitBox02 / Nova** | Metodo Shift "Roll your own Bitcoin seed": 5×D6 (solo 1–4) + moneta per parola, poi `Restore from recovery words`; il dispositivo propone le 8/128 parole finali valide | [Blog Shift](https://blog.bitbox.swiss/en/roll-the-dice-generate-your-own-seed/) · [Tabella PDF](https://bitbox.swiss/bitbox02/BitBox_Diceware_LookupTable.pdf) |
| **SeedSigner (DIY)** | `Tools → New Seed (dadi)`: stesso algoritmo del Coldcard — `SHA256(sequenza ASCII dei lanci)`, troncato a 16 byte per 12 parole; 50/99 lanci esatti | [dice_verification.md](https://github.com/SeedSigner/seedsigner/blob/master/docs/dice_verification.md) |

Solo i metodi ufficiali documentati dai produttori, nessuna variante. Il flusso per Blockstream
Jade è stato accantonato per ora: ricerca e codice sono archiviati in
[`archive/jade-flow-reference.md`](archive/jade-flow-reference.md).

## Proprietà di sicurezza

- **Calcolo interamente client-side**: sito statico con CSP restrittiva; nessun dato di
  entropia lascia il browser (l'unica chiamata di rete è un conteggio anonimo dei processi
  completati, senza alcun dato).
- **Zero persistenza**: l'entropia di prova vive solo nello stato React in memoria e viene
  azzerata all'uscita dal wizard.
- **Librerie crypto minime e auditate**: [`@scure/bip39`](https://github.com/paulmillr/scure-bip39),
  [`@scure/bip32`](https://github.com/paulmillr/scure-bip32), `@noble/hashes`, `@noble/curves`,
  `@scure/base`.
- **Core verificato con vettori ufficiali**: vettore Coinkite `123456`, vettori BIP39 (Trezor),
  vettori BIP84/BIP86, celle campione della tabella PDF ufficiale BitBox
  (`src/core/core.test.ts`).

## Sviluppo

```bash
npm install
npm test        # suite vettori ufficiali (Vitest)
npm run dev     # server di sviluppo
npm run build   # build statica in dist/
```

## Struttura

```
src/core/        logica pura e testata (nessuna dipendenza da React)
  coldcard.ts    SHA256 dei lanci, troncamento, soglie 50/99, warning distribuzione
  coldcardMix.ts mix seed dispositivo + entropia utente (Coldcard fw ≥ 5.6.2)
                 (stesso algoritmo usato dal SeedSigner)
  wordDice.ts    tabella dadi→parola BitBox (5×D6+moneta)
  finalWord.ts   parole di controllo finali valide (8/32/128)
  generic.ts     D6 senza bias, moneta, hex → entropia BIP39
  derive.ts      fingerprint, xpub (+SLIP-132), indirizzi BIP84/86/49/44
  address.ts     codifica P2WPKH, P2TR, P2SH-P2WPKH, P2PKH
src/wizards/     le procedure guidate (Coldcard standard e solo dadi, SeedSigner, BitBox02, parola finale)
src/components/  UI: disclaimer, selezione wallet, inserimento dadi, candidate, derivazioni
deploy/          copie versionate dei file lato server (gatekeeper WP+EDD, contatore)
```

## Licenza

[GNU AGPLv3](LICENSE) — © 2026 Marco Cattaneo / [Sicurezza Bitcoin](https://sicurezzabitcoin.com).
Chi pubblica online una versione modificata di questo software è tenuto a renderne disponibile
il sorgente: la verificabilità che Bitropia promette resta garantita anche nei fork.
Il nome e il logo "Bitropia" e "Sicurezza Bitcoin" **non** sono coperti dalla licenza.

Progetto sviluppato con **Claude Code + Fable 5 AI model**, con direzione e revisione umana.

## Disclaimer

Bitropia è un progetto indipendente, non affiliato a Coinkite, Shift Crypto o Blockstream.
Software fornito "così com'è", senza garanzie: usalo solo come controllo parallelo con entropia
di prova.
