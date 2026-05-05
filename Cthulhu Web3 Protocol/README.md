# 🐙 Cthulhu Web3 Protocol (CoC-W3P)

> **"When you gaze into the abyss, the abyss is calculating your SAN points on the blockchain."**

Playing Tabletop RPGs (like *Call of Cthulhu*) with strangers online often ends in frustration due to lack of trust, ghosting Keepers (KP), or players suddenly ditching the game mid-campaign. 

The **Cthulhu Web3 Protocol (CoC-W3P)** is an experimental Web3 project built on the **Sui Blockchain**. It aims to solve the "trust crisis" in online TRPGs by integrating DeFi economic balances, dual-staking models, and verifiable on-chain randomness to create an immutable, outcome-guaranteed TRPG matchmaking ecosystem.

---

## 🌟 Core Features & Concepts

### 1. ⚖️ Dual-Staking & Reputation System
The protocol introduces a DeFi staking mechanism where both Keepers (KP) and Players must stake tokens (e.g., SUI) to initiate or join a scenario.
- **Anti-Ditching Mechanism**: Before a campaign is finalized, your Investigator NFT is locked. It physically prevents users from multi-tabbing or ditching games easily.
- **Anti-Ghosting (Time-Lock)**: If a KP ghosts and fails to conclude the game within the set Time-Lock, players can trigger a Multi-Sig dissolution. They may split the KP's staked deposit as emotional compensation.

### 2. 🎭 Wallet-First Identity & Soulbound Epitaph (SBT)
- **CoreProfile**: No more passwords. Your identity is tied to your Web3 wallet containing a `CoreProfile` managing cross-scenario reputation score.
- **Permanent Epitaph (SBT)**: When deciding to completely quit the game by burning your profile for a full deposit refund, the smart contract mints a non-transferable **Soulbound Token (SBT)** based on your lifetime stats and your custom epitaph. It serves as an eternal tattoo of your Web3 TRPG legacy.

### 3. 🎲 Verifiable On-Chain d100 Dice (VRF)
Traditional Discord dice bots or web generators face the risk of backend manipulation. We integrated Sui's native `sui::random` to generate random numbers directly on the chain for every skill check, ensuring 100% transparency and fairness. A critical fail (96-100) or a critical success (01) is purely determined by cryptographic fate.

### 4. 💎 GameFi Economics & Token Sink
The system integrates an internal USDC/TAX_COIN exchange system. Players can spend tokens to purchase "first-aid kits" or "sanity restoration items" during their campaigns. These consumed tokens are sent directly to a `0x0` blackhole address, perpetually burning them to mitigate token inflation. Each purchase also generates an "Invoice," serving as a lottery ticket for on-chain verifiable prize drawings!

---

## 📁 Project Structure

The repository consists of two main parts:

```text
Sui_Cathulu/
├── coc_web3/          # 🧠 Sui Move Smart Contracts
│   ├── sources/
│   │   ├── coc_profile.move       # Profile, Reputation, and SBT management
│   │   ├── coc_investigator.move  # Investigator NFTs, Stat changes, SAN points checking
│   │   ├── coc_scenario.move      # Time-Lock, Dual-Staking, and Group management
│   │   └── ...                    
│   ├── README.md
│   └── WHITEPAPER.md              # Decentralized TRPG Economic Whitepaper
│
└── coc_frontend/      # 🖥️ Immersive Frontend DApp
    ├── src/
    ├── package.json
    └── README.md
```

### Tech Stack
- **Smart Contracts**: Sui Move, Sui Framework (`sui::random`, `sui::clock`)
- **Frontend**: Vite, React 19, TypeScript
- **Web3 Integration**: `@mysten/dapp-kit`, `@mysten/sui.js`
- **UI/UX**: Tailwind CSS, Radix UI, Custom Retro Glassmorphism Interface

---

## 🚀 Getting Started

To fully run the Cthulhu Web3 Protocol locally, you'll need to deploy the smart contracts and spin up the frontend.

### 1. Deploy Smart Contracts
Ensure you have the Sui CLI installed and enough SUI tokens on the **Sui Testnet**:
```bash
cd coc_web3
sui client publish --gas-budget 1000000000
```
After successfully publishing, note down the `Package ID` and related `Shared Object IDs`.

### 2. Start the Frontend DApp
Navigate to the frontend directory and ensure you are using Node.js v18+:
```bash
cd ../coc_frontend

# Install dependencies
npm install

# ⚠️ IMPORTANT: Update the `Package ID` and `Object IDs` in `src/contracts/` configs with your newly deployed IDs.

# Start the dev server
npm run dev
```

Connect your Sui Testnet wallet, mint your Investigator NFT, and prepare to face the madness on the blockchain!

---

> 📝 **Developer Notes:**
> "Sometimes dealing with asynchronous UI updates and React TransactionBlocks feels like performing my own Sanity checks... But hey, at least we haven't encountered a Shoggoth yet."
> 
> Contributions, issues, and PRs are extremely welcome. Let the cult grow.
