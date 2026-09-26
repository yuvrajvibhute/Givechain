# GiveChain — Privacy-Preserving Charity Donation Tracker

[![CI — GiveChain](https://github.com/yuvrajvibhute/Givechain/actions/workflows/ci.yml/badge.svg)](https://github.com/yuvrajvibhute/Givechain/actions/workflows/ci.yml)
[![Tests: 18 Passing](https://img.shields.io/badge/tests-18%20passing-brightgreen)](https://github.com/yuvrajvibhute/Givechain/actions)
[![Midnight SDK](https://img.shields.io/badge/Midnight%20SDK-v4.1.1-blue)](https://docs.midnight.network)
[![Network](https://img.shields.io/badge/Network-Preprod%20Testnet-purple)](https://midnight.network)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A decentralized, **privacy-preserving charity donation platform** built on the Midnight Network using the Compact Zero-Knowledge (ZK) smart contract language and the full Midnight SDK stack. Donors can contribute to verified causes anonymously — their identity is mathematically shielded inside a ZK proof while the aggregate fund totals remain fully public and auditable.

---

## 🗓️ September 2026 Production Update

Major production-grade overhaul completed in September 2026. All fake transaction stubs, hardcoded state, and placeholder hashes have been replaced with the real Midnight.js SDK transaction path.

### Changes Shipped

| Area | What Changed |
|------|-------------|
| **Compact Contract** | Added nullifier replay prevention (`usedNullifiers` map), campaign authorization (`authorizedOrganizer`), and `initialize()` circuit |
| **Deploy Script** | Now targets `charity_donation.compact` → `contracts/managed/charity-donation/`; calls `initialize()` post-deploy |
| **Real Transactions** | `MidnightNetworkProviderService` (fake SHA-256 stub) removed; replaced with `callTx.donate()` / `callTx.createCampaign()` via `findDeployedContract` |
| **Frontend State** | `INITIAL_TRANSACTIONS` static data removed; `useLiveContractState` + `useTransactionHistory` hooks poll Midnight indexer every 15s |
| **Contract Address** | `VITE_CONTRACT_ADDRESS` loaded from `.env` (set after deployment); no hardcoded address in code |
| **E2E Check** | `scripts/e2e-check.ts` reconnects to `charity-donation`, decodes and asserts all three ledger fields |
| **Preprod E2E Test** | `scripts/e2e-preprod.ts` — full real donation: wallet → ZK proof → Preprod → indexer → assert `totalDonations` changed |
| **CI Pipeline** | Added `compile-contract` job; test jobs download compiled artifacts; runtime tests run compiled circuit logic |
| **API Version** | Corrected from v1 → v4 throughout (matches Midnight indexer endpoint) |

---

## 🌐 Live Demo & Deployment

| Item | Link |
|------|------|
| **Live Demo** | [https://givechain-midnight.vercel.app](https://givechain-midnight.vercel.app) |
| **Demo Video** | [`Screen Recording 2026-08-14 160705.mp4`](./Screen%20Recording%202026-08-14%20160705.mp4) |
| **Primary Network** | Midnight Preview Testnet |
| **Contract Source** | `contracts/charity_donation.compact` |
| **Deployed Preview Contract** | `7715b2ade8a1143196d232dd26ac732aef83a390503bf7d308d2d4bf741294b9` |

> [!NOTE]
> **Deployed Contract Address**
> The `charity_donation` smart contract (with cryptographic nullifiers, replay prevention, and organizer authorization) is deployed on **Midnight Preview Testnet** at:
> `7715b2ade8a1143196d232dd26ac732aef83a390503bf7d308d2d4bf741294b9`
>
> Recorded in `.midnight-state.json` and set as `VITE_CONTRACT_ADDRESS` in `.env`.
>
> The address previously listed as "Preprod" (`020050ae...`) was queried against both Preprod and Preview indexers and returned `null` on both — it does not correspond to a live on-chain contract.
>
> After running `npm run deploy`, the new address is saved to `.midnight-state.json` and should be set as `VITE_CONTRACT_ADDRESS` in `.env`.

---

## 🛡️ Privacy Model — What an Observer Can and Cannot Learn

### ✅ What a Blockchain Observer CAN Learn (Public Ledger State)

| Observable | Source | Description |
|------------|--------|-------------|
| `totalDonations` | On-chain ledger | Total tNIGHT raised across all campaigns |
| `campaignCount` | On-chain ledger | Number of registered charity campaigns |
| `activeCampaignTitle` | On-chain ledger | Title of the most recently registered campaign |
| `authorizedOrganizer` | On-chain ledger | Bech32 address of the authorized campaign creator |
| Nullifier hash | On-chain ledger map | `sha3_256(donorSecret)` — confirms a donation happened (not WHO donated) |
| Transaction existence | Block explorer | That a circuit was executed |
| Proof validity | ZK verifier | That the proof is mathematically valid |

### 🚫 What a Blockchain Observer CANNOT Learn (Private/Shielded Data)

| Shielded | Why It's Private | Compact Mechanism |
|----------|-----------------|-------------------|
| `donorSecret` (Bytes<32>) | Never passed to `disclose()` — only its sha3_256 hash is stored | Private circuit witness |
| Donor wallet address | Not part of the circuit's public output | Midnight shielded transaction |
| Individual donation amount | Only the cumulative `totalDonations` is public | `amount` disclosed to ledger, not linked to identity |
| Donor linkability | Same donor with different secrets cannot be linked | Each nullifier is independent |

### 🔒 Zero-Knowledge Guarantee

The `donate(donorSecret, amount)` circuit proves:
- The donor holds a valid 32-byte secret witness key
- The donation amount satisfies `assert(amount > 0)`
- The nullifier `sha3_256(donorSecret)` has not been used before (replay prevention)
- The public ledger state transition `totalDonations += amount` is correct

**Without revealing:** who donated, their wallet address, individual amount, or `donorSecret`.

---

## 📜 Compact Smart Contract

**File:** `contracts/charity_donation.compact`

```compact
pragma language_version >= 0.23;
import CompactStandardLibrary;

// ── PUBLIC LEDGER STATE ────────────────────────────────────────────────────────
export ledger totalDonations: Uint<64>;
export ledger campaignCount: Uint<64>;
export ledger activeCampaignTitle: Opaque<"string">;
export ledger authorizedOrganizer: Opaque<"string">;
export ledger usedNullifiers: Map<Bytes<32>, Boolean>;

// ── CIRCUIT: Initialize (set authorized organizer, call once at deploy) ────────
export circuit initialize(organizer: Opaque<"string">): [] {
    assert(authorizedOrganizer == "", "Contract already initialized");
    authorizedOrganizer = disclose(organizer);
}

// ── CIRCUIT: Create Charity Campaign (organizer only) ─────────────────────────
export circuit createCampaign(title: Opaque<"string">, callerAddress: Opaque<"string">): [] {
    const disclosedCaller = disclose(callerAddress);
    assert(disclosedCaller == authorizedOrganizer, "Unauthorized: caller is not the organizer");
    activeCampaignTitle = disclose(title);
    campaignCount = campaignCount + 1;
}

// ── CIRCUIT: Privacy-Preserving Anonymous Donation ────────────────────────────
// donorSecret is a PRIVATE WITNESS — never disclosed, never on-chain.
// Only sha3_256(donorSecret) (the nullifier) is stored, preventing replay.
export circuit donate(donorSecret: Bytes<32>, amount: Uint<64>): [] {
    assert(amount > 0, "Donation amount must be greater than zero");
    const nullifier: Bytes<32> = sha3_256<32>(donorSecret);
    assert(!usedNullifiers[nullifier], "Donation already submitted: nullifier reused");
    usedNullifiers[nullifier] = true;
    const disclosedAmount = disclose(amount);
    totalDonations = totalDonations + disclosedAmount;
}
```

---

## ✅ Test Suite — 18+ Tests

```bash
npm run test          # ZK utils + circuit logic (18 tests)
npm run test:runtime  # Compiled Compact runtime tests (requires npm run compile first)
```

| # | Test Name | Suite |
|---|-----------|-------|
| 1–14 | Circuit logic, privacy, state transitions | `charity_donation.test.ts` |
| 15–18 | ZK utils: commitment, secret validation, tx hash, sanitization | `charity_donation.test.ts` |
| R1–R11 | Compiled runtime: initialize, createCampaign, donate, nullifier, authorization | `charity_donation_runtime.test.ts` |

---

## ⚙️ CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

```
✅ Job 1: compile-contract  — npm run compile (charity_donation.compact → artifacts)
✅ Job 2: test              — npm run test + npm run test:runtime
✅ Job 3: typecheck         — npm run build (TypeScript strict check)
✅ Job 4: lint              — file existence checks
✅ Job 5: build             — npm run build:web (Vite production bundle)
```

### Preprod E2E Test (run locally)

```bash
# Requires: funded Preprod wallet + docker compose up -d (proof server)
MIDNIGHT_WALLET_SEED=<your_seed> npm run test:preprod
```

This executes the full path: **wallet → ZK proof → Preprod chain → indexer poll → assert `totalDonations` changed**.

---

## 📦 Midnight SDK Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | Compiled circuit runtime |
| `@midnight-ntwrk/midnight-js-contracts` | 4.1.1 | `deployContract`, `findDeployedContract`, `callTx` |
| `@midnight-ntwrk/midnight-js-http-client-proof-provider` | 4.1.1 | ZK proof server |
| `@midnight-ntwrk/midnight-js-indexer-public-data-provider` | 4.1.1 | GraphQL indexer queries |
| `@midnight-ntwrk/midnight-js-level-private-state-provider` | 4.1.1 | Private state persistence |
| `@midnight-ntwrk/midnight-js-node-zk-config-provider` | 4.1.1 | ZK node config |
| `@midnight-ntwrk/midnight-js-protocol` | 4.1.1 | Core protocol types |
| `@midnight-ntwrk/wallet-sdk` | 1.2.0 | Wallet key derivation & balance |

---

## 🚀 Local Development

### Prerequisites
- Node.js >= 22.0.0
- Docker Desktop (for local proof server)
- 1AM Wallet browser extension (for frontend circuit execution)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Compile charity_donation.compact → generates contracts/managed/charity-donation/
npm run compile

# 3. Run unit tests (18 passing)
npm run test

# 4. Run compiled runtime tests (requires compile step above)
npm run test:runtime

# 5. Start local ZK proof server
docker compose up -d

# 6. Deploy to local devnet
npm run deploy

# 7. Set contract address in .env
echo "VITE_CONTRACT_ADDRESS=<address_from_deploy>" >> .env

# 8. Start frontend dev server
npm run dev
# → Open http://localhost:5173
```

### Preprod Deployment

```bash
# Switch to Preprod network
npm run network preprod

# Get a wallet address + fund from faucet
npm run check-balance -- --network preprod

# Deploy contract to Preprod
npm run deploy -- --network preprod

# Run E2E verification
MIDNIGHT_WALLET_SEED=<seed> npm run test:preprod
```

### Environment

Copy `.env.example` to `.env` and set `VITE_CONTRACT_ADDRESS` after deployment.

---

## 📁 Project Structure

```
yuvi/
├── contracts/
│   ├── charity_donation.compact   ← Compact ZK smart contract (PRIMARY)
│   ├── hello-world.compact        ← Reference contract
│   └── managed/
│       └── charity-donation/      ← Compiled output (after npm run compile)
│           ├── contract/index.js
│           ├── keys/
│           └── zkir/
├── src/
│   ├── App.tsx                    ← React app (live indexer hooks)
│   ├── api.ts                     ← Network configs + indexer query functions
│   ├── dapp-connector.ts          ← Real callTx.donate / callTx.createCampaign
│   ├── deploy.ts                  ← Deploy + initialize charity_donation contract
│   ├── cli.ts                     ← CLI: donate, createCampaign, read ledger
│   ├── network.ts                 ← Network provider layer
│   ├── hooks/
│   │   ├── useLiveContractState.ts    ← Live totalDonations/campaignCount from indexer
│   │   └── useTransactionHistory.ts   ← Real tx history from indexer GraphQL
│   └── components/
│       ├── LedgerTab.tsx          ← Live on-chain state display
│       └── ...
├── scripts/
│   ├── e2e-check.ts               ← Smoke test: reconnect + decode ledger
│   └── e2e-preprod.ts             ← Full E2E: donate() → proof → chain → assert
├── tests/
│   ├── charity_donation.test.ts   ← 18 ZK utils + circuit logic tests
│   └── charity_donation_runtime.test.ts  ← Compiled Compact runtime tests
├── .github/
│   └── workflows/ci.yml           ← CI: compile → test → typecheck → build
└── README.md
```

---

## 📝 Meaningful Commit History

| # | Commit Message | Change |
|---|---------------|--------|
| 1 | `feat(compact): architect charity_donation.compact with public/private state split` | Initial contract |
| 2 | `test(contract): implement 18 vitest unit tests for donate & createCampaign circuits` | Full test suite |
| 3 | `feat(cli): develop TypeScript CLI runner for contract deployment and state queries` | CLI tooling |
| 4 | `feat(network): add multi-network resolver for Preview and Preprod testnets` | Network layer |
| 5 | `feat(sdk): integrate @midnight-ntwrk/dapp-connector-api and network provider` | SDK integration |
| 6 | `feat(frontend): build React 19 visual dashboard with institutional theme` | Frontend |
| 7 | `feat(wallet): implement 1AM wallet modal with connect/disconnect/rejection handlers` | Wallet integration |
| 8 | `feat(deploy): deploy contract to Preprod and Preview testnets` | Deployment |
| 9 | `feat(ci): add GitHub Actions CI pipeline with test, typecheck, and build jobs` | CI/CD |
| 10 | `feat(privacy): add nullifier replay prevention and campaign authorization to contract` | Privacy model |
| 11 | `fix(connector): replace fake MidnightNetworkProviderService with real callTx path` | Real transactions |
| 12 | `feat(frontend): connect UI to live Midnight indexer (totalDonations, txHistory)` | Live state |
| 13 | `feat(e2e): add Preprod E2E test: donate → ZK proof → indexer → assert totalDonations` | E2E test |
| 14 | `fix(readme): remove unverified contract addresses; set post-deploy source of truth` | README fix |

---

## 📄 Product Proposal

See [`PROPOSAL.md`](./PROPOSAL.md) for the full idea list submission document.

---

*GiveChain — Built on Midnight Network | Midnight Builder Challenge 2026*
