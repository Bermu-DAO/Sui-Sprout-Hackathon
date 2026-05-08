# SPENDBACK

## Description

A cashback-style incentive layer for the Sui ecosystem. Connect a wallet and SpendBack auto-detects your recent on-chain activity via `queryTransactionBlocks`. Hit Record on any transaction to mint an Invoice NFT — the digest stays on-chain as verifiable proof, while the full receipt (balance changes, timestamp, tx type) ships to Walrus for decentralised storage. Each Invoice doubles as a lottery ticket: Sui's native randomness picks a winning Invoice number, and the holder claims the entire USDC prize pool in a single transaction. The more you transact, the more tickets you hold; the prize pool grows organically from recording fees.

> Detect real on-chain transactions, record them as Invoice NFTs on Sui, store receipts on Walrus, and win lottery prizes.

---

## What it does

SPENDBACK lets you turn any on-chain activity into a verifiable spending record. You connect your Sui wallet, find your recent transactions, and hit **Record** — this uploads a receipt to Walrus and mints an **Invoice NFT** on-chain that proves the transaction happened. Each Invoice is a lottery ticket: a periodic draw picks a winning invoice number from the on-chain `System` object, and the holder of that Invoice can claim the entire USDC prize pool in one transaction.

The prize pool grows with every recording because buying `TAX_COIN` (the recording fee token) sends USDC directly into the `Treasury`. Every participant contributes to the pot they're competing for.

---

## Architecture

```
User Wallet
    │
    ├── Sui Testnet (onchain_invoice package)
    │     ├── System object  — global invoice counter, winner, draw timestamp
    │     ├── Treasury object — USDC prize pool (Balance<USDC>)
    │     ├── Invoice NFT    — minted per recorded tx, holds protocol/blobId
    │     └── TAX_COIN       — spent on recording, converted to USDC in Treasury
    │
    └── Walrus Testnet (decentralised blob storage)
          └── Receipt blob   — JSON with txDigest, balanceChanges, summary
                               blobId embedded in Invoice.protocol field
```

The frontend reads the user's recent transactions via **Sui JSON-RPC** (`queryTransactionBlocks`), uploads a receipt JSON to the **Walrus Publisher**, then submits a PTB to Sui that calls `invoice::init_invoice` — embedding the `blobId` in the `protocol` field so it's permanently on-chain. Anyone can later fetch the receipt from the **Walrus Aggregator** and verify it against the Sui Explorer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Sui Testnet |
| Smart contracts | Move (`onchain_invoice` package) |
| Decentralised storage | Walrus Testnet (blob store) |
| Frontend framework | React 19 + Vite 7 |
| Wallet integration | `@mysten/dapp-kit-react` v2 |
| Sui SDK | `@mysten/sui` v2 (gRPC + JSON-RPC) |
| Data fetching | `@tanstack/react-query` v5 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict mode) |

---

## How TAX_COIN works

`TAX_COIN` is **not a tradeable asset** — it is a recording fee token.

1. You call `usdc::faucet` to mint test USDC (testnet only).
2. You call `tax_coin::buy_quota` with a USDC coin object. The USDC goes into the `Treasury` prize pool, and you receive `TAX_COIN` at a 1 : 10 ratio.
3. When you record a transaction, `invoice::init_invoice` burns exactly 1 unit of `TAX_COIN` and mints an Invoice NFT.

This means **every Invoice minted increases the prize pool**, aligning incentives: more participants → bigger jackpot → more reason to record.

---

## Verifiability

Every Invoice NFT stores a `protocol` field with the format:

```
{txType}::{txDigestPrefix}::{walrusBlobId}
```

This gives three independent verification paths:

1. **On-chain**: The Invoice NFT exists on Sui — its `invoice_number`, `timestamp`, and `protocol` are immutable once minted.
2. **Sui Explorer**: The `txDigest` embedded in the protocol (and stored in the Walrus receipt) can be looked up at `https://suiscan.xyz/testnet/tx/{txDigest}` to confirm the original transaction.
3. **Walrus**: The `blobId` can be fetched from `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}` to retrieve the full receipt JSON, including `balanceChanges`.

---

## Future: Automatic Recording

Today, users manually click **Record** after a transaction. The endgame is **composable recording**: because Sui uses Programmable Transaction Blocks (PTBs), any DeFi protocol (swap, lending, bridge) can call `invoice::init_invoice` as a **subsequent command in the same PTB** as their own operation.

This means a DEX could automatically issue an Invoice NFT to every trader as part of the swap transaction — zero extra steps for the user, and every trade becomes a lottery ticket. The `protocol` field is a free-form string, so it can carry any metadata the integrating protocol wants to record.

---

## Deployed Contracts (Sui Testnet)

| Object | ID |
|---|---|
| Package | `0xb15e542b3c97c73aa3c15b9dffaafb7249682017d8aaddc8b5b89ed396374bcc` |
| System | `0xb3496e24c1b7643d86746cf4d287265d52b02321ada9d6f5d44e1ef3350ee54c` |
| Treasury | `0x935dafc6252858459b6a96f989689468fd73467e153dfde1555cf421eef4f5fa` |
| USDC TreasuryCap | `0xab440921af98c6e3eb82571d8356717873b8480ef5949e5ef69596fd9d5c2cf2` |
| TAX_COIN TreasuryCap | `0x32ff3f7ffacf0b189e8ea2cd9a42c767d5bf4b955e32db5e6733bb652aba3ccb` |
| Admin | `0x9c695f40c9b9ebc9e70844a259d9d5470fa78721e0885e76457b8a2c377e24ab` |

Smart contract source: [Bermu-DAO/sui_workshop_3](https://github.com/Bermu-DAO/sui_workshop_3) — `onchain_invoice` package.

---

## Run Locally

```bash
git clone <this-repo>
cd spendback
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) and connect a Sui wallet pointed at **Testnet**.

> **Requirements:** Node.js 18+, pnpm 8+

---
