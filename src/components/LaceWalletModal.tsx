import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, ExternalLink, X, AlertCircle, RefreshCw, Lock, Sparkles, LogOut } from 'lucide-react';
import { connectLaceWallet, disconnectLaceWallet, isLaceExtensionAvailable } from '../dapp-connector';

interface LaceWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectLace: (address: string) => void;
  onDisconnectLace: () => void;
  connectedAddress: string;
}

export const LaceWalletModal: React.FC<LaceWalletModalProps> = ({
  isOpen,
  onClose,
  onConnectLace,
  onDisconnectLace,
  connectedAddress,
}) => {
  const [isLaceDetected, setIsLaceDetected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkLace = () => {
      setIsLaceDetected(isLaceExtensionAvailable());
    };

    checkLace();
    const interval = setInterval(checkLace, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);

    const result = await connectLaceWallet();
    setIsConnecting(false);

    if (result.connected && result.address) {
      onConnectLace(result.address);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        onClose();
      }
    } else {
      setErrorMsg(result.error || 'Failed to connect to Lace Wallet. Connection rejected or timed out.');
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    await disconnectLaceWallet();
    setIsConnecting(false);
    onDisconnectLace();
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
              <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Lace Wallet Connector</h3>
              <p className="text-xs text-[#57656E]">Midnight Browser Extension (@midnight-ntwrk/dapp-connector-api)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#57656E] hover:text-[#0D3B4C] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lace Status Card */}
        <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57656E] font-semibold">LACE EXTENSION STATUS</span>
            {isLaceDetected ? (
              <span className="verified-badge text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Extension Detected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30 font-semibold text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not Detected (Fallback Active)
              </span>
            )}
          </div>

          <p className="text-xs text-[#57656E] leading-relaxed">
            Lace is the official Web3 browser extension for Midnight, enabling zero-knowledge proof transaction signing directly from your browser.
          </p>

          {connectedAddress && (
            <div className="pt-2 mt-2 border-t border-[#E0D9CD] text-xs">
              <span className="text-[#57656E] font-semibold">Active Session Address:</span>
              <div className="font-mono-num text-[11px] text-[#0D3B4C] truncate font-bold mt-0.5">
                {connectedAddress}
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Connection Action Buttons */}
        <div className="space-y-2.5">
          {connectedAddress ? (
            <>
              <button
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="w-full px-4 py-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 transition text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Lace Wallet</span>
              </button>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full secondary-button py-2 justify-center text-xs"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Re-authenticating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0D3B4C]" />
                    <span>Switch or Reconnect Wallet</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full cta-button py-2.5 justify-center text-xs"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting to Lace...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Connect Lace Wallet</span>
                </>
              )}
            </button>
          )}

          {!isLaceDetected && (
            <a
              href="https://www.lace.io/"
              target="_blank"
              rel="noreferrer"
              className="w-full secondary-button py-2 justify-center text-xs text-[#0D3B4C]"
            >
              <span>Download Lace Extension</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-2 text-[11px] text-[#57656E] pt-2 border-t border-[#E0D9CD]">
          <Lock className="w-3.5 h-3.5 text-[#1F6E54]" />
          <span>Your private witness keys stay secure within Lace extension (@midnight-ntwrk/dapp-connector-api).</span>
        </div>
      </div>
    </div>
  );
};
