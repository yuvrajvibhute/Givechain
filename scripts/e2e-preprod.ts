/**
 * GiveChain Preprod End-to-End Test
 *
 * Full real transaction path: wallet → ZK proof → Midnight Preprod → indexer → assert
 *
 * Usage:
 *   MIDNIGHT_WALLET_SEED=<hex_seed> npm run test:preprod
 *
 * What this test does:
 *   1. Loads wallet from MIDNIGHT_WALLET_SEED env var (must be funded with tNIGHT on Preprod)
 *   2. Syncs wallet with Preprod testnet
 *   3. Reconnects to the deployed charity_donation contract at the address in .midnight-state.json
 *   4. Reads totalDonations BEFORE
 *   5. Calls callTx.donate(donorSecretBytes, 1n) — generates a REAL ZK proof, signs, submits
 *   6. Polls the Midnight indexer until totalDonations increases (up to 5 minutes)
 *   7. Asserts totalDonations_after == totalDonations_before + 1n
 *   8. Prints real tx hash, real block height, real proof time
 *   9. Exits 0 on pass
 *
 * Prerequisites:
 *   - npm run compile    (generate charity-donation contract artifacts)
 *   - npm run deploy -- --network preprod
 *   - docker compose up -d   (proof server must be running)
 *   - Wallet funded with tNIGHT (from faucet: https://midnight-tmnight-preprod.nethermind.dev)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateSeed, getDeployment } from '../src/network';
import { createWallet, persistWalletState, unshieldedToken } from '../src/wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error wallet sync requires WebSocket
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'charityDonationPrivateState';

// ─── Network & Seed ───────────────────────────────────────────────────────────

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

if (network !== 'preprod' && network !== 'preview') {
  console.error(`\n❌ This E2E test targets Preprod or Preview testnet.`);
  console.error(`   Run: npm run test:preprod (uses --network preprod by default)\n`);
  process.exit(1);
}

function fail(msg: string): never {
  console.error(`\n❌ Preprod E2E failed: ${msg}\n`);
  process.exit(1);
}

/**
 * Converts a donor secret string to a padded 32-byte Uint8Array for the donate circuit.
 */
function donorSecretToBytes32(secret: string): Uint8Array {
  const bytes = new TextEncoder().encode(secret);
  const result = new Uint8Array(32);
  result.set(bytes.slice(0, 32));
  return result;
}

/**
 * Polls the indexer until the contract state's totalDonations changes.
 * Returns the new totalDonations value or throws if timeout exceeded.
 */
async function pollUntilDonationsChange(
  providers: any,
  contractAddress: string,
  CharityDonation: any,
  previousTotal: bigint,
  timeoutMs = 5 * 60 * 1000, // 5 minutes
): Promise<bigint> {
  const pollInterval = 10_000; // 10 seconds
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  console.log(`\n  Polling indexer for totalDonations change (timeout: ${timeoutMs / 60_000}min)...`);

  while (Date.now() < deadline) {
    attempt++;
    await new Promise((r) => setTimeout(r, pollInterval));

    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state) {
        const ledger = CharityDonation.ledger(state.data);
        const newTotal = BigInt(ledger.totalDonations ?? 0n);
        process.stdout.write(`\r  Attempt ${attempt}: totalDonations = ${newTotal.toLocaleString()}   `);

        if (newTotal > previousTotal) {
          process.stdout.write('\n');
          return newTotal;
        }
      }
    } catch {
      // Indexer temporarily unavailable — keep polling
    }
  }

  fail(`totalDonations did not increase within ${timeoutMs / 60_000} minutes.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  GiveChain Preprod E2E Test — ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Check deployment record
  const deployment = getDeployment(network);
  if (!deployment) {
    fail(`No deployment found for network ${network}. Run: npm run deploy -- --network ${network}`);
  }
  console.log(`  Contract: ${deployment.address}`);

  // 2. Load compiled contract
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'charity-donation');
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
  if (!fs.existsSync(contractPath)) {
    fail('Compiled charity-donation contract missing — run `npm run compile`.');
  }
  const CharityDonation = await import(pathToFileURL(contractPath).href);
  const compiledContract = CompiledContract.make('charity-donation', CharityDonation.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  // 3. Set up wallet
  console.log('\n─── Wallet & Network Sync ──────────────────────────────────────\n');
  console.log('  Creating wallet from seed...');
  const walletCtx = await createWallet({ network, networkConfig, seed: SEED });

  console.log('  Syncing with Preprod (this may take several minutes)...');
  const syncStart = Date.now();
  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);
    process.stdout.write(`\r  ⏳ Syncing... (${elapsed}s)   `);
  }, 5000);
  const state = await walletCtx.wallet.waitForSyncedState();
  clearInterval(syncInterval);
  process.stdout.write('\r  ✓ Synced!                                         \n');

  await persistWalletState(network, walletCtx);

  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dustBalance = state.dust.balance(new Date());
  console.log(`  tNIGHT balance: ${balance.toLocaleString()}`);
  console.log(`  DUST balance:   ${dustBalance.toLocaleString()}`);

  if (balance === 0n) {
    fail(
      `Wallet has 0 tNIGHT on ${network}. Fund it first:\n` +
      `  Address: ${walletCtx.unshieldedKeystore.getBech32Address()}\n` +
      `  Faucet:  ${networkConfig.faucet}`,
    );
  }

  // 4. Build providers
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
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

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'charity-donation-state-e2e',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () =>
        process.env.PRIVATE_STATE_PASSWORD?.trim() ?? 'Local-Devnet-Development-Placeholder-1',
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  // 5. Reconnect to deployed contract
  console.log('\n─── Connect to Contract ────────────────────────────────────────\n');
  console.log('  Reconnecting to charity_donation contract...');
  let deployed: any;
  try {
    deployed = await findDeployedContract(providers, {
      contractAddress: deployment.address,
      compiledContract: compiledContract as any,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    });
    console.log('  ✓ Contract connected.\n');
  } catch (err: any) {
    await walletCtx.wallet.stop();
    fail(`findDeployedContract threw: ${err?.message ?? err}`);
  }

  // 6. Read totalDonations BEFORE the test donation
  console.log('─── Pre-Donation State ─────────────────────────────────────────\n');
  const beforeState = await providers.publicDataProvider.queryContractState(deployment.address);
  if (!beforeState) {
    await walletCtx.wallet.stop();
    fail(`Contract state not found in indexer. Verify deployment at ${deployment.address}`);
  }
  const beforeLedger = CharityDonation.ledger(beforeState.data);
  const totalBefore = BigInt(beforeLedger.totalDonations ?? 0n);
  const campaignCountBefore = BigInt(beforeLedger.campaignCount ?? 0n);
  console.log(`  totalDonations (before): ${totalBefore.toLocaleString()} tNIGHT`);
  console.log(`  campaignCount  (before): ${campaignCountBefore.toLocaleString()}\n`);

  // 7. Execute callTx.donate() — REAL ZK proof + signing + submission
  console.log('─── Submit Donation Transaction ────────────────────────────────\n');
  console.log('  Calling donate(donorSecret, 1) — generating real ZK proof...');
  console.log('  (This may take 30–120 seconds depending on proof server load)\n');

  // Use a unique donor secret for this test run to avoid nullifier reuse.
  const testSecret = `e2e-test-secret-${Date.now()}-${Math.random()}`;
  const donorSecretBytes = donorSecretToBytes32(testSecret);

  const proofStart = performance.now();
  let tx: any;
  try {
    tx = await deployed.callTx.donate(donorSecretBytes, 1n);
  } catch (err: any) {
    await walletCtx.wallet.stop();
    fail(`callTx.donate() failed: ${err?.message ?? err}`);
  }
  const proofTimeMs = Math.round(performance.now() - proofStart);

  console.log(`  ✅ Transaction submitted!`);
  console.log(`  Transaction ID:  ${tx.public.txId}`);
  console.log(`  Block Height:    ${tx.public.blockHeight}`);
  console.log(`  Proof Time:      ${proofTimeMs}ms\n`);

  // 8. Poll indexer until totalDonations increases
  console.log('─── Verify On-Chain State ──────────────────────────────────────');
  const totalAfter = await pollUntilDonationsChange(
    providers,
    deployment.address,
    CharityDonation,
    totalBefore,
  );

  // 9. Assert the expected state change
  console.log(`\n  totalDonations (after):  ${totalAfter.toLocaleString()} tNIGHT`);
  const expectedAfter = totalBefore + 1n;
  if (totalAfter !== expectedAfter) {
    await walletCtx.wallet.stop();
    fail(
      `totalDonations mismatch: expected ${expectedAfter}, got ${totalAfter}. ` +
      `Difference: ${totalAfter - totalBefore} (expected +1).`,
    );
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ Preprod E2E Test PASSED`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Network:          ${network}`);
  console.log(`║  Contract:         ${deployment.address.slice(0, 20)}...`);
  console.log(`║  Transaction ID:   ${tx.public.txId}`);
  console.log(`║  Block Height:     ${tx.public.blockHeight}`);
  console.log(`║  Proof Time:       ${proofTimeMs}ms`);
  console.log(`║  totalDonations:   ${totalBefore} → ${totalAfter} (+1 tNIGHT verified)`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n❌ Unhandled error in Preprod E2E test:');
  console.error(err);
  process.exit(1);
});
