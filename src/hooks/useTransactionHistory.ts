/**
 * useTransactionHistory — React hook for GiveChain transaction history from the Midnight indexer.
 *
 * Queries the Midnight indexer's GraphQL endpoint for all transactions associated
 * with the charity_donation contract. Returns real on-chain transaction data.
 *
 * Replaces the static INITIAL_TRANSACTIONS array in api.ts.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { NETWORKS, queryIndexerTransactionHistory, type TransactionRecord } from '../api';

export interface TransactionHistoryState {
  transactions: TransactionRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 20_000;

/**
 * Maps an indexer transaction to the frontend TransactionRecord format.
 * Privacy guarantee text is determined by the circuit name.
 */
function mapIndexerTxToRecord(tx: {
  id: string;
  txHash: string;
  circuitName: 'donate' | 'createCampaign';
  blockHeight: number;
  timestamp: string;
}): TransactionRecord {
  return {
    id: tx.id,
    txHash: formatTxHashDisplay(tx.txHash),
    circuitName: tx.circuitName,
    campaignTitle: tx.circuitName === 'createCampaign' ? 'Campaign Registration' : 'Anonymous Donation',
    amount: 0, // Individual donation amounts are private — only totalDonations is public
    blockHeight: tx.blockHeight,
    timestamp: tx.timestamp,
    status: 'confirmed',
    proofTimeMs: 0, // Not stored on-chain
    privacyGuarantee:
      tx.circuitName === 'donate'
        ? 'Donor identity & witness secret shielded in ZK proof — only nullifier hash stored on-chain'
        : 'Campaign title publicly disclosed to Midnight indexer via disclose(title)',
  };
}

/** Abbreviates a long tx hash for display. */
function formatTxHashDisplay(txHash: string): string {
  if (!txHash || txHash.length <= 16) return txHash;
  return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
}

export function useTransactionHistory(
  contractAddress: string | null,
  networkId: string = 'preprod',
  /** Local transactions from this session (added by the user's donate/create calls) */
  localTransactions: TransactionRecord[] = [],
): TransactionHistoryState {
  const [indexerTxs, setIndexerTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const isMounted = useRef(true);

  const networkConfig = NETWORKS[networkId] ?? NETWORKS['preprod'];
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!contractAddress) {
      setLoading(false);
      return;
    }

    let timerId: ReturnType<typeof setTimeout>;

    async function fetchHistory() {
      try {
        const txs = await queryIndexerTransactionHistory(
          networkConfig.indexerUrl,
          contractAddress!,
          50,
        );
        if (!isMounted.current) return;
        setIndexerTxs(txs.map(mapIndexerTxToRecord));
        setError(null);
      } catch (err: any) {
        if (!isMounted.current) return;
        setError(`Failed to load transaction history: ${err?.message ?? String(err)}`);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          timerId = setTimeout(fetchHistory, POLL_INTERVAL_MS);
        }
      }
    }

    setLoading(true);
    fetchHistory();

    return () => clearTimeout(timerId);
  }, [contractAddress, networkId, networkConfig.indexerUrl, refreshTick]);

  // Merge local session transactions with indexer history.
  // Local txs appear first (most recent), de-duplicated by txHash.
  const merged: TransactionRecord[] = [
    ...localTransactions,
    ...indexerTxs.filter(
      (ix) => !localTransactions.some((lt) => lt.txHash.includes(ix.txHash.slice(0, 8))),
    ),
  ];

  return { transactions: merged, loading, error, refresh };
}
