import { clearError, setError } from '@/features/error/error-slice';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './root-reducer';

const errorMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  // Auto-clear errors after 5 seconds
  if (action.type === setError.type) {
    const { domain } = action.payload;
    setTimeout(() => {
      store.dispatch(clearError({ domain }));
    }, 5000);
  }

  return result;
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'wallet/addProvider',
          'wallet/connectWallet',
          'tokens/setContracts',
          'exchange/setContract',
          'error/setError',
        ],
        ignoredPaths: [
          'wallet.providers',
          'wallet.connectedWallet',
          'wallet.ethersProvider',
          'tokens.contracts',
          'exchange.contract',
          'error.errors',
        ],
      },
    }).concat(errorMiddleware),
  devTools: {
    name: 'dEx Token Exchange',
  },
});

if (import.meta.hot) {
  import.meta.hot.accept('./root-reducer', (updated) => {
    store.replaceReducer(updated.rootReducer);
  });
}

export default store;
