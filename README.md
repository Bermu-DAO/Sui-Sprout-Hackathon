# Sui Sprout: BermuDAO Online Hackathon — Project Index

A local archive of all 16 projects submitted to **Sui Sprout: BermuDAO Online Hackathon** under the General Ecosystem Track.

> 🌐 Language: **English** · [繁體中文](README.zh-TW.md)

Each entry below points to the project folder in this repo and includes a short description. For full technical details, open the project folder and read its own `README.md`.

---

## 🎮 Games & GameFi

### [Sui Taiwan Lottery](./%231%20Sui-Taiwan-Lottery/)

A testnet-friendly scratch-card lottery dApp on Sui that brings Taiwan-style 刮刮樂 fully on-chain. Buys, scratches and prize settlement all happen in Move; an in-game TWD test token keeps gas costs near zero, and the UX is shaped specifically for hackathon reviewers.

### [Minesweeper — Bermuda DAO Mines](<./%233 minesweaper/>)

A provably-fair on-chain Minesweeper. Reveal tiles to chase rising multipliers, cash out at any time, or push your luck and risk hitting a hidden mine. Calculated-risk gameplay reimagined as a GameFi staple.

### [WanderLot](./WanderLot/)

A travel-flavoured GameFi dApp where every souvenir you buy at a virtual landmark mints an on-chain Invoice — keep it for a personal lottery draw, or pool it with other travellers to share variance. A year of stubs becomes a public, shareable on-chain travel ledger.

### [Cthulhu Web3 Protocol (CoC-W3P)](<./Cthulhu Web3 Protocol/>)

An experimental Web3 TRPG protocol on Sui. Dual-staking pins both Keeper and players to the table, `sui::random` provides verifiable d100 rolls, and burned investigators are immortalised as Soulbound Epitaph SBTs. Trust crisis in online TRPGs, solved on-chain.

---

## 💰 DeFi & Markets

### [OracleFi](./OracleFi/)

A DeFi staking protocol where APY is a live function of an on-chain oracle token price — the higher the price, the higher the yield. Move contracts, public faucet, admin dashboard, and bilingual EN/ZH UI on a Next.js frontend.

### [Sui Jackpot Market](./binary-prediction-jackpot/)

A binary YES/NO prediction market with a "Lossless Lottery" twist. Each bet feeds a Jackpot pool and mints an Invoice ticket; even the losing side has a shot at walking away with the entire pot.

### [Gamble SUI](./gamble-sui/)

A gamified token-price prediction market on Sui. Bets feed a prize pool, outcomes carry lottery-style upside, and the experience is tuned to feel less like a hedge and more like a slot lever. Includes oracle, frontend, and Move package.

### [Robinhood.Pad](./Robinhood-launchpad-final/)

A community-first decentralised launchpad on Sui. A Priority Pass auction combined with a Jackpot Pool breaks the whale lock on early-stage allocations — 80% of Pass fees flow back into the jackpot, redistributing alpha across small participants.

### [BaleenPay](./BaleenPay/)

A subscription-payment demo that turns merchant inflow into yield. Customers pay BrandUSD; under the hood, USDC is minted via StableLayer and routed into a yield aggregator. Merchants claim accumulated yield as fresh revenue.

### [GoodVibe](./goodvibe/)

A public-good fundraising platform on Sui and Stable Layer. Deposit USDC, mint a project-branded stablecoin, and donate the *yield* — not the principal — so your assets stay liquid and in your own wallet while you support causes long-term.

### [SpendBack](./spendback/)

A cashback-style incentive layer for the Sui ecosystem. Auto-detects on-chain activity, mints each transaction as an Invoice NFT (with the full receipt stored on Walrus), and treats every Invoice as a lottery ticket eligible to win the entire USDC prize pool.

---

## 🏛️ RWA & Infrastructure

### [ParkFi](./ParkFi/)

A real-world-asset (RWA) protocol that tokenises physical parking spaces as NFTs on Sui. Operators mint per-space NFTs; investors buy and trade them; drivers pay parking fees; the contract auto-splits each payment 80/20 between operator and NFT holder.

### [PayLock](./payLock/)

A Go backend for decentralised video hosting. Videos live on Walrus; playback redirects to the Walrus Aggregator; a Sui Move contract gates paid content; an embedded chain watcher syncs payment state automatically. FFmpeg pipelines optional.

### [Octopus](./Octopus/)

OCTOPUS — On-Chain Transaction Obfuscation Protocol Underlying Sui. A Groth16 ZK-SNARK privacy layer: deposits become commitments that hide amount and token type, spends prove ownership without linking, nullifiers prevent double-spending.

---

## 🛠️ Tools & Workspaces

### [sui client Online](<./%232 sui-client-online/>)

A graphical, browser-based Sui client for users who'd rather not live in the CLI. Run Move calls, query objects, and compose Programmable Transaction Blocks from a single unified panel — no `sui` binary required.

### [CohortVault](./Cohortvault/)

A controlled AI workspace for sensitive research, strategy, and credentials. Role-aware Secure Run workflows, delegated secrets that never touch the browser, and signed receipt v1 records with full audit history for every workflow execution.

---

## 📁 Folder Structure

```
hackathon/
├── #1 Sui-Taiwan-Lottery/         # Scratch-card lottery dApp
├── #2 sui-client-online/          # Browser-based Sui client
├── #3 minesweaper/                # On-chain Minesweeper
├── BaleenPay/                     # Subscription-payment + yield aggregator
├── Cohortvault/                   # Sensitive AI workspace
├── Cthulhu Web3 Protocol/         # Web3 TRPG protocol
├── Octopus/                       # ZK privacy layer
├── OracleFi/                      # Oracle-driven dynamic-APY staking
├── ParkFi/                        # Parking-space RWA
├── Robinhood-launchpad-final/     # Community-first launchpad
├── WanderLot/                     # Travel GameFi with shared lottery pool
├── binary-prediction-jackpot/     # Prediction market + Lossless Lottery
├── gamble-sui/                    # Gamified prediction market
├── goodvibe/                      # Public-good fundraising via yield
├── payLock/                       # Walrus-backed video paywall
└── spendback/                     # Cashback-style invoice NFT lottery
```

---

## Source

- Hackathon page: [DeepSurge — Sui Sprout: BermuDAO Online Hackathon](https://www.deepsurge.xyz/projects?hackathon=8076333e-0888-408e-b7a0-bacd372cee1e)
- Track: General Ecosystem Track
- Total submissions archived: **16**
