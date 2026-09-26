/**
 * useLiveContractState — React hook for live GiveChain on-chain ledger state.
 *
 * Polls the Midnight indexer every 15 seconds and decodes the contract's
 * public ledger fields:
 *   - totalDonations (bigint)
 *   - campaignCount  (bigint)
 *   - activeCampaignTitle (string)
 *
 * Returns loading/error states for graceful UI handling.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { NETWORKS, queryIndexerContractState } from '../api';

export interface LiveContractState {
  totalDonations: bigint;
  campaignCount: bigint;
  activeCampaignTitle: string;
  /** True while the first fetch is in progress */
  loading: boolean;
  /** Error message if the indexer is unreachable */
  error: string | null;
  /** ISO timestamp of the last successful fetch */
  lastUpdated: string | null;
  /** Force a manual refresh */
  refresh: () => void;
}

const POLL_INTERVAL_MS = 15_000;

/**
 * Decodes the raw contract state bytes using the compiled CharityDonation ledger decoder.
 * Falls back gracefully if the compiled contract is not available (dev mode without compile).
 */
async function decodeLedgerState(raw: Uint8Array): Promise<{
  totalDonations: bigint;
  campaignCount: bigint;
  activeCampaignTitle: string;
} | null> {
  try {
    // Dynamically import the compiled contract (must run `npm run compile` first).
    const CharityDonation = await import(
      /* @vite-ignore */
      '../../contracts/managed/charity-donation/contract/index.js'
    );
    const ledger = CharityDonation.ledger(raw as any);
    return {
      totalDonations: BigInt(ledger.totalDonations ?? 0n),
      campaignCount: BigInt(ledger.campaignCount ?? 0n),
      activeCampaignTitle: String(ledger.activeCampaignTitle ?? ''),
    };
  } catch {
    // Contract not yet compiled — return zeros so the UI still renders.
    return null;
  }
}

export function useLiveContractState(
  contractAddress: string | null,
  networkId: string = 'preprod',
): LiveContractState {
  const [totalDonations, setTotalDonations] = useState<bigint>(0n);
  const [campaignCount, setCampaignCount] = useState<bigint>(0n);
  const [activeCampaignTitle, setActiveCampaignTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const networkConfig = NETWORKS[networkId] ?? NETWORKS['preprod'];
  const isMounted = useRef(true);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const targetAddress = contractAddress || '7715b2ade8a1143196d232dd26ac732aef83a390503bf7d308d2d4bf741294b9';

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    async function fetchState() {
      try {
        const raw = await queryIndexerContractState(networkConfig.indexerUrl, targetAddress);
        if (!isMounted.current) return;

        if (!raw) {
          setLoading(false);
          return;
        }

        const decoded = await decodeLedgerState(raw.raw);
        if (!isMounted.current) return;

        if (decoded) {
          setTotalDonations(decoded.totalDonations);
          setCampaignCount(decoded.campaignCount);
          setActiveCampaignTitle(decoded.activeCampaignTitle);
          setError(null);
        } else {
          // Compiled contract not available — show raw state unavailable warning.
          setError(
            'Contract state fetched but cannot decode (run `npm run compile` to build the contract bindings).',
          );
        }

        setLastUpdated(new Date().toISOString());
      } catch (err: any) {
        if (!isMounted.current) return;
        setError(`Indexer error: ${err?.message ?? String(err)}`);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          // Schedule next poll
          timerId = setTimeout(fetchState, POLL_INTERVAL_MS);
        }
      }
    }

    setLoading(true);
    fetchState();

    return () => clearTimeout(timerId);
  }, [contractAddress, networkId, networkConfig.indexerUrl, refreshTick]);

  return {
    totalDonations,
    campaignCount,
    activeCampaignTitle,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
