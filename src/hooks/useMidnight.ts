import { useState, useCallback } from 'react';
import { connectOneAmWallet, disconnectOneAmWallet, getAvailableWallets, getOneAmWallet } from '../dapp-connector';

export interface MidnightWalletState {
  isConnected: boolean;
  walletName: string | null;
  address: string | null;
  network: string;
  error: string | null;
}

export function useMidnight() {
  const [walletState, setWalletState] = useState<MidnightWalletState>({
    isConnected: false,
    walletName: null,
    address: null,
    network: 'preview',
    error: null,
  });

  const connectWallet = useCallback(async (networkId: string = 'preview') => {
    try {
      const result = await connectOneAmWallet(undefined, networkId);
      if (result.connected && result.address) {
        setWalletState({
          isConnected: true,
          walletName: result.walletName || '1AM Wallet',
          address: result.address,
          network: networkId,
          error: null,
        });
      } else {
        setWalletState((prev) => ({
          ...prev,
          error: result.error || 'Failed to connect 1AM Wallet.',
        }));
      }
    } catch (err: any) {
      setWalletState((prev) => ({
        ...prev,
        error: err?.message || 'Failed to connect 1AM Wallet.',
      }));
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    await disconnectOneAmWallet();
    setWalletState({
      isConnected: false,
      walletName: null,
      address: null,
      network: 'preview',
      error: null,
    });
  }, []);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    isWalletAvailable: !!getOneAmWallet() || getAvailableWallets().length > 0,
  };
}
