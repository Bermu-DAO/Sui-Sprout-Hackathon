# Sui Taiwan Lottery

Language:
- English (this file)
- Traditional Chinese: [README.zh-TW.md](README.zh-TW.md)

This project is a Sui-based Taiwan scratch-lottery demo built for hackathon review.
Gameplay uses an on-chain **TWD test token** for ticket purchases, payouts, and admin funding.
Players still use **SUI testnet gas** for transaction fees.

## What It Does

- Scratch-card gameplay with buy, reveal, claim, and admin controls
- Three ticket tiers priced in TWD: NT$200, NT$500, NT$2,000
- On-chain randomness via Sui official Randomness module (`0x8`)
- Separate balances for TWD gameplay funds and SUI gas
- Admin panel for granting TWD, topping up the prize vault, and withdrawing funds
- Optional onchain_invoice helpers remain wired in the frontend for related test-token flows

## Ticket Overview

- NT$200 ticket: lower odds, smaller prizes
- NT$500 ticket: medium odds, medium prizes
- NT$2,000 ticket: higher entry price, broader prize range

The current UI intentionally shows realistic prize ranges instead of every outcome being a jackpot.

## Tech Stack

- Frontend: React 18 + TypeScript + Vite
- Blockchain UI: Sui dApp Kit + `@mysten/sui/transactions`
- Smart Contract: Move with `sui::random`
- Network: Sui testnet

## Setup

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
copy .env.example .env
```

3. Fill in the deployed IDs

- `VITE_SUI_NETWORK`
- `VITE_SUI_FULLNODE_URL`
- `VITE_SUI_FRAMEWORK_PACKAGE_ID`
- `VITE_SUI_RANDOM_PACKAGE_ID`
- `VITE_LOTTERY_PACKAGE_ID`
- `VITE_LOTTERY_OBJECT_ID`
- `VITE_TWD_BANK_OBJECT_ID`

Optional onchain_invoice values are still supported if you want the extra test-token flow in the admin panel.

4. Run the app

```bash
npm run dev
```

5. Build for production

```bash
npm run build
```

## Smart Contract

The Move contract lives in [contracts/lottery/sources/lottery.move](contracts/lottery/sources/lottery.move).

Main functions:

- `buy_scratch_card()` buys a ticket with TWD and generates a board on-chain
- `settle_scratch()` settles the winning payout after reveal
- `top_up()` moves TWD into the prize vault
- `withdraw()` lets the owner remove TWD from the vault
- `claim_test_twd()` mints test TWD from the shared bank

Randomness uses the official Sui module:

```move
let mut gen = sui::random::new_generator(random, ctx);
let roll = (sui::random::generate_u32(&mut gen) as u64) % 10000;
```

## Frontend Flow

The main UI is in [src/App.tsx](src/App.tsx) and transaction builders are in [src/utils/transactions.ts](src/utils/transactions.ts).

- `buildBuyScratchCardTx()` builds the purchase transaction
- `buildSettleScratchTx()` builds the claim transaction
- `buildTopUpTx()` tops up the prize vault
- `buildClaimTestTwdTx()` mints playable TWD for judges or players
- `getContractIds()` reads deployment IDs from the environment

## Environment Example

The sample env file is [.env.example](.env.example).

Required entries:

- `VITE_SUI_NETWORK`
- `VITE_SUI_FULLNODE_URL`
- `VITE_SUI_FRAMEWORK_PACKAGE_ID`
- `VITE_SUI_RANDOM_PACKAGE_ID`
- `VITE_LOTTERY_PACKAGE_ID`
- `VITE_LOTTERY_OBJECT_ID`
- `VITE_TWD_BANK_OBJECT_ID`

Optional entries:

- `VITE_INVOICE_PACKAGE_ID`
- `VITE_INVOICE_SYSTEM_ID`
- `VITE_INVOICE_TREASURY_ID`
- `VITE_INVOICE_USDC_TREASURY_CAP_ID`
- `VITE_INVOICE_TAX_TREASURY_CAP_ID`
- `VITE_INVOICE_ADMIN_ID`

## Project Structure

```text
.
├── src/
│   ├── App.tsx
│   ├── AdminPanel.tsx
│   ├── main.tsx
│   └── utils/transactions.ts
├── contracts/lottery/
│   ├── Move.toml
│   └── sources/lottery.move
├── .env.example
├── README.zh-TW.md
└── package.json
```

## Deployment

1. Build the contract

```bash
cd contracts/lottery
sui move build
```

2. Publish to testnet

```bash
sui client publish --gas-budget 100000000
```

3. Copy the published package and object IDs into `.env`

4. Rebuild the frontend

```bash
npm run build
```

## Notes

- The game economy is TWD-first; only gas uses SUI.
- Prize rates and payout ranges were tuned down to feel closer to real lottery odds.
- The repository includes bilingual documentation and a judge flow guide in [HACKATHON_JUDGE_FLOW.zh-TW.md](HACKATHON_JUDGE_FLOW.zh-TW.md).
