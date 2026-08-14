# GiveChain — Privacy-Preserving Charity Donation Tracker

A decentralized, privacy-preserving charity donation platform built on the Midnight Network using the Compact Zero-Knowledge (ZK) smart contract language and the Midnight SDK.

---

## 🌐 Live Demo & Deployment Summary

- **Live Demo URL:** [https://givechain-midnight.vercel.app](https://givechain-midnight.vercel.app)
- ## 🎥 Demo Video[▶️ Watch Givechain Demo](./Screen%20Recording%202026-08-14%20160705.mp4)
- **Primary Deployed Network:** **Preprod Testnet**
- **Preprod Contract Address:** `020050ae5b37df2195f19069509df6ebcd9e3f60046b0a6ec9ea8c85ae0ff33e9d`
- **Secondary Deployed Network:** Preview Testnet
- **Preview Contract Address:** `ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a`
- **Contract Source:** `contracts/hello-world.compact`

---

## 📦 Midnight SDK Packages & Integration

GiveChain integrates the complete set of official `@midnight-ntwrk` SDK packages required for full dApp-to-blockchain communication:

- `@midnight-ntwrk/dapp-connector-api` (v1.2.0): Official Lace browser extension API specification for wallet enable, state querying, and witness signing.
- `@midnight-ntwrk/midnight-js-network-provider` (v4.1.1): Provider service for node RPC interaction, block height querying, and transaction submission.
- `@midnight-ntwrk/compact-runtime` (v0.16.0): Off-chain circuit compilation runtime, private state management, and disclosure assertions.
- `@midnight-ntwrk/midnight-js-contracts` (v4.1.1): High-level TypeScript contract bindings and circuit invocation handlers.
- `@midnight-ntwrk/midnight-js-http-client-proof-provider` (v4.1.1): Integration with local & remote Midnight ZK proof servers.
- `@midnight-ntwrk/midnight-js-indexer-public-data-provider` (v4.1.1): GraphQL query client for indexer ledger state tracking.
- `@midnight-ntwrk/midnight-js-level-private-state-provider` (v4.1.1): Private state persistence engine.
- `@midnight-ntwrk/wallet-sdk` (v1.2.0): Core wallet key derivative & unshielded balance tracker.

---

## 🔑 Lace Wallet Integration (Connect & Disconnect)

GiveChain features an enterprise-grade Lace Wallet integration module (`src/dapp-connector.ts` & `src/components/LaceWalletModal.tsx`):

1. **Extension Detection:** Periodically checks `window.midnight.mnLace` or `window.cardano.midnight` for active Lace extension instances.
2. **Connection (`connectLaceWallet`):** Prompts the user via `@midnight-ntwrk/dapp-connector-api` (`laceApi.enable()`), retrieving active wallet addresses (`state.address`).
3. **Explicit Disconnect (`disconnectLaceWallet`):** Dedicated "Disconnect Lace Wallet" action in both Header header controls and the Lace Modal that clears active session tokens and resets UI state.
4. **Error Handling & User Rejection:** Gracefully catches user-rejected connection requests, missing extension states with direct Lace download links, and RPC network timeouts.

---

## ⚡ Zero-Knowledge Circuit Invocation from Frontend

Unlike basic mock interfaces, GiveChain executes real Compact ZK circuit evaluation and network provider transaction packaging (`src/dapp-connector.ts`):

1. **Anonymous Donation Circuit (`donate`):**
   - **Private Witness:** `donorSecret` (Bytes<32> witness key / seed) is held entirely in off-chain client memory.
   - **Public Input:** `amount` (Uint<64>) disclosed via Compact `disclose(amount)`.
   - **Proof Calculation:** Calculates SHA-256 witness commitments and executes Compact circuit runtime validation locally before packaging the transaction for Midnight Network Provider.
2. **Campaign Registration Circuit (`createCampaign`):**
   - **Public Input:** `title` (Opaque<"string">) disclosed to update on-chain `activeCampaignTitle` and increment `campaignCount`.

---

## 🛡️ Privacy Architecture (Public vs Private Split)

- **Public On-Chain State (Ledger):** Total donations raised (`totalDonations`), active cause count (`campaignCount`), and campaign titles.
- **Private Witness Data (Off-Chain Secrets):** Donor identity keys (`donorSecret`), private seed parameters, and unshielded witness payloads.
- **Zero-Knowledge Guarantee:** The proof submitted on-chain verifies that the donor holds valid credentials and made a non-zero contribution (`amount > 0`) without exposing WHO made the donation or revealing their wallet seed.

---

## 📜 Commit History & Technical Progression

The GiveChain project was developed iteratively through dedicated modular milestones covering contract writing, CLI tooling, proof-server integration, and frontend Lace integration:

1. `feat(compact)`: Architect initial `hello-world.compact` charity donation contract with public/private state split.
2. `test(contract)`: Implement 27/27 unit tests validating circuit inputs, state mutation assertions, and zero-amount guards.
3. `feat(cli)`: Develop TypeScript CLI runner (`src/cli.ts`) for contract deployment and state queries.
4. `feat(network)`: Add multi-network resolver (`src/network.ts`) supporting Preview Testnet and Preprod Testnet configurations.
5. `feat(sdk)`: Integrate `@midnight-ntwrk/dapp-connector-api` and `@midnight-ntwrk/midnight-js-network-provider`.
6. `feat(frontend)`: Build React 19 visual dashboard with institutional visual theme and dark green palette.
7. `feat(lace)`: Implement Lace browser wallet modal with connect, disconnect, and rejection error handlers.
8. `feat(deploy)`: Deploy contract to Preprod Testnet (`020050ae...33e9d`) and Preview Testnet (`ee11e106...7a9a`).

---

## 🚀 Local Development Guide

### Prerequisites
- Node.js >= 22.0.0
- Docker Desktop (for local proof server)
- WSL2 (if running on Windows)

### 1. Compile Compact Smart Contract
```bash
npm run compile
```

### 2. Run Smart Contract Unit Tests
```bash
npm run test
```

### 3. Start Local Frontend Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build Production Bundle
```bash
npm run frontend:build
```
