/**
 * GiveChain CLI — interact with the deployed charity_donation contract.
 *
 * Menu:
 *   1. Donate (anonymous, ZK proof)
 *   2. Create Campaign (organizer only)
 *   3. Read ledger state
 *   4. Check wallet balance
 *   5. Exit
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

// Midnight SDK imports
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateSeed, getDeployment } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

// Must match the privateStateId used at deploy time.
const PRIVATE_STATE_ID = 'charityDonationPrivateState';

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load compiled charity-donation contract (from `npm run compile`)
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'charity-donation');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Charity donation contract not compiled!');
  console.error('   Run: npm run compile\n');
  process.exit(1);
}

const CharityDonation = await import(pathToFileURL(contractPath).href);

const compiledContract = CompiledContract.make('charity-donation', CharityDonation.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Providers ────────────────────────────────────────────────────────────────

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword =
    process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'charity-donation-state',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

/**
 * Converts a string donor secret into a padded/truncated 32-byte Uint8Array
 * suitable for passing as Bytes<32> to the Compact donate() circuit.
 */
function donorSecretToBytes32(secret: string): Uint8Array {
  const bytes = new TextEncoder().encode(secret);
  const result = new Uint8Array(32);
  result.set(bytes.slice(0, 32));
  return result;
}

// ─── Main CLI ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              GiveChain CLI — Charity Donation Tracker        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const rl = createInterface({ input: stdin, output: stdout });

  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for network ${network}. Run \`npm run deploy -- --network ${network}\` first.`);
    process.exit(1);
  }
  console.log(`  Contract: ${deployment.address}`);
  console.log(`  Network:  ${network}\n`);

  try {
    console.log('  Connecting to wallet...');
    const walletCtx = await createWallet({ network, networkConfig, seed: SEED });
    const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
    if (restoredCount > 0) {
      console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state.`);
    }

    console.log('  Syncing with network...');
    console.log('  ℹ  This may take several minutes.\n');
    const syncStart = Date.now();
    const syncInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - syncStart) / 1000);
      process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
    }, 5000);
    const state = await walletCtx.wallet.waitForSyncedState();
    clearInterval(syncInterval);
    process.stdout.write('\r  ✓ Synced.                                             \n');

    await persistWalletState(network, walletCtx);
    const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

    if (balance === 0n && network !== 'undeployed' && networkConfig.faucet) {
      const address = walletCtx.unshieldedKeystore.getBech32Address();
      console.log('  ⚠ Wallet has no tNight. Fund it from the faucet:');
      console.log(`     ${networkConfig.faucet}`);
      console.log(`     Wallet address: ${address}\n`);
    }

    console.log('  Connecting to charity_donation contract...');
    const providers = await createProviders(walletCtx);

    const deployed: any = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    });

    console.log('  ✅ Connected!\n');

    let running = true;
    while (running) {
      console.log('─── Menu ───────────────────────────────────────────────────────');
      console.log('  0. Initialize Contract (set authorized organizer)');
      console.log('  1. Donate (anonymous ZK proof)');
      console.log('  2. Create Campaign (organizer only)');
      console.log('  3. Read on-chain ledger state');
      console.log('  4. Check wallet balance');
      console.log('  5. Exit\n');

      const choice = await rl.question('  Your choice: ');

      switch (choice.trim()) {
        case '0': {
          // ── Initialize circuit ───────────────────────────────────────────────
          const organizerAddress = walletCtx.unshieldedKeystore.getBech32Address().toString();
          console.log(`\n  Initializing contract with organizer: ${organizerAddress}...`);
          console.log('  Generating ZK proof & submitting initialize transaction...\n');
          const proofStart = performance.now();
          try {
            const tx = await deployed.callTx.initialize(organizerAddress);
            const proofMs = Math.round(performance.now() - proofStart);
            console.log(`\n  ✅ Contract initialized!`);
            console.log(`  Organizer:       ${organizerAddress}`);
            console.log(`  Transaction ID:  ${tx.public.txId}`);
            console.log(`  Block Height:    ${tx.public.blockHeight}`);
            console.log(`  Proof Time:      ${proofMs}ms\n`);
          } catch (err: any) {
            const msg = err?.message || String(err);
            if (msg.includes('already initialized')) {
              console.log('\n  ℹ  Contract is already initialized.\n');
            } else {
              console.error(`\n  ❌ Initialize failed: ${msg}\n`);
            }
          }
          break;
        }
        case '1': {
          // ── Donate circuit ───────────────────────────────────────────────────
          const secretInput = await rl.question(
            '  Enter donor secret (≥8 chars, stays private): ',
          );
          if (!secretInput || secretInput.trim().length < 8) {
            console.log('\n  ❌ Secret must be at least 8 characters.\n');
            break;
          }
          const amountStr = await rl.question('  Enter donation amount (tNIGHT micro-units, min 1): ');
          const amount = BigInt(amountStr.trim());
          if (amount <= 0n) {
            console.log('\n  ❌ Amount must be > 0.\n');
            break;
          }

          console.log('\n  Generating ZK proof & submitting transaction...');
          console.log('  (This may take 30–90 seconds — a real ZK proof is being generated.)\n');

          const donorSecretBytes = donorSecretToBytes32(secretInput.trim());
          const proofStart = performance.now();

          try {
            // Real callTx: generates ZK proof, balances tx, signs, submits to Midnight.
            const tx = await deployed.callTx.donate(donorSecretBytes, amount);
            const proofMs = Math.round(performance.now() - proofStart);

            console.log(`\n  ✅ Donation confirmed!`);
            console.log(`  Transaction ID:  ${tx.public.txId}`);
            console.log(`  Block Height:    ${tx.public.blockHeight}`);
            console.log(`  Proof Time:      ${proofMs}ms`);
            console.log(`  Privacy:         donorSecret never transmitted — only nullifier hash stored on-chain\n`);
          } catch (err: any) {
            const msg = err?.message || String(err);
            if (msg.includes('nullifier reused')) {
              console.error('\n  ❌ This donor secret was already used. Please use a different secret.\n');
            } else {
              console.error(`\n  ❌ Donation failed: ${msg}\n`);
            }
          }
          break;
        }

        case '2': {
          // ── createCampaign circuit ───────────────────────────────────────────
          const title = await rl.question('  Campaign title: ');
          if (!title.trim()) {
            console.log('\n  ❌ Title cannot be empty.\n');
            break;
          }
          const organizerAddress = walletCtx.unshieldedKeystore.getBech32Address().toString();

          console.log('\n  Generating ZK proof & submitting createCampaign transaction...\n');
          const proofStart = performance.now();

          try {
            // Real callTx: proves callerAddress == authorizedOrganizer on-chain.
            const tx = await deployed.callTx.createCampaign(title.trim(), organizerAddress);
            const proofMs = Math.round(performance.now() - proofStart);

            console.log(`\n  ✅ Campaign created!`);
            console.log(`  Transaction ID:  ${tx.public.txId}`);
            console.log(`  Block Height:    ${tx.public.blockHeight}`);
            console.log(`  Proof Time:      ${proofMs}ms`);
            console.log(`  Title:           "${title.trim()}"\n`);
          } catch (err: any) {
            const msg = err?.message || String(err);
            if (msg.includes('Unauthorized')) {
              console.error('\n  ❌ Not authorized. Only the deploying organizer can create campaigns.\n');
            } else {
              console.error(`\n  ❌ Campaign creation failed: ${msg}\n`);
            }
          }
          break;
        }

        case '3': {
          // ── Read on-chain ledger state ───────────────────────────────────────
          console.log('\n  Querying indexer for on-chain ledger state...');
          try {
            const contractState = await providers.publicDataProvider.queryContractState(
              deployment.address,
            );
            if (contractState) {
              const ledger = CharityDonation.ledger(contractState.data);
              const totalDonations: bigint = ledger.totalDonations;
              const campaignCount: bigint = ledger.campaignCount;
              const activeCampaignTitle: string = ledger.activeCampaignTitle ?? '(none set)';

              console.log('\n  📊 On-Chain Ledger State:');
              console.log(`     totalDonations:      ${totalDonations.toLocaleString()} tNIGHT`);
              console.log(`     campaignCount:       ${campaignCount.toLocaleString()}`);
              console.log(`     activeCampaignTitle: "${activeCampaignTitle}"\n`);
            } else {
              console.log('\n  ❌ Contract state not found in indexer. Verify the contract address.\n');
            }
          } catch (err: any) {
            console.error(`\n  ❌ Failed to query state: ${err?.message || err}\n`);
          }
          break;
        }

        case '4': {
          // ── Wallet balance ───────────────────────────────────────────────────
          console.log('\n  Checking balance...');
          const currentState = await walletCtx.wallet.waitForSyncedState();
          const currentBalance = currentState.unshielded.balances[unshieldedToken().raw] ?? 0n;
          const dustBalance = currentState.dust.balance(new Date());
          console.log(`\n  tNight: ${currentBalance.toLocaleString()}`);
          console.log(`  DUST:   ${dustBalance.toLocaleString()}\n`);
          break;
        }

        case '5':
          running = false;
          console.log('\n  👋 Goodbye!\n');
          break;

        default:
          console.log('\n  ❌ Invalid choice. Please enter 1–5.\n');
      }
    }

    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
