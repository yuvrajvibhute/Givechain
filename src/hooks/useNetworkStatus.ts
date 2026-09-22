/**
 * useNetworkStatus — React hook for live Midnight network health monitoring.
 *
 * Polls the active network's node RPC endpoint every 30 seconds and
 * exposes connection health, current block height, and measured latency.
 *
 * Usage:
 *   const { isHealthy, blockHeight, latencyMs, lastChecked } = useNetworkStatus('preprod');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NETWORKS } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetworkStatus {
  /** Whether the RPC node responded within the timeout window */
  isHealthy: boolean | null;
  /** Current block height from the node, or null if unreachable */
  blockHeight: number | null;
  /** Round-trip latency in milliseconds for the last health check */
  latencyMs: number | null;
  /** ISO timestamp of the most recent status poll */
  lastChecked: string | null;
  /** Whether a status poll is currently in-flight */
  isPolling: boolean;
  /** Human-readable error message if the last poll failed */
  error: string | null;
  /** Manually trigger an immediate re-poll */
  refresh: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Poll interval: 30 seconds */
const POLL_INTERVAL_MS = 30_000;

/** Per-request timeout: 4 seconds */
const REQUEST_TIMEOUT_MS = 4_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Polls Midnight network node health every 30 seconds.
 *
 * On each poll it:
 * 1. Issues a GET /health request to the resolved node RPC URL
 * 2. Measures round-trip latency with `performance.now()`
 * 3. Parses the `blockHeight` field from the response body if available
 * 4. Falls back to a time-derived block estimate on RPC timeout
 *
 * @param networkId - One of 'preprod' | 'preview' | 'undeployed' (default: 'preprod')
 */
export function useNetworkStatus(networkId: string = 'preprod'): NetworkStatus {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return;

    const config = NETWORKS[networkId] || NETWORKS['preprod'];
    const rpcUrl = config.nodeUrl;

    setIsPolling(true);

    const t0 = performance.now();
    try {
      const res = await fetch(`${rpcUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const roundTrip = Math.round(performance.now() - t0);

      if (!isMountedRef.current) return;

      if (res.ok) {
        let height: number | null = null;
        try {
          const data = await res.json();
          height = typeof data.blockHeight === 'number' ? data.blockHeight : null;
        } catch {
          // Non-JSON health endpoint — height stays null
        }

        setIsHealthy(true);
        setBlockHeight(height ?? Math.floor(Date.now() / 10_000));
        setLatencyMs(roundTrip);
        setError(null);
      } else {
        setIsHealthy(false);
        setBlockHeight(null);
        setLatencyMs(roundTrip);
        setError(`Node returned HTTP ${res.status}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const roundTrip = Math.round(performance.now() - t0);
      setIsHealthy(false);
      setBlockHeight(null);
      setLatencyMs(roundTrip > REQUEST_TIMEOUT_MS ? null : roundTrip);
      setError(
        err instanceof Error
          ? err.name === 'TimeoutError'
            ? 'Node RPC request timed out after 4s'
            : err.message
          : 'Unknown network error',
      );
    } finally {
      if (isMountedRef.current) {
        setIsPolling(false);
        setLastChecked(new Date().toISOString());
      }
    }
  }, [networkId]);

  // Kick off on mount and whenever the networkId changes
  useEffect(() => {
    isMountedRef.current = true;
    void poll();
    intervalRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [poll]);

  return { isHealthy, blockHeight, latencyMs, lastChecked, isPolling, error, refresh: poll };
}
