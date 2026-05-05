# 🌊 OracleFi

> **Dynamic APY Staking Protocol** — A DeFi staking protocol on Sui blockchain where APY is calculated from oracle token price.

💻 **[Live Demo](https://oracle-fi-black.vercel.app/)** | 🎥 **[Video Demo](https://share.descript.com/view/X8sxeBBMrvO)** | 🏆 **BermuDAO Hackathon 2026**

---

## 📋 Table of Contents

- [Problem & Solution](#-problem--solution)
- [Key Features](#-key-features)
- [Technical Architecture](#-technical-architecture)
- [Quick Start](#-quick-start)
- [Smart Contract API](#-smart-contract-api)
- [Deployment](#-deployment)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Problem & Solution

### The Problem

Many DeFi staking protocols use reward rates that are set manually or based on token emission schedules, without a direct relationship to market price:

- 📌 **Static reward rates** not directly tied to token price movement
- 🔒 **Opaque reward calculations** with limited on-chain transparency
- ⚠️ **Manual adjustments** requiring admin or governance overhead

### Our Solution

**OracleFi** links APY directly to the oracle token price:
APY Rate = f(Token Price)

| Token Price | APY Rate | Example               |
| ----------- | -------- | --------------------- |
| 💰 $0.50    | 5%       | Bear market incentive |
| 📊 $2.50    | 12.5%    | Balanced growth       |
| 🚀 $5.00    | 20%      | Bull market rewards   |

✅ APY calculated on-chain from oracle price  
✅ Transparent, auditable reward logic  
✅ No manual rate adjustments needed  
✅ Built and deployed as a complete full-stack dApp

> **Note:** In this demo, the oracle price is manually set via the Admin Dashboard. Production integration with Pyth or Switchboard on Sui is planned for Phase 2.

---

## ✨ Key Features

### 🔄 Dynamic APY Engine

- APY range: 5%–20%, driven by OC/USD oracle price
- On-chain calculation, fully transparent
- No hardcoded reward rates

### 🏛️ Multi-Oracle Registry

- Extensible oracle architecture
- Pay-to-register model (0.1 OC fee)
- Dynamic Object Field (DOF) pattern
- Designed for Pyth/Supra integration

### 🔐 Three-Tier Permission System

- **SuperAdminCap**: Protocol-level control
- **AdminCap**: Operational management (Pool Admin / Oracle Admin)
- **User**: Stake / Withdraw / Claim

### 🌍 Internationalization (i18n)

- 🇺🇸 English
- 🇹🇼 繁體中文
- Seamless language switching
- Persistent user preference

### 🎨 Modern UI/UX

- Responsive design (mobile-first)
- Dark theme
- Real-time data updates
- Smooth animations & transitions
- shadcn/ui component library

---

## 🏗️ Technical Architecture

### Smart Contract Stack

```
┌─────────────────────────────────────────────────┐
│ Frontend DApp                                   │
│ Next.js 14 + TypeScript                         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Sui Blockchain                                  │
│                                                 │
│ ┌──────────────┐                                │
│ │ oracle_coin  │ ◄─── OC Token (9 decimals)     │
│ └──────┬───────┘                                │
│        │                                        │
│        ▼                                        │
│ ┌──────────────┐                                │
│ │price_oracle  │ ◄─── Price feed management     │
│ └──────┬───────┘                                │
│        │                                        │
│        ▼                                        │
│ ┌───────────────────┐                           │
│ │multi_oracle_reg   │ ◄─── Registry + DOF       │
│ └──────┬────────────┘                           │
│        │                                        │
│        ▼                                        │
│ ┌──────────────┐                                │
│ │staking_pool  │ ◄─── Core staking logic        │
│ └──────────────┘                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Technology Stack

| Layer                    | Technology                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| **Blockchain**           | Sui (Move language)                                                        |
| **Smart Contracts**      | 4 modules (oracle_coin, price_oracle, multi_oracle_registry, staking_pool) |
| **Frontend**             | Next.js 14 (App Router)                                                    |
| **Language**             | TypeScript 5                                                               |
| **Styling**              | Tailwind CSS 3.4                                                           |
| **UI Components**        | shadcn/ui + Radix UI                                                       |
| **State Management**     | React Query (TanStack Query)                                               |
| **Wallet Integration**   | @mysten/dapp-kit                                                           |
| **Internationalization** | next-intl                                                                  |
| **Deployment**           | Vercel                                                                     |

### On-Chain Deployment

Network: Sui Testnet
Chain ID: 4c78adac

Original Package ID: 0x81f67b5daa91e9f49c24753d6423b87a02b449aa0ce1125cba194afd10397b15
Latest Package ID: 0xe7673dda5fed10f5d52a8f960a8f8d48a762685228dbf1e74c7c81ee92668eb7 (v3)

Pool ID: 0xda1b01ce2583ba48c59621135e7784ca2fa53ec51f581f7967c3760e7037f7a6
Registry ID: 0x359ec6fb71edfa7bdf3fcfe348633f823753b722e03a4fa2d6df758bf246c0f4
Faucet State: 0xbd1c5cf27b4b2f40ec3743d567a6f428eb09e186a0eadfd87fdb24f32c8995f3

---

## 🚀 Quick Start

### Prerequisites

- [Sui CLI](https://docs.sui.io/build/install) `>= 1.68.1`
- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [Sui Wallet Extension](https://chrome.google.com/webstore/detail/sui-wallet)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/repotecJC/OracleFi.git
cd OracleFi

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Connect to Testnet

1. Install **Sui Wallet** browser extension
2. Switch network to **Testnet**
3. Get test SUI from [Discord faucet](https://discord.com/channels/916379725201563759/971488439931392130)
4. Visit OracleFi and click **"Connect Wallet"**

---

## 📊 Smart Contract API

### 👤 User Functions

#### Stake Tokens

```move
public fun stake(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    coin: Coin<ORACLE_COIN>,
    ctx: &mut TxContext
)
```

Stake OC tokens to earn dynamic APY rewards.

#### Withdraw Tokens

```move
public fun withdraw(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    amount: u64,
    ctx: &mut TxContext
): Coin<ORACLE_COIN>
```

Withdraw staked tokens anytime without penalty.

#### Claim Rewards

```move
public fun claim_reward(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    ctx: &mut TxContext
): Coin<ORACLE_COIN>
```

Claim accumulated rewards based on dynamic APY.

#### Query Functions

```move
// Get user's staked amount
public fun get_stake_amount(pool: &StakingPool, user: address): u64

// Get pending rewards
public fun get_pending_rewards(
    pool: &StakingPool,
    registry: &OracleRegistry,
    user: address,
    ctx: &TxContext
): u64

// Get total pool staked
public fun get_total_staked(pool: &StakingPool): u64
```

#### Public Faucet

```move
public entry fun faucet(
    state: &mut FaucetState,
    clock: &Clock,
    ctx: &mut TxContext
)
```

Mint 100 OC test tokens (24-hour cooldown per address).

### 🔐 Admin Functions

#### Fund Reward Pool

```move
public fun fund_reward(
    admin_cap: &AdminCap,
    pool: &mut StakingPool,
    coin: Coin<ORACLE_COIN>,
    ctx: &TxContext
)
```

Inject OC tokens into reward pool.

#### Update Oracle Price

```move
public fun update_oracle_price(
    registry: &mut OracleRegistry,
    admin_cap: &AdminCap,
    base: vector<u8>,
    quote: vector<u8>,
    new_price: u64,
    ctx: &mut TxContext
)
```

Update OC/USD price feed (triggers APY recalculation).

#### Admin Mint OC Tokens

```move
public entry fun admin_mint(
    admin_cap: &PoolAdminCap,
    pool: &StakingPool,
    faucet_state: &mut FaucetState,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
)
```

Authorized minting of new OC tokens via the FaucetState treasury (requires `PoolAdminCap`).

---

## 🌐 Deployment

### Deploy Smart Contracts

```bash
# 1. Switch to testnet
sui client switch --env testnet

# 2. Publish package
sui client publish --gas-budget 100000000

# 3. Save Package ID and Object IDs
# Update frontend/lib/constants.ts
```

### Deploy Frontend to Vercel

```bash
# Option 1: Vercel CLI
npm i -g vercel
cd frontend
vercel --prod

# Option 2: GitHub Integration
# 1. Push to GitHub
# 2. Import to Vercel Dashboard
# 3. Set Root Directory: frontend
# 4. Deploy
```

---

## 🛣️ Roadmap

### ✅ Phase 1: MVP (Completed)

- [x] Core staking mechanism with dynamic APY
- [x] Multi-oracle registry architecture
- [x] Admin dashboard (Fund / Mint / Update)
- [x] Public faucet with 24-hour cooldown
- [x] Dynamic admin capability detection (Pool / Oracle separation)
- [x] Multi-language support (EN/ZH)
- [x] Responsive UI with real-time data

### 🔄 Phase 2: Oracle Integration (Q2 2026)

- [ ] Pyth Network price feeds
- [ ] Supra Oracle integration
- [ ] Automated price update mechanism

### 🔮 Phase 3: Advanced Features (Q3 2026)

- [ ] Multi-token support (SUI, USDC, USDT)
- [ ] Liquidity mining pools
- [ ] DAO governance module
- [ ] Advanced analytics dashboard

### 🚀 Phase 4: Mainnet Launch (Q4 2026)

- [ ] Security audits
- [ ] Mainnet deployment
- [ ] Partnerships & integrations

---

## 🏆 Hackathon Submission

**Event**: BermuDAO Hackathon 2026
**Category**: DeFi Infrastructure
**Submission Month**: April 2026
**Status**: ✅ Completed

### Project Highlights

| Aspect               | Description                                        |
| -------------------- | -------------------------------------------------- |
| 💡 **Core Mechanic** | APY calculated on-chain directly from oracle price |
| 🎯 **Completeness**  | Full-stack dApp with admin tools + i18n            |
| 🏗️ **Architecture**  | Extensible multi-oracle registry design            |
| 🎨 **UX Design**     | Responsive UI with real-time updates               |
| 📚 **Documentation** | README + inline code comments                      |
| 🌍 **Accessibility** | Multi-language support (EN / ZH)                   |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Write unit tests for new features
- Update documentation as needed
- Ensure `npm run build` passes

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Links

- 🌐 **Live Demo**: [https://oracle-fi-black.vercel.app/](https://oracle-fi-black.vercel.app/)
- 🌐 **Video Demo**: [https://share.descript.com/view/X8sxeBBMrvO](https://share.descript.com/view/X8sxeBBMrvO)
- 📂 **GitHub**: [https://github.com/repotecJC/OracleFi](https://github.com/repotecJC/OracleFi)
- 🐦 **Twitter**: [@Jose39864093567](https://twitter.com/Jose39864093567)

---

## 🙏 Acknowledgments

- [Sui Foundation](https://sui.io/) — Blockchain infrastructure
- [BermuDAO](https://bermudao.io/) — Hackathon organizer
- [Mysten Labs](https://mystenlabs.com/) — Developer tools
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Vercel](https://vercel.com/) — Hosting platform

---

<div align="center">

**Built with ❤️ on Sui Blockchain**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/repotecJC/OracleFi/issues) · [Request Feature](https://github.com/repotecJC/OracleFi/issues)

</div>
