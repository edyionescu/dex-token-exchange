import { clearError, setError } from '@/features/error/error-slice';
import { asyncThunkCreator, buildCreateSlice } from '@reduxjs/toolkit';
import { BrowserProvider, getAddress } from 'ethers';

// https://redux-toolkit.js.org/api/createslice#createasyncthunk
const createWalletSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});

const initialState = {
  providers: [],
  connectedWallet: { info: null, provider: null },
  ethersProvider: null,
  userAccount: null,
  userBalance: 0,
  chainId: null,
};

export const walletSlice = createWalletSlice({
  name: 'wallet',
  initialState,
  reducers: (create) => ({
    addProvider(state, action) {
      const exists = state.providers.some(
        (p) => p.info.uuid === action.payload.info.uuid,
      );
      if (!exists) {
        state.providers.push(action.payload);
      }
    },
    connectWallet(state, action) {
      const { provider, info } = action.payload;
      state.connectedWallet = { provider, info };
    },
    setEthersProvider(state) {
      try {
        state.ethersProvider = new BrowserProvider(
          state.connectedWallet.provider,
        );
      } catch (err) {
        console.warn('Invalid provider passed to BrowserProvider', err);
      }
    },
    resetWallet(state) {
      const { connectedWallet, userAccount, chainId } = initialState;
      return {
        ...state,
        connectedWallet,
        userAccount,
        chainId,
      };
    },
    disconnectWallet: create.asyncThunk(
      async (_, thunkApi) => {
        const { wallet } = thunkApi.getState();
        const { connectedWallet } = wallet;
        const { provider } = connectedWallet;

        if (provider.isCoinbaseWallet || provider._coinbaseWallet) {
          // Disconnect Coinbase wallet
          try {
            if (provider.disconnect) {
              // Terminate the current session (WebSocket connection / QR-based link)
              // This does not automatically revoke the permissions persisted in the wallet's storage
              // For complete permission revocation, manually disconnect the dApp in the Coinbase wallet extension
              // https://www.coinbase.com/learn/wallet/how-to-revoke-dapp-connections-coinbase-wallet
              await provider.disconnect();
            }

            // Clear any wallet-related storage
            Object.keys(localStorage).forEach((key) => {
              if (key.includes('-walletlink')) {
                localStorage.removeItem(key);
              }
            });

            // Reload the page for clean state
            window.location.reload();
          } catch {
            const message = 'Error disconnecting Coinbase wallet';
            thunkApi.dispatch(setError({ domain: 'wallet', message }));
            return thunkApi.rejectWithValue(message);
          }
        } else {
          if (provider.request) {
            // Disconnect other wallets
            try {
              // `wallet_revokePermissions` will revoke access to all accounts, not just the current `userAccount`.
              // There’s no standard RPC for revoking a single account permission as of now (EIP-2255).
              await provider.request({
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts: {} }],
              });
              thunkApi.dispatch(clearError({ domain: 'wallet' }));
            } catch {
              const message =
                '`wallet_revokePermissions` failed or unsupported';
              thunkApi.dispatch(setError({ domain: 'wallet', message }));
              return thunkApi.rejectWithValue(message);
            }
          }
        }
      },
      {
        rejected(state, action) {
          if (import.meta.env.DEV) {
            console.error('Error disconnecting wallet', action.payload);
          }
        },
      },
    ),
    setChainId(state, action) {
      state.chainId = Number(action.payload);
    },
    resetChainId(state) {
      state.chainId = initialState.chainId;
    },
    setUserAccount(state, action) {
      // Set the normalized and checksumed address
      state.userAccount = getAddress(action.payload);
    },
    setUserBalance(state, action) {
      state.userBalance = action.payload;
    },
  }),
});

export const {
  addProvider,
  connectWallet,
  setEthersProvider,
  disconnectWallet,
  resetWallet,
  setUserAccount,
  setUserBalance,
  setChainId,
  resetChainId,
} = walletSlice.actions;

export default walletSlice.reducer;
