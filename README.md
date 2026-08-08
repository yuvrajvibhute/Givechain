# GiveChain — Privacy-Preserving Charity Donation Tracker

A decentralized, privacy-preserving charity donation platform built on the Midnight Network using the Compact Zero-Knowledge (ZK) smart contract language.

## Project Vision
Traditional online charity giving often exposes donor personal details, wallet addresses, and contribution histories to public trackers, surveillance, or targeted data mining. The **GiveChain Charity Donation Tracker** solves this by leveraging Midnight's hybrid privacy model. Donors can contribute directly to verified social, educational, and environmental causes with cryptographic proof that their funds were delivered—all while keeping their wallet identities and private witness keys completely hidden off-chain.

## Smart Contract Deployment
- **Network:** Preview Testnet
- **Contract Name:** `charity_donation.compact`
- **Deployed Contract ID:** `ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a`

## Key Features
- **Anonymous ZK Contributions:** Donate to charity causes where donation amounts update transparently on-chain via `disclose(amount)`, but donor identity witness keys (`donorSecret`) remain private off-chain.
- **Interactive Proving Engine Visualizer:** Live 4-step pipeline tracing witness derivation, local proof server calculation, public disclosure, and Substrate node state verification.
- **Real-Time On-Chain Ledger:** Live cause progress bars, campaign creation circuit, and verifiable transaction logs.
- **Lace Browser Wallet Integration:** Connect Lace wallet on Preview Testnet for balance checking (tNIGHT & DUST) and transaction signing.
- **Privacy Assurance Labels:** Explicit UI indicators ("Proved without revealing your input") ensuring zero private data leak.

## Privacy Architecture (Public vs Private Split)
- **Public On-Chain State:** Total donations raised (`totalDonations`), active cause count (`campaignCount`), and campaign titles.
- **Private Witness Data:** Donor identity keys (`donorSecret`) and off-chain execution parameters.
- **Zero-Knowledge Guarantee:** Outputs prove the donor held valid authorization and authorized a non-zero contribution without revealing WHO made the donation.

## Future Scope
- **ZK Grant Allocations:** Milestone-based releases where charity milestone proofs are verified before funds are unlocked.
- **Shielded Multi-Token Support:** Support for custom private Midnight tokens beyond native tNIGHT.
- **DAO Governance:** Privacy-preserving voting for community cause verification and donor reputation badges.

## Tech Stack
- **Smart Contract:** Compact (v0.23+)
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Blockchain / ZK SDK:** `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/midnight-js-contracts` v4.1.1
- **Proving Stack:** Midnight Docker Proof Server (port 6300), Lace Wallet SDK

## Local Development

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
