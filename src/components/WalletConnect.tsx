import React from 'react';
import { Wallet, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMidnight } from '../hooks/useMidnight';

export const WalletConnect: React.FC = () => {
  const { isConnected, walletName, address, network, error, connectWallet, disconnectWallet } = useMidnight();

  const truncateAddr = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-6)}`;

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/80 border border-rose-500/30 px-3 py-1.5 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono text-purple-300">{walletName} ({network.toUpperCase()})</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-300">{truncateAddr(address)}</span>
          </div>

          <button
            onClick={disconnectWallet}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
            title="Disconnect Wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="gradient-btn text-xs"
        >
          <Wallet className="w-4 h-4" />
          <span>Connect DApp Connector</span>
        </button>
      )}
    </div>
  );
};
