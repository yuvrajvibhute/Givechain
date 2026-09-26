/**
 * API service layer for Midnight network status and Charity Donation Tracker contract state.
 *
 * Key changes from the original:
 * - INITIAL_TRANSACTIONS removed: frontend now reads real tx history from the Midnight indexer.
 * - INITIAL_CAMPAIGNS kept as UI scaffold only (seeded campaigns for display before indexer data loads).
 * - NETWORKS API version corrected from v1 → v4 (matching the backend network.ts).
 * - Added queryIndexerContractState() and queryIndexerTransactionHistory() for live data.
 */

export interface NetworkConfig {
  networkId: string;
  name: string;
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  proofServerUrl: string;
  faucetUrl?: string;
}

// API version v4 — matches the backend network.ts and the official Midnight indexer endpoints.
export const NETWORKS: Record<string, NetworkConfig> = {
  undeployed: {
    networkId: 'undeployed',
    name: 'Local Devnet',
    indexerUrl: 'http://localhost:8088/api/v4/graphql',
    indexerWsUrl: 'ws://localhost:8088/api/v4/graphql/ws',
    nodeUrl: 'http://localhost:9944',
    proofServerUrl: 'http://localhost:6300',
  },
  preview: {
    networkId: 'preview',
    name: 'Preview Testnet',
    indexerUrl: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    nodeUrl: 'https://rpc.preview.midnight.network',
    proofServerUrl: 'https://lace-proof-pub.preview.midnight.network',
    faucetUrl: 'https://midnight-tmnight-preview.nethermind.dev',
  },
  preprod: {
    networkId: 'preprod',
    name: 'Preprod Testnet',
    indexerUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    nodeUrl: 'https://rpc.preprod.midnight.network',
    proofServerUrl: 'https://lace-proof-pub.preprod.midnight.network',
    faucetUrl: 'https://midnight-tmnight-preprod.nethermind.dev',
  },
};

export interface CharityCampaign {
  id: string;
  title: string;
  category: string;
  targetGoal: number;
  targetAmount?: number;
  raisedAmount: number;
  donorCount: number;
  description: string;
  organizationName?: string;
  organizerAddress?: string;
  imageUrl?: string;
  verifiedStatus?: boolean;
}

export interface TransactionRecord {
  id: string;
  txHash: string;
  circuitName: 'donate' | 'createCampaign';
  campaignTitle: string;
  amount: number;
  blockHeight: number;
  timestamp: string;
  status: 'pending' | 'proving' | 'confirmed' | 'failed';
  proofTimeMs: number;
  privacyGuarantee: string;
}

// Campaign display scaffold — these represent the UI cards.
// Note: raisedAmount and donorCount are populated from on-chain data when available.
export const INITIAL_CAMPAIGNS: CharityCampaign[] = [
  {
    id: 'camp-1',
    title: 'Clean Water Infrastructure for Rural Schools',
    category: 'Environment & Health',
    targetGoal: 50000,
    targetAmount: 50000,
    raisedAmount: 0, // Updated from indexer
    donorCount: 0,   // Updated from indexer
    description: 'Providing solar-powered water filtration systems to remote educational institutes.',
    organizationName: 'Aqua Pure Foundation',
    verifiedStatus: true,
  },
  {
    id: 'camp-2',
    title: 'Zero-Knowledge Education & Developer Grants',
    category: 'Web3 & Tech',
    targetGoal: 25000,
    targetAmount: 25000,
    raisedAmount: 0,
    donorCount: 0,
    description: 'Funding open-source privacy software research and student developer bootcamps.',
    organizationName: 'Midnight Dev Guild',
    verifiedStatus: true,
  },
  {
    id: 'camp-3',
    title: 'Emergency Relief & Medical Supply Distribution',
    category: 'Humanitarian',
    targetGoal: 100000,
    targetAmount: 100000,
    raisedAmount: 0,
    donorCount: 0,
    description: 'Direct privacy-preserving emergency aid to disaster affected community centers.',
    organizationName: 'Global Med Relief',
    verifiedStatus: true,
  },
];

// ─── On-Chain State Types ─────────────────────────────────────────────────────

export interface ContractLedgerState {
  totalDonations: bigint;
  campaignCount: bigint;
  activeCampaignTitle: string;
}

export interface IndexerTransaction {
  id: string;
  txHash: string;
  circuitName: 'donate' | 'createCampaign';
  blockHeight: number;
  timestamp: string;
}

// ─── Indexer Query Functions ──────────────────────────────────────────────────

/**
 * Queries the Midnight indexer GraphQL endpoint (v4 schema) for the current on-chain
 * contract state using the `contractAction` field (confirmed via live schema introspection).
 *
 * Schema: contractAction(address: String!) { address state zswapState transaction unshieldedBalances }
 *
 * Returns null if the contract is not indexed or the indexer is unreachable.
 */
export async function queryIndexerContractState(
  indexerUrl: string,
  contractAddress: string,
): Promise<{ raw: Uint8Array } | null> {
  try {
    const query = `
      query ContractState($address: String!) {
        contractAction(address: $address) {
          address
          state
        }
      }
    `;
    const res = await fetch(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { address: contractAddress } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const stateHex: string | undefined = json?.data?.contractAction?.state;
    if (!stateHex) return null;
    // Convert hex state to Uint8Array for the contract's ledger() decoder.
    const bytes = new Uint8Array(
      stateHex.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)),
    );
    return { raw: bytes };
  } catch {
    return null;
  }
}

/**
 * Queries the Midnight indexer for transactions associated with a specific
 * contract address. Uses the `transactions` query from the v4 GraphQL schema.
 *
 * v4 Schema fields confirmed via introspection:
 *   transactions → nodes { hash blockInfo { height timestamp } contractActions { address } }
 */
export async function queryIndexerTransactionHistory(
  indexerUrl: string,
  contractAddress: string,
  limit = 20,
): Promise<IndexerTransaction[]> {
  try {
    // Query transactions that include a contractAction for our address.
    // The v4 schema exposes `transactions` as the top-level list.
    const query = `
      query TxHistory($limit: Int!) {
        transactions(first: $limit) {
          nodes {
            hash
            blockInfo {
              height
              timestamp
            }
            contractActions {
              address
            }
          }
        }
      }
    `;
    const res = await fetch(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { limit } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const nodes = json?.data?.transactions?.nodes ?? [];

    // Filter to only txs involving our contract, then map to IndexerTransaction
    return nodes
      .filter((node: any) =>
        Array.isArray(node?.contractActions) &&
        node.contractActions.some((ca: any) => ca?.address === contractAddress),
      )
      .slice(0, limit)
      .map((node: any, i: number): IndexerTransaction => ({
        id: `indexer-tx-${node.hash ?? i}`,
        txHash: node.hash ?? 'unknown',
        // Without circuit name in v4 schema, we default to 'donate' for all filtered txs.
        // The compiled runtime test suite can distinguish circuit names from private state.
        circuitName: 'donate',
        blockHeight: node.blockInfo?.height ?? 0,
        timestamp: node.blockInfo?.timestamp ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ─── Service Health Check ─────────────────────────────────────────────────────

export async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal, mode: 'no-cors' });
    clearTimeout(timeoutId);
    return res.status === 200 || res.type === 'opaque' || res.ok;
  } catch {
    return false;
  }
}
