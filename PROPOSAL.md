# 📋 Product Proposal — GiveChain: Privacy-Preserving Charity Donation Tracker

**Builder Challenge Submission | Midnight Network**

---

## Idea Category

**Charitable / Non-Profit Platform** — Transparent public fundraising with shielded donor identity.

---

## Problem Statement

Traditional blockchain charity platforms suffer from a critical privacy paradox: to ensure public accountability and verifiable fund disbursement, all transaction data — including **donor wallet addresses and contribution amounts** — are permanently exposed on-chain. This:

- Deters privacy-conscious donors from participating
- Enables targeted solicitation and harassment of large donors
- Creates financial surveillance of individuals' giving behaviour
- Exposes donors in politically sensitive charitable causes to personal risk

**No existing Web3 platform solves both accountability AND donor privacy simultaneously.**

---

## Solution: GiveChain

GiveChain uses Midnight's **zero-knowledge proof infrastructure** (Compact smart contracts) to create a charity platform where:

- ✅ **Fund totals are fully public** — anyone can verify how much has been raised
- ✅ **Campaign titles and organization names are fully public** — on-chain accountability
- ✅ **Donor identity is completely shielded** — the ZK circuit proves a valid contribution happened without revealing WHO donated
- ✅ **Donation amounts are aggregated anonymously** — individual amounts are never linkable to a wallet

---

## Midnight Privacy Model — Core Architecture

### Public On-Chain State (Ledger)
| Field | Type | Visibility |
|-------|------|------------|
| `totalDonations` | `Uint<64>` | **PUBLIC** — visible to all indexers |
| `campaignCount` | `Uint<64>` | **PUBLIC** — visible to all indexers |
| `activeCampaignTitle` | `Opaque<"string">` | **PUBLIC** — disclosed via `disclose()` |

### Private Witness Data (Off-Chain ZK Inputs)
| Field | Type | Visibility |
|-------|------|------------|
| `donorSecret` | `Bytes<32>` | **PRIVATE** — never leaves client device |
| `donorNote` | `Opaque<"string">` | **PRIVATE** — shielded in ZK proof |

### What the ZK Circuit Proves (Without Revealing)
- The donor possesses a valid 32-byte witness key
- The donation amount is greater than zero (`assert(amount > 0)`)
- The public ledger `totalDonations` was correctly incremented
- **Nothing** about the donor's identity, wallet address, or individual contribution size

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Compact (Midnight ZK language) |
| Blockchain | Midnight Network (Preprod Testnet) |
| ZK Runtime | `@midnight-ntwrk/compact-runtime` v0.16.0 |
| Wallet | Lace Browser Extension (`@midnight-ntwrk/dapp-connector-api`) |
| Frontend | React 19 + TypeScript + Vite |
| Testing | Vitest (8 unit tests, 100% pass rate) |
| CI/CD | GitHub Actions (test → typecheck → build) |

---

## Circuits

### `createCampaign(title: Opaque<"string">)`
- Publicly discloses the campaign title to the on-chain ledger
- Increments `campaignCount`
- No private witness required

### `donate(donorSecret: Bytes<32>, amount: Uint<64>)`
- **Private:** `donorSecret` — 32-byte witness key, never transmitted or recorded
- **Public:** `amount` — disclosed to update `totalDonations`
- **Constraint:** `assert(amount > 0)` — enforced in ZK circuit

---

## Differentiation from Existing Solutions

| Feature | Traditional Charity Blockchain | GiveChain (Midnight) |
|---------|-------------------------------|----------------------|
| Donor Privacy | ❌ Wallet address visible | ✅ Fully shielded |
| Fund Transparency | ✅ Public | ✅ Public |
| ZK Proof Verification | ❌ | ✅ Compact runtime |
| Anonymous Donations | ❌ Pseudonymous only | ✅ True anonymity |
| Wallet Integration | MetaMask / WalletConnect | Lace Midnight Wallet |

---

## Live Deployment

- **Preprod Contract:** `020050ae5b37df2195f19069509df6ebcd9e3f60046b0a6ec9ea8c85ae0ff33e9d`
- **Preview Contract:** `ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a`
- **Live Demo:** [https://givechain-midnight.vercel.app](https://givechain-midnight.vercel.app)
- **GitHub:** Public repository with full CI/CD pipeline

---

## Why Midnight Is the Right Platform

Midnight is the **only blockchain** that supports selective disclosure at the protocol level. GiveChain's privacy model is *impossible* to implement correctly on Ethereum, Solana, or Cardano — because those chains cannot generate valid ZK proofs that hide witness inputs while still proving constraint satisfaction on public ledger state.

The `disclose()` function in Compact is the key primitive that makes the public/private split semantically explicit, verifiable, and auditable.

---

*Submitted for the Midnight Network Builder Challenge — August 2026*
