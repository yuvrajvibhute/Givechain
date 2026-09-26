/**
 * End-to-end smoke check for GiveChain charity_donation contract.
 *
 * Reconnects to the deployed charity-donation contract, reads its real
 * on-chain ledger state (totalDonations, campaignCount, activeCampaignTitle),
 * and exits 0 on success.
 *
 * Used by `npm run test:e2e` and by the project's CI workflows.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateSeed, getDeployment } from '../src/network';
import { createWallet, persistWalletState } from '../src/wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error wallet sync requires WebSocket
globalThis.WebSocket = WebSocket;

// Must match the privateStateId used at deploy time.
const PRIVATE_STATE_ID = 'charityDonationPrivateState';

// ─── Network configuration ────────────────────────────────────────────────────

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

function fail(msg: string): never {
  console.error(`❌ e2e-check failed: ${msg}`);
  process.exit(1);
}

function isHexAddress(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length >= 32;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  GiveChain E2E Check — charity_donation @ ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Deployment sanity
  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for network ${network}.`);
    console.error(`Run: npm run deploy -- --network ${network}`);
    process.exit(1);
  }
  if (!isHexAddress(deployment.address)) {
    fail(`Deployment address missing or invalid: ${JSON.stringify(deployment, null, 2)}`);
  }

  console.log(`  Contract address: ${deployment.address}`);
  console.log(`  Network:          ${network}\n`);

  // 2. Load compiled charity-donation contract
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

  // 3. Build wallet and providers
  console.log('  Syncing wallet...');
  const walletCtx = await createWallet({ network, networkConfig, seed: SEED });
  await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);
  console.log('  ✓ Wallet synced.\n');

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx() {
      throw new Error('e2e-check is read-only and should not balance transactions');
    },
    submitTx() {
      throw new Error('e2e-check is read-only and should not submit transactions');
    },
  } as any;

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'charity-donation-state',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => 'Local-Devnet-Development-Placeholder-1',
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  // 4. Reconnect to the deployed contract — proves findDeployedContract + callTx interface is wired
  console.log('  Reconnecting to deployed charity_donation contract...');
  try {
    await findDeployedContract(providers, {
      contractAddress: deployment.address,
      compiledContract: compiledContract as any,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    });
    console.log('  ✓ findDeployedContract succeeded.\n');
  } catch (err: any) {
    await walletCtx.wallet.stop();
    fail(`findDeployedContract threw: ${err?.message ?? err}`);
  }

  // 5. Read on-chain contract state via the public data provider.
  //    Proves the contract is indexed and queryable, and decodes the ledger fields.
  console.log('  Querying on-chain ledger state via indexer...');
  const onChainState = await providers.publicDataProvider.queryContractState(deployment.address);
  if (!onChainState) {
    await walletCtx.wallet.stop();
    fail(`queryContractState returned null for ${deployment.address}. Contract may not be indexed yet.`);
  }

  // Decode the ledger fields using the compiled contract's ledger() decoder.
  let totalDonations: bigint = 0n;
  let campaignCount: bigint = 0n;
  let activeCampaignTitle: string = '';
  try {
    const ledger = CharityDonation.ledger(onChainState.data);
    totalDonations = BigInt(ledger.totalDonations ?? 0n);
    campaignCount = BigInt(ledger.campaignCount ?? 0n);
    activeCampaignTitle = String(ledger.activeCampaignTitle ?? '');
  } catch (err: any) {
    await walletCtx.wallet.stop();
    fail(`Failed to decode charity_donation ledger state: ${err?.message ?? err}`);
  }

  // 6. Assert invariants
  if (totalDonations < 0n) {
    await walletCtx.wallet.stop();
    fail(`totalDonations is negative: ${totalDonations}`);
  }
  if (campaignCount < 0n) {
    await walletCtx.wallet.stop();
    fail(`campaignCount is negative: ${campaignCount}`);
  }
  if (typeof activeCampaignTitle !== 'string') {
    await walletCtx.wallet.stop();
    fail(`activeCampaignTitle is not a string: ${typeof activeCampaignTitle}`);
  }

  console.log('\n  📊 On-Chain Ledger State:');
  console.log(`     totalDonations:      ${totalDonations.toLocaleString()} tNIGHT`);
  console.log(`     campaignCount:       ${campaignCount.toLocaleString()}`);
  console.log(`     activeCampaignTitle: "${activeCampaignTitle}"\n`);

  console.log('✅ e2e-check passed!');
  console.log(`   contractAddress: ${deployment.address}`);
  console.log(`   network:         ${network}`);

  await walletCtx.wallet.stop();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
