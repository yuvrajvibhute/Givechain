import React, { useState } from 'react';
import { Heart, Cpu, Wallet, Server, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Header } from './components/Header';
import { LedgerTab } from './components/LedgerTab';
import { ProofVisualizerTab } from './components/ProofVisualizerTab';
import { WalletTab } from './components/WalletTab';
import { NetworkTab } from './components/NetworkTab';
import { LaceWalletModal } from './components/LaceWalletModal';
import { INITIAL_TRANSACTIONS, TransactionRecord } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'proof' | 'wallet' | 'network'>('ledger');
  const [activeNetwork, setActiveNetwork] = useState<string>('preview');
  const [contractAddress] = useState<string>('ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a');
  const [walletAddress, setWalletAddress] = useState<string>('mn_addr_preview1h3ssm5ru2t6eqy4g3she78zlxn96e36ms6pq996aduvmateh9p9sk96u7s');
  const [walletBalance] = useState<string>('1,250.00');
  const [dustBalance] = useState<string>('48.50');
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLaceModalOpen, setIsLaceModalOpen] = useState(false);
  const [isLaceConnected, setIsLaceConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    showToast('Syncing with Midnight Network indexer...', 'info');
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncing(false);
    showToast('Network sync complete!', 'success');
  };

  const handleSelectNetwork = (net: string) => {
    setActiveNetwork(net);
    showToast(`Switched active network to ${net.toUpperCase()}`, 'info');
  };

  const handleConnectLace = (newAddress: string) => {
    setWalletAddress(newAddress);
    setIsLaceConnected(true);
    showToast(`Lace Wallet Connected! Address: ${newAddress.slice(0, 14)}...`, 'success');
  };

  const handleDonate = async (campaignTitle: string, amount: number, _donorSecret: string) => {
    setIsSubmitting(true);
    const startMs = Date.now();

    // Simulating off-chain ZK witness proof execution & state submission
    await new Promise((r) => setTimeout(r, 2200));

    const proofTimeMs = Date.now() - startMs;
    const randomHash = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      txHash: `${randomHash.slice(0, 6)}...${randomHash.slice(-4)}`,
      circuitName: 'donate',
      campaignTitle,
      amount,
      blockHeight: 14893 + transactions.length,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      proofTimeMs,
      privacyGuarantee: 'Donor identity & witness secret shielded in ZK proof',
    };

    setTransactions([newTx, ...transactions]);
    setIsSubmitting(false);
    showToast(`Anonymous donation of $${amount} confirmed! Tx: ${newTx.txHash}`, 'success');
  };

  const handleCreateCampaign = async (title: string, _category: string, _targetAmount: number) => {
    setIsSubmitting(true);
    const startMs = Date.now();

    await new Promise((r) => setTimeout(r, 1500));

    const proofTimeMs = Date.now() - startMs;
    const randomHash = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      txHash: `${randomHash.slice(0, 6)}...${randomHash.slice(-4)}`,
      circuitName: 'createCampaign',
      campaignTitle: title,
      amount: 0,
      blockHeight: 14893 + transactions.length,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      proofTimeMs,
      privacyGuarantee: 'Public campaign title disclosed to Midnight indexer',
    };

    setTransactions([newTx, ...transactions]);
    setIsSubmitting(false);
    showToast(`Charity campaign "${title}" registered on Midnight!`, 'success');
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
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-[#1F6E54]" /> : <AlertCircle className="w-5 h-5 text-[#0D3B4C]" />}
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
        onOpenLaceModal={() => setIsLaceModalOpen(true)}
        isLaceConnected={isLaceConnected}
      />

      {/* Lace Wallet Modal */}
      <LaceWalletModal
        isOpen={isLaceModalOpen}
        onClose={() => setIsLaceModalOpen(false)}
        onConnectLace={handleConnectLace}
        connectedAddress={isLaceConnected ? walletAddress : ''}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E0D9CD]">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            <Heart className="w-4 h-4 text-[#C85A32]" />
            <span>Charity Causes & Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('proof')}
            className={`nav-tab ${activeTab === 'proof' ? 'active' : ''}`}
          >
            <Cpu className="w-4 h-4 text-[#0D3B4C]" />
            <span>ZK Prover Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`nav-tab ${activeTab === 'wallet' ? 'active' : ''}`}
          >
            <Wallet className="w-4 h-4 text-[#0D3B4C]" />
            <span>Wallet & DUST</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`nav-tab ${activeTab === 'network' ? 'active' : ''}`}
          >
            <Server className="w-4 h-4 text-[#1F6E54]" />
            <span>Infrastructure Health</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'ledger' && (
          <LedgerTab
            contractAddress={contractAddress}
            transactions={transactions}
            onDonate={handleDonate}
            onCreateCampaign={handleCreateCampaign}
            isSubmitting={isSubmitting}
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
          </div>
        </div>
      </footer>
    </div>
  );
}
