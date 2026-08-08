/**
 * API service layer for Midnight network status and Charity Donation Tracker contract state interaction
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

export const NETWORKS: Record<string, NetworkConfig> = {
  undeployed: {
    networkId: 'undeployed',
    name: 'Local Devnet',
    indexerUrl: 'http://localhost:8088/api/v1/graphql',
    indexerWsUrl: 'ws://localhost:8088/api/v1/graphql/ws',
    nodeUrl: 'http://localhost:9944',
    proofServerUrl: 'http://localhost:6300',
  },
  preview: {
    networkId: 'preview',
    name: 'Preview Testnet',
    indexerUrl: 'https://indexer.preview.midnight.network/api/v1/graphql',
    indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v1/graphql/ws',
    nodeUrl: 'https://rpc.preview.midnight.network',
    proofServerUrl: 'https://lace-proof-pub.preview.midnight.network',
    faucetUrl: 'https://midnight-tmnight-preview.nethermind.dev',
  },
  preprod: {
    networkId: 'preprod',
    name: 'Preprod Testnet',
    indexerUrl: 'https://indexer.preprod.midnight.network/api/v1/graphql',
    indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v1/graphql/ws',
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

export const INITIAL_CAMPAIGNS: CharityCampaign[] = [
  {
    id: 'camp-1',
    title: 'Clean Water Infrastructure for Rural Schools',
    category: 'Environment & Health',
    targetGoal: 50000,
    targetAmount: 50000,
    raisedAmount: 32450,
    donorCount: 142,
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
    raisedAmount: 18900,
    donorCount: 98,
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
    raisedAmount: 76200,
    donorCount: 310,
    description: 'Direct privacy-preserving emergency aid to disaster affected community centers.',
    organizationName: 'Global Med Relief',
    verifiedStatus: true,
  },
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-101',
    txHash: '0x9a4f...e31b',
    circuitName: 'donate',
    campaignTitle: 'Clean Water Infrastructure for Rural Schools',
    amount: 500,
    blockHeight: 14892,
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'confirmed',
    proofTimeMs: 1420,
    privacyGuarantee: 'Donor identity & witness secret shielded in ZK proof',
  },
  {
    id: 'tx-102',
    txHash: '0x3c1d...8f92',
    circuitName: 'donate',
    campaignTitle: 'Zero-Knowledge Education & Developer Grants',
    amount: 1250,
    blockHeight: 14870,
    timestamp: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    status: 'confirmed',
    proofTimeMs: 1680,
    privacyGuarantee: 'Donor identity & witness secret shielded in ZK proof',
  },
  {
    id: 'tx-103',
    txHash: '0x7e82...1a04',
    circuitName: 'createCampaign',
    campaignTitle: 'Emergency Relief & Medical Supply Distribution',
    amount: 0,
    blockHeight: 14810,
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    status: 'confirmed',
    proofTimeMs: 980,
    privacyGuarantee: 'Public campaign title disclosed to Midnight indexer',
  },
];

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
