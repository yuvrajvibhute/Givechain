import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, ExternalLink, X, AlertCircle, RefreshCw, Lock, Sparkles, LogOut, ShieldCheck } from 'lucide-react';
import {
  connectOneAmWallet,
  disconnectOneAmWallet,
  getAvailableWallets,
  getOneAmWallet,
  isOneAmExtensionAvailable,
  type ConnectedAPI,
  type InitialAPI,
} from '../dapp-connector';

interface OneAmWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet: (
    address: string,
    ctx?: ConnectedAPI,
    initialBalance?: string,
    initialDust?: string,
  ) => void;
  onDisconnectWallet: () => void;
  connectedAddress: string;
  activeNetwork?: string;
}

export const OneAmWalletModal: React.FC<OneAmWalletModalProps> = ({
  isOpen,
  onClose,
  onConnectWallet,
  onDisconnectWallet,
  connectedAddress,
  activeNetwork = 'preview',
}) => {
  const [availableWallets, setAvailableWallets] = useState<InitialAPI[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scanWallets = () => {
    const list = getAvailableWallets();
    setAvailableWallets(list);
  };

  useEffect(() => {
    scanWallets();
    const interval = setInterval(scanWallets, 2500);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const isOneAmDetected = isOneAmExtensionAvailable();
  const selectedOneAm = getOneAmWallet();

  const handleConnect = async (targetWallet?: InitialAPI) => {
    setIsConnecting(true);
    setErrorMsg(null);

    // Call connect directly in the user click event handler to prevent popup blocking
    const result = await connectOneAmWallet(targetWallet, activeNetwork);
    setIsConnecting(false);

    if (result.connected && result.address) {
      onConnectWallet(
        result.address,
        result.walletContext,
        result.walletBalance,
        result.dustBalance,
      );
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        onClose();
      }
    } else {
      setErrorMsg(
        result.error ||
        'Failed to connect to 1AM Wallet. Please ensure the extension is installed and unlocked.',
      );
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    await disconnectOneAmWallet();
    setIsConnecting(false);
    onDisconnectWallet();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D3B4C]/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md report-card p-6 border-[#E0D9CD] space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E0D9CD]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0D3B4C] text-[#F7F5F0]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">1AM Wallet Connector</h3>
              <p className="text-xs text-[#57656E]">Midnight Zero-Knowledge Web3 Wallet (@midnight-ntwrk/dapp-connector-api)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#57656E] hover:text-[#0D3B4C] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1AM Wallet Status Banner */}
        <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57656E] font-semibold">1AM WALLET EXTENSION STATUS</span>
            {isOneAmDetected ? (
              <span className="verified-badge text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> 1AM Wallet Detected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30 font-semibold text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not Detected
              </span>
            )}
          </div>

          <p className="text-xs text-[#57656E] leading-relaxed">
            {isOneAmDetected
              ? `Connected to ${selectedOneAm?.name || '1AM Wallet'} via window.midnight standard provider on ${activeNetwork.toUpperCase()}.`
              : '1AM Wallet extension was not detected in this browser. Install 1AM Wallet to sign private ZK transactions.'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Connection Notice:</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Connected State vs Connect Actions */}
        {connectedAddress ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#1F6E54]/10 border border-[#1F6E54]/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1F6E54]">
                <ShieldCheck className="w-4 h-4" />
                <span>1AM Wallet Active Session</span>
              </div>
              <div className="text-xs font-mono-num text-[#0D3B4C] break-all bg-white/70 p-2 rounded border border-[#1F6E54]/20">
                {connectedAddress}
              </div>
              <div className="text-[11px] text-[#57656E]">
                Network: <span className="font-semibold text-[#0D3B4C] uppercase">{activeNetwork}</span>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="w-full py-2.5 px-4 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect 1AM Wallet</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {availableWallets.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs text-[#57656E] font-medium block">Select Injected Wallet:</span>
                {availableWallets.map((w, idx) => (
                  <button
                    key={w.rdns || idx}
                    onClick={() => handleConnect(w)}
                    disabled={isConnecting}
                    className="w-full p-3 rounded-lg border border-[#E0D9CD] bg-white hover:bg-[#F7F5F0] flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-3">
                      {w.icon ? (
                        <img src={w.icon} alt={w.name} className="w-6 h-6 rounded" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#0D3B4C] text-white flex items-center justify-center text-xs font-bold">
                          1A
                        </div>
                      )}
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#0D3B4C]">{w.name}</div>
                        <div className="text-[10px] text-[#57656E]">v{w.apiVersion} • {w.rdns}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#C85A32] group-hover:underline">Connect →</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => handleConnect()}
                disabled={isConnecting}
                className="w-full cta-button justify-center !py-3 !text-sm flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting to 1AM Wallet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Connect 1AM Wallet</span>
                  </>
                )}
              </button>
            )}

            {!isOneAmDetected && (
              <div className="pt-2 text-center">
                <a
                  href="https://1am.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C85A32] hover:underline"
                >
                  <span>Download 1AM Wallet Extension</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Security Assurance */}
        <div className="p-3 bg-[#F7F5F0] rounded-lg border border-[#E0D9CD] flex items-center gap-2 text-[11px] text-[#57656E]">
          <Lock className="w-4 h-4 text-[#1F6E54] shrink-0" />
          <span>Your private witness keys stay secure within your 1AM extension (@midnight-ntwrk/dapp-connector-api).</span>
        </div>
      </div>
    </div>
  );
};
