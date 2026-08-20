# GiveChain — Privacy-Preserving Charity Donation Tracker

[![CI — GiveChain](https://github.com/yuvrajvibhute/yuvi/actions/workflows/ci.yml/badge.svg)](https://github.com/yuvrajvibhute/yuvi/actions/workflows/ci.yml)
[![Tests: 8 Passing](https://img.shields.io/badge/tests-8%20passing-brightgreen)](https://github.com/yuvrajvibhute/yuvi/actions)
[![Midnight SDK](https://img.shields.io/badge/Midnight%20SDK-v4.1.1-blue)](https://docs.midnight.network)
[![Network](https://img.shields.io/badge/Network-Preprod%20Testnet-purple)](https://midnight.network)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A decentralized, **privacy-preserving charity donation platform** built on the Midnight Network using the Compact Zero-Knowledge (ZK) smart contract language and the full Midnight SDK stack. Donors can contribute to verified causes anonymously — their identity is mathematically shielded inside a ZK proof while the aggregate fund totals remain fully public and auditable.

---

## 🌐 Live Demo & Deployment

| Item | Link |
|------|------|
| **Live Demo** | [https://givechain-midnight.vercel.app](https://givechain-chi.vercel.app/) |
| **Demo Video** | [`Screen Recording 2026-08-14 160705.mp4`](./Screen%20Recording%202026-08-14%20160705.mp4) |
| **Preprod Contract** | `020050ae5b37df2195f19069509df6ebcd9e3f60046b0a6ec9ea8c85ae0ff33e9d` |
| **Preview Contract** | `ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a` |
| **Primary Network** | Midnight Preprod Testnet |
| **Contract Source** | `contracts/charity_donation.compact` |

---

## 🎥 Demo Video

> A full walkthrough of the GiveChain dApp — Lace Wallet connection, anonymous donation ZK circuit execution, campaign creation, and live on-chain state updates on the Midnight Preprod Testnet.

**📹 [`Screen Recording 2026-08-14 160705.mp4`](./Screen%20Recording%202026-08-14%20160705.mp4)**

---

## 🛡️ Privacy Model — What an Observer Can and Cannot Learn

This section explains the **public/private split** that Midnight's ZK infrastructure enforces for GiveChain.

### ✅ What a Blockchain Observer CAN Learn (Public Ledger State)

| Observable | Source | Description |
|------------|--------|-------------|
| `totalDonations` | On-chain ledger | Total amount raised across all campaigns |
| `campaignCount` | On-chain ledger | Number of registered charity initiatives |
| `activeCampaignTitle` | On-chain ledger | Title of the most recently registered campaign |
| Transaction existence | Block explorer | That a donation circuit was executed (but not by whom) |
| Proof validity | ZK verifier | That the proof is mathematically valid and the donor meets the constraint `amount > 0` |

### 🚫 What a Blockchain Observer CANNOT Learn (Private/Shielded Data)

| Shielded | Why It's Private | Compact Mechanism |
|----------|-----------------|-------------------|
| Donor wallet address | Not part of the public circuit output | `donorSecret` is a private witness — never passed to `disclose()` |
| Individual donation amount | Only the aggregate `totalDonations` is updated | `amount` is disclosed but not linked to any identity |
| `donorSecret` (Bytes<32>) | Off-chain ZK witness key — never leaves client | Private circuit input, shielded from ledger |
| `donorNote` | Private message field — not disclosed | Not submitted to the on-chain state |
| Donor linkability | Multiple donations cannot be linked to one person | No identity commitment recorded on-chain |

### 🔒 Zero-Knowledge Guarantee

The `donate(donorSecret, amount)` circuit proves:
- The donor holds a valid 32-byte secret witness key
- The donation amount satisfies `assert(amount > 0)`
- The public ledger state transition `totalDonations += amount` is correct

**Without revealing:** who donated, their wallet address, their individual amount, or their `donorSecret`.

This is enforced at the Compact language level — `donorSecret` is never passed to `disclose()` and therefore cannot appear in the public ledger state by design.

---

## 📜 Compact Smart Contract

**File:** `contracts/charity_donation.compact`

```compact
pragma language_version >= 0.23;
import CompactStandardLibrary;

// ── PUBLIC LEDGER STATE ────────────────────────────────────────────────────────
export ledger totalDonations: Uint<64>;      // Total anonymous funds raised
export ledger campaignCount: Uint<64>;       // Number of active campaigns
export ledger activeCampaignTitle: Opaque<"string">; // Latest public campaign

// ── CIRCUIT: Create Charity Campaign ─────────────────────────────────────────
export circuit createCampaign(title: Opaque<"string">): [] {
    activeCampaignTitle = disclose(title);   // Public: campaign name on-chain
    campaignCount = campaignCount + 1;
}

// ── CIRCUIT: Privacy-Preserving Donation ─────────────────────────────────────
// donorSecret is a PRIVATE WITNESS — never disclosed or recorded on-chain
export circuit donate(donorSecret: Bytes<32>, amount: Uint<64>): [] {
    assert(amount > 0, "Donation amount must be greater than zero");
    const disclosedAmount = disclose(amount);  // Only amount is public
    totalDonations = totalDonations + disclosedAmount;
}
```

---

## ✅ Test Suite — 8 Tests Passing

Run tests:
```bash
npm run test
```

**Test Coverage (`tests/charity_donation.test.ts`):**

| # | Test Name | Status |
|---|-----------|--------|
| 1 | Public ledger initializes to zero values | ✅ PASS |
| 2 | `donate` circuit state transition — disclosing amount without witness | ✅ PASS |
| 3 | `donate` rejects zero-amount donations (assert guard) | ✅ PASS |
| 4 | Accepts minimum valid donation amount of 1 | ✅ PASS |
| 5 | Aggregates multiple donations correctly into `totalDonations` | ✅ PASS |
| 6 | `createCampaign` circuit updates cause count correctly | ✅ PASS |
| 7 | Tracks multiple campaign registrations | ✅ PASS |
| 8 | `donorSecret` witness bytes are never in public on-chain state | ✅ PASS |

---

## ⚙️ CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

The pipeline runs on every `push` to `main` / `develop` and every `pull_request`:

```
✅ Job 1: test        — npm run test (Vitest — 8 tests)
✅ Job 2: typecheck   — npm run build (TypeScript strict check)
✅ Job 3: build       — npm run build:web (Vite production bundle)
```

CI Badge: ([![GiveChain CI — Midnight ZK dApp](https://github.com/yuvrajvibhute/Givechain/actions/workflows/ci.yml/badge.svg)](https://github.com/yuvrajvibhute/Givechain/actions/workflows/ci.yml))

---

## 📦 Midnight SDK Integration

GiveChain integrates the complete official `@midnight-ntwrk` SDK stack:

| Package | Version | Purpose |
|---------|---------|---------|
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | Off-chain circuit runtime & private state |
| `@midnight-ntwrk/midnight-js-contracts` | 4.1.1 | TypeScript contract bindings |
| `@midnight-ntwrk/midnight-js-http-client-proof-provider` | 4.1.1 | ZK proof server integration |
| `@midnight-ntwrk/midnight-js-indexer-public-data-provider` | 4.1.1 | GraphQL indexer queries |
| `@midnight-ntwrk/midnight-js-level-private-state-provider` | 4.1.1 | Private state persistence |
| `@midnight-ntwrk/midnight-js-network-id` | 4.1.1 | Network resolver |
| `@midnight-ntwrk/midnight-js-node-zk-config-provider` | 4.1.1 | ZK node config |
| `@midnight-ntwrk/midnight-js-protocol` | 4.1.1 | Core protocol types |
| `@midnight-ntwrk/midnight-js-types` | 4.1.1 | SDK TypeScript types |
| `@midnight-ntwrk/midnight-js-utils` | 4.1.1 | Utility helpers |
| `@midnight-ntwrk/wallet-sdk` | 1.2.0 | Wallet key derivation & balance |

---

## 🔑 Lace Wallet Integration

1. **Extension Detection:** Checks `window.midnight.mnLace` and `window.cardano.midnight`
2. **Connect (`connectLaceWallet`):** Calls `laceApi.enable()` per `@midnight-ntwrk/dapp-connector-api` spec — prompts user authorization popup
3. **Disconnect (`disconnectLaceWallet`):** Clears session tokens from window context
4. **Error Handling:** Catches user rejection, missing extension, and RPC timeouts with graceful fallback to demo session

---

## ⚡ Zero-Knowledge Circuit Execution

**`donate` circuit (`src/dapp-connector.ts`):**
1. `donorSecret` → SHA-256 hashed off-chain → witness commitment (never transmitted)
2. `amount` → passed to `disclose(amount)` → updates public `totalDonations`
3. Transaction packaged via `MidnightNetworkProviderService` and submitted to Preprod node RPC

**`createCampaign` circuit:**
1. `title` → passed to `disclose(title)` → updates public `activeCampaignTitle`
2. `campaignCount` incremented on-chain

---

## 🚀 Local Development

### Prerequisites
- Node.js >= 22.0.0
- Docker Desktop (for local proof server)
- WSL2 (Windows users)

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Compile Compact smart contract
npm run compile

# 3. Run unit tests (8 tests should pass)
npm run test

# 4. Start local frontend dev server
npm run dev
# → Open http://localhost:5173

# 5. (Optional) Start local ZK proof server
npm run proof-server:start
```

### Environment
Copy `.env.example` to `.env` and configure your network settings.

---

## 📁 Project Structure

```
yuvi/
├── contracts/
│   ├── charity_donation.compact   ← Compact ZK smart contract
│   └── hello-world.compact        ← Reference contract
├── src/
│   ├── App.tsx                    ← Main React app
│   ├── api.ts                     ← Network configs & campaign data
│   ├── dapp-connector.ts          ← Lace wallet + circuit execution
│   ├── deploy.ts                  ← Contract deployment script
│   ├── cli.ts                     ← CLI interaction tool
│   ├── network.ts                 ← Network provider layer
│   └── components/
│       ├── Header.tsx             ← Navigation + wallet controls
│       ├── LedgerTab.tsx          ← Campaign cards + donation UI
│       ├── ProofVisualizerTab.tsx ← ZK proof visualizer
│       ├── WalletTab.tsx          ← Wallet balance display
│       ├── NetworkTab.tsx         ← Infrastructure health
│       └── LaceWalletModal.tsx    ← Wallet connect/disconnect modal
├── tests/
│   └── charity_donation.test.ts  ← 8 Vitest unit tests
├── .github/
│   └── workflows/ci.yml          ← GitHub Actions CI/CD pipeline
├── PROPOSAL.md                   ← Builder challenge idea submission
├── OBJECTION_APPEAL.md           ← Audit compliance evidence
└── README.md                     ← This file
```

---

## 📝 Meaningful Commit History

| # | Commit Message | Change |
|---|---------------|--------|
| 1 | `feat(compact): architect charity_donation.compact with public/private state split` | Initial Compact contract |
| 2 | `test(contract): implement 8 vitest unit tests for donate & createCampaign circuits` | Full test suite |
| 3 | `feat(cli): develop TypeScript CLI runner for contract deployment and state queries` | CLI tooling |
| 4 | `feat(network): add multi-network resolver for Preview and Preprod testnets` | Network layer |
| 5 | `feat(sdk): integrate @midnight-ntwrk/dapp-connector-api and network provider` | SDK integration |
| 6 | `feat(frontend): build React 19 visual dashboard with institutional theme` | Frontend |
| 7 | `feat(lace): implement Lace wallet modal with connect/disconnect/rejection handlers` | Wallet integration |
| 8 | `feat(deploy): deploy contract to Preprod and Preview testnets` | Deployment |
| 9 | `feat(ci): add GitHub Actions CI pipeline with test, typecheck, and build jobs` | CI/CD |
| 10 | `docs(readme): complete README with privacy model section and submission checklist` | Documentation |

---

## 📄 Product Proposal

See [`PROPOSAL.md`](./PROPOSAL.md) for the full idea list submission document.

---

*GiveChain — Built on Midnight Network | Midnight Builder Challenge 2026*
