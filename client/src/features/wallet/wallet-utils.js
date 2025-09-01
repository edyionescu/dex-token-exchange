import { clearError, setError } from '@/features/error/error-slice';
import {
  resetExchange,
  resetExchangeBalances,
} from '@/features/exchange/exchange-slice';
import { resetTokenBalances, resetTokens } from '@/features/token/token-slice';
import {
  connectWallet,
  disconnectWallet,
  resetWallet,
  setChainId,
  setEthersProvider,
  setUserAccount,
} from './wallet-slice';

// Shared function to connect to a wallet and set up event listeners
export const connectToProvider = async (
  { provider, info, requestAccounts = false },
  dispatch,
) => {
  try {
    const method = requestAccounts ? 'eth_requestAccounts' : 'eth_accounts';
    const accounts = await provider.request({ method });

    if (accounts.length > 0) {
      const chainId = await provider.request({ method: 'eth_chainId' });

      dispatch(connectWallet({ provider, info }));
      dispatch(setEthersProvider());
      dispatch(setChainId(chainId));
      dispatch(setUserAccount(accounts[0]));

      // Add EIP-1193 listeners
      provider.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          dispatch(resetWallet());
        } else {
          dispatch(resetTokenBalances());
          dispatch(resetExchangeBalances());
          dispatch(setUserAccount(accounts[0]));
        }
      });

      provider.on('chainChanged', (chainId) => {
        // Ethers providers are not mutable for the network, so they need to be recreated when the network (chainId) changes.
        // https://github.com/ethers-io/ethers.js/discussions/1480
        // This prevents errors like the one below from occurring:
        // `Error: network changed: 31337 => 11155111  (event="changed", code=NETWORK_ERROR, version=6.14.4)`
        dispatch(setEthersProvider());
        dispatch(setChainId(chainId));
        dispatch(resetTokens());
        dispatch(resetExchange());
      });
      provider.on('disconnect', () => dispatch(disconnectWallet()));

      dispatch(clearError({ domain: 'wallet' }));

      return true;
    }
  } catch (err) {
    const { message } = err;
    dispatch(
      setError({
        domain: 'wallet',
        message,
      }),
    );

    if (import.meta.env.DEV) {
      console.error('Provider connection failed', err);
    }
  }

  return false;
};
