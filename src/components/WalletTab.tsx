import React from 'react';
import { Wallet, ShieldCheck, ArrowDownRight, ArrowUpRight, Copy, Check } from 'lucide-react';

interface WalletTabProps {
  walletAddress: string;
  walletBalance: string;
  dustBalance: string;
  activeNetwork: string;
  onRefresh: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  walletAddress,
  walletBalance,
  dustBalance,
  activeNetwork,
  onRefresh,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview Header */}
      <div className="report-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-[#0D3B4C]" />
            <h2 className="text-xl font-bold font-serif text-[#0D3B4C]">Lace Browser Wallet & Token Balances</h2>
          </div>
          <p className="text-xs text-[#57656E]">
            Inspect active unshielded address and native tNIGHT / DUST protocol assets on Midnight {activeNetwork.toUpperCase()}.
          </p>
        </div>

        <button onClick={onRefresh} className="secondary-button">
          Refresh Balances
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="report-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#57656E] uppercase tracking-wider">Unshielded Native Balance</span>
            <span className="verified-badge">tNIGHT</span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono-num text-[#0D3B4C]">{walletBalance}</div>
            <span className="text-xs text-[#57656E]">tNIGHT (Midnight Testnet Tokens)</span>
          </div>
        </div>

        <div className="report-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#57656E] uppercase tracking-wider">Transaction Dust Resource</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#C85A32]/10 text-[#C85A32] text-xs font-semibold border border-[#C85A32]/30">DUST</span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono-num text-[#C85A32]">{dustBalance}</div>
            <span className="text-xs text-[#57656E]">DUST (Bandwidth Gas Token)</span>
          </div>
        </div>
      </div>

      {/* Wallet Address Inspector */}
      <div className="report-card p-6 space-y-4">
        <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Connected Wallet Address</h3>

        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] font-mono-num text-xs text-[#0D3B4C] overflow-x-auto">
          <span>{walletAddress}</span>
          <button onClick={handleCopy} className="p-1.5 rounded text-[#57656E] hover:text-[#0D3B4C]">
            {copied ? <Check className="w-4 h-4 text-[#1F6E54]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
