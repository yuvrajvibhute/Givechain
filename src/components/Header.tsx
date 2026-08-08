import React from 'react';
import { Shield, RefreshCw, ExternalLink, ChevronDown, CheckCircle } from 'lucide-react';
import { NETWORKS } from '../api';

interface HeaderProps {
  activeNetwork: string;
  onSelectNetwork: (net: string) => void;
  walletBalance: string;
  dustBalance: string;
  walletAddress: string;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenLaceModal: () => void;
  isLaceConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeNetwork,
  onSelectNetwork,
  walletBalance,
  dustBalance,
  walletAddress,
  isSyncing,
  onRefresh,
  onOpenLaceModal,
  isLaceConnected,
}) => {
  const currentConfig = NETWORKS[activeNetwork] || NETWORKS.undeployed;

  const truncateAddr = (addr: string) => {
    if (!addr || addr.length < 16) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  return (
    <header className="app-header sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Institutional Branding */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0D3B4C] text-[#F7F5F0] shadow-sm">
            <Shield className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-serif text-[#0D3B4C] tracking-tight">
                GiveChain
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#0D3B4C]/10 text-[#0D3B4C] font-semibold border border-[#0D3B4C]/20">
                Midnight ZK
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#2A7B62]/10 text-[#1F6E54] font-semibold border border-[#2A7B62]/20 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Compact 0.23+
              </span>
            </div>
            <p className="text-xs text-[#57656E] font-medium">Public Transparency & Shielded Charity Ledger</p>
          </div>
        </div>

        {/* Persistent, Unobtrusive Controls */}
        <div className="flex items-center flex-wrap justify-center gap-3">
          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="secondary-button !p-2"
            title="Sync with Midnight Indexer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#C85A32]' : ''}`} />
          </button>

          {/* Network Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E0D9CD] px-3 py-1.5 rounded-lg text-xs">
              <select
                value={activeNetwork}
                onChange={(e) => onSelectNetwork(e.target.value)}
                className="bg-transparent text-[#0D3B4C] font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {Object.values(NETWORKS).map((net) => (
                  <option key={net.networkId} value={net.networkId} className="bg-[#FFFFFF] text-[#0D3B4C]">
                    {net.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#57656E] pointer-events-none -ml-4" />
            </div>
          </div>

          {/* Faucet Link */}
          {currentConfig.faucetUrl && (
            <a
              href={currentConfig.faucetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#EFECE4] text-[#0D3B4C] border border-[#E0D9CD] px-3 py-1.5 rounded-lg hover:bg-[#E2DCD2] transition"
            >
              <span>Faucet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Lace Wallet Button */}
          <button
            onClick={onOpenLaceModal}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition ${
              isLaceConnected
                ? 'bg-[#1F6E54]/10 text-[#1F6E54] border-[#1F6E54]/30'
                : 'cta-button !py-1.5 !px-3.5 !text-xs'
            }`}
          >
            {isLaceConnected ? 'Lace Connected' : 'Connect Lace'}
          </button>

          {/* Wallet Balance Badge */}
          <div className="flex items-center gap-2.5 bg-[#FFFFFF] border border-[#E0D9CD] px-3.5 py-1.5 rounded-lg text-xs font-mono-num">
            <span className="font-bold text-[#0D3B4C]">{walletBalance} tNIGHT</span>
            <span className="text-[#E0D9CD]">|</span>
            <span className="text-[#C85A32] font-semibold">{dustBalance} DUST</span>
            <span className="text-[#57656E] font-normal text-[11px] hidden sm:inline">({truncateAddr(walletAddress)})</span>
          </div>
        </div>
      </div>
    </header>
  );
};
