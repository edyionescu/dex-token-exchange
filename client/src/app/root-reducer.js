import errorReducer from '@/features/error/error-slice';
import exchangeReducer from '@/features/exchange/exchange-slice';
import tokenReducer from '@/features/token/token-slice';
import walletReducer from '@/features/wallet/wallet-slice';
import { combineReducers } from '@reduxjs/toolkit';

export const rootReducer = combineReducers({
  wallet: walletReducer,
  exchange: exchangeReducer,
  tokens: tokenReducer,
  error: errorReducer,
});
