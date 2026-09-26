import React, { useState, useCallback } from 'react';
import { Heart, Cpu, Wallet, Server, Shield, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Header } from './components/Header';
import { LedgerTab } from './components/LedgerTab';
import { ProofVisualizerTab } from './components/ProofVisualizerTab';
import { WalletTab } from './components/WalletTab';
import { NetworkTab } from './components/NetworkTab';
import { PrivacyModelTab } from './components/PrivacyModelTab';
import { OneAmWalletModal } from './components/OneAmWalletModal';
import { INITIAL_CAMPAIGNS, type TransactionRecord } from './api';
import {
  executeDonateCircuit,
  executeCreateCampaignCircuit,
  disconnectOneAmWallet,
  invalidateContractCache,
  type ConnectedAPI,
} from './dapp-connector';
import { useLiveContractState } from './hooks/useLiveContractState';
import { useTransactionHistory } from './hooks/useTransactionHistory';

// ─── Contract address ─────────────────────────────────────────────────────────
// Loaded from the VITE_CONTRACT_ADDRESS environment variable (set in .env after deployment).
// If not set, the UI will display an "unconfigured" warning in the ledger tab.
const CONTRACT_ADDRESS = (import.meta as any).env?.VITE_CONTRACT_ADDRESS as string | undefined;

// Active network defaults to 'preview'. Users can switch via the Header network selector.
const DEFAULT_NETWORK = ((import.meta as any).env?.VITE_NETWORK as string | undefined) ?? 'preview';

export function App() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'proof' | 'wallet' | 'network' | 'privacy'>('ledger');
  const [activeNetwork, setActiveNetwork] = useState<string>(DEFAULT_NETWORK);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletBalance] = useState<string>('—');
  const [dustBalance] = useState<string>('—');

  // 1AM Wallet connection state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletContext, setWalletContext] = useState<ConnectedAPI | undefined>();

  // Local session transactions (from this browser session — merged with indexer history)
  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // ─── Live on-chain state from Midnight indexer ──────────────────────────────
  const {
    totalDonations,
    campaignCount,
    activeCampaignTitle,
    loading: stateLoading,
    error: stateError,
    lastUpdated,
    refresh: refreshState,
  } = useLiveContractState(CONTRACT_ADDRESS ?? null, activeNetwork);

  // ─── Real transaction history from indexer ─────────────────────────────────
  const {
    transactions,
    loading: txLoading,
    refresh: refreshTxs,
  } = useTransactionHistory(CONTRACT_ADDRESS ?? null, activeNetwork, localTransactions);

  // ─── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  // ─── Network sync / refresh ─────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsSyncing(true);
    showToast('Syncing with Midnight Network indexer...', 'info');
    refreshState();
    refreshTxs();
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncing(false);
    showToast(lastUpdated ? `Synced at ${new Date(lastUpdated).toLocaleTimeString()}` : 'Sync complete', 'success');
  };

  const handleSelectNetwork = (net: string) => {
    setActiveNetwork(net);
    invalidateContractCache();
    showToast(`Switched to ${net.toUpperCase()}`, 'info');
  };

  // ─── 1AM Wallet connect / disconnect ──────────────────────────────────────
  const handleConnectWallet = (newAddress: string, ctx?: ConnectedAPI) => {
    setWalletAddress(newAddress);
    setIsWalletConnected(true);
    setWalletContext(ctx);
    showToast(`1AM Wallet Connected! ${newAddress.slice(0, 14)}...`, 'success');
  };

  const handleDisconnectWallet = async () => {
    await disconnectOneAmWallet();
    invalidateContractCache();
    setIsWalletConnected(false);
    setWalletContext(undefined);
    setWalletAddress('');
    showToast('1AM Wallet Disconnected.', 'info');
  };

  // ─── Donate circuit (real Midnight.js callTx) ──────────────────────────────
  const handleDonate = async (campaignTitle: string, amount: number, donorSecret: string) => {
    if (!CONTRACT_ADDRESS) {
      showToast('Contract address not configured. Set VITE_CONTRACT_ADDRESS in .env', 'error');
      return;
    }
    if (!isWalletConnected || !walletContext) {
      showToast('Please connect your 1AM wallet before donating.', 'error');
      return;
    }

    setIsSubmitting(true);
    showToast('Generating ZK proof & submitting transaction to Midnight chain...', 'info');

    try {
      // Real callTx.donate() — ZK proof + wallet balancing + signing + submission
      const result = await executeDonateCircuit(
        campaignTitle,
        amount,
        donorSecret,
        CONTRACT_ADDRESS,
        activeNetwork,
        walletContext,
      );

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        txHash: result.txHash,
        circuitName: 'donate',
        campaignTitle,
        amount,
        blockHeight: result.blockHeight,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        proofTimeMs: result.proofTimeMs,
        privacyGuarantee: 'Donor identity & witness secret shielded in ZK proof — nullifier hash only on-chain',
      };

      setLocalTransactions((prev) => [newTx, ...prev]);
      setIsSubmitting(false);
      showToast(
        `Donation confirmed! Tx: ${result.txHash.slice(0, 14)}... | Proof: ${result.proofTimeMs}ms`,
        'success',
      );

      // Refresh on-chain state after confirmed tx.
      setTimeout(() => { refreshState(); refreshTxs(); }, 5000);
    } catch (err) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.includes('nullifier reused')) {
        showToast('This donor secret was already used. Please use a different secret.', 'error');
      } else if (msg.includes('not connected')) {
        showToast('Please connect your 1AM wallet before donating.', 'error');
      } else {
        showToast(`Donation failed: ${msg}`, 'error');
      }
    }
  };

  // ─── Create campaign circuit (real Midnight.js callTx) ────────────────────
  const handleCreateCampaign = async (title: string, _category: string, _targetAmount: number) => {
    if (!CONTRACT_ADDRESS) {
      showToast('Contract address not configured. Set VITE_CONTRACT_ADDRESS in .env', 'error');
      return;
    }
    if (!isWalletConnected || !walletContext) {
      showToast('Please connect your 1AM wallet to create campaigns.', 'error');
      return;
    }

    setIsSubmitting(true);
    showToast('Executing createCampaign circuit — proving organizer authorization...', 'info');

    try {
      // Real callTx.createCampaign() — proves callerAddress == authorizedOrganizer on-chain
      const result = await executeCreateCampaignCircuit(
        title,
        _category,
        _targetAmount,
        CONTRACT_ADDRESS,
        activeNetwork,
        walletAddress,
        walletContext,
      );

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        txHash: result.txHash,
        circuitName: 'createCampaign',
        campaignTitle: title,
        amount: 0,
        blockHeight: result.blockHeight,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        proofTimeMs: result.proofTimeMs,
        privacyGuarantee: 'Campaign title publicly disclosed to Midnight indexer via disclose(title)',
      };

      setLocalTransactions((prev) => [newTx, ...prev]);
      setIsSubmitting(false);
      showToast(`Campaign "${title}" registered on Midnight! Tx: ${result.txHash.slice(0, 14)}...`, 'success');

      setTimeout(() => { refreshState(); refreshTxs(); }, 5000);
    } catch (err) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('Unauthorized')) {
        showToast('Not authorized: only the deploying organizer can create campaigns.', 'error');
      } else {
        showToast(`Campaign creation failed: ${msg}`, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F7F5F0] text-[#141E24]">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-xl ${
            toast.type === 'success'
              ? 'bg-[#EAF4F0] border-[#1F6E54]/40 text-[#1F6E54]'
              : toast.type === 'info'
              ? 'bg-[#EFECE4] border-[#0D3B4C]/40 text-[#0D3B4C]'
              : 'bg-[#FDF2F2] border-rose-500/40 text-rose-800'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 text-[#1F6E54]" />
              : <AlertCircle className="w-5 h-5 text-[#0D3B4C]" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        activeNetwork={activeNetwork}
        onSelectNetwork={handleSelectNetwork}
        walletBalance={walletBalance}
        dustBalance={dustBalance}
        walletAddress={walletAddress}
        isSyncing={isSyncing}
        onRefresh={handleRefresh}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onDisconnectWallet={handleDisconnectWallet}
        isWalletConnected={isWalletConnected}
      />

      {/* 1AM Wallet Modal */}
      <OneAmWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        connectedAddress={isWalletConnected ? walletAddress : ''}
        activeNetwork={activeNetwork}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E0D9CD]">
          <button onClick={() => setActiveTab('ledger')} className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}>
            <Heart className="w-4 h-4 text-[#C85A32]" />
            <span>Charity Causes & Ledger</span>
          </button>
          <button onClick={() => setActiveTab('proof')} className={`nav-tab ${activeTab === 'proof' ? 'active' : ''}`}>
            <Cpu className="w-4 h-4 text-[#0D3B4C]" />
            <span>ZK Prover Visualizer</span>
          </button>
          <button onClick={() => setActiveTab('wallet')} className={`nav-tab ${activeTab === 'wallet' ? 'active' : ''}`}>
            <Wallet className="w-4 h-4 text-[#0D3B4C]" />
            <span>Wallet & DUST</span>
          </button>
          <button onClick={() => setActiveTab('network')} className={`nav-tab ${activeTab === 'network' ? 'active' : ''}`}>
            <Server className="w-4 h-4 text-[#1F6E54]" />
            <span>Infrastructure Health</span>
          </button>
          <button onClick={() => setActiveTab('privacy')} className={`nav-tab ${activeTab === 'privacy' ? 'active' : ''}`}>
            <Lock className="w-4 h-4 text-[#C85A32]" />
            <span>Privacy Model</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'ledger' && (
          <LedgerTab
            contractAddress={CONTRACT_ADDRESS ?? '(not configured — set VITE_CONTRACT_ADDRESS)'}
            transactions={transactions}
            campaigns={INITIAL_CAMPAIGNS}
            onDonate={handleDonate}
            onCreateCampaign={handleCreateCampaign}
            isSubmitting={isSubmitting}
            // Live on-chain state props
            totalDonations={totalDonations}
            campaignCount={campaignCount}
            activeCampaignTitle={activeCampaignTitle}
            stateLoading={stateLoading || txLoading}
            stateError={stateError}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            isWalletConnected={isWalletConnected}
            isLaceConnected={isWalletConnected}
          />
        )}

        {activeTab === 'proof' && <ProofVisualizerTab />}

        {activeTab === 'wallet' && (
          <WalletTab
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            dustBalance={dustBalance}
            activeNetwork={activeNetwork}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'network' && <NetworkTab activeNetwork={activeNetwork} />}

        {activeTab === 'privacy' && <PrivacyModelTab />}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-[#E0D9CD] bg-[#EFECE4] py-6 px-4 text-center text-xs text-[#57656E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-[#0D3B4C]" />
            <span>GiveChain Charity Donation Tracker — Public Accountability & Shielded Ledger</span>
          </div>
          <div className="flex items-center gap-4 font-mono-num text-[11px]">
            <span>Compact Standard Library v0.23+</span>
            <span>•</span>
            <span>Midnight SDK v4.1.1</span>
            <span>•</span>
            {CONTRACT_ADDRESS ? (
              <span className="text-[#1F6E54]">
                Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
              </span>
            ) : (
              <span className="text-rose-600">Contract: not configured</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
