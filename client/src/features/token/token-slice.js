import { createSlice } from '@reduxjs/toolkit';
import { getTokens } from './get-tokens-thunk';

const initialState = {
  contracts: [],
  symbols: [],
  addresses: [],
  balances: [],
  decimals: [],
  isPendingTokenDistribution: false,
};

export const tokenSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    setContracts(state, action) {
      state.contracts = action.payload;
    },
    setInfo(state, action) {
      const { symbols, addresses, decimals } = action.payload;
      return {
        ...state,
        symbols,
        addresses,
        decimals,
      };
    },
    setIsPendingTokenDistribution(state, action) {
      state.isPendingTokenDistribution = action.payload;
    },
    setBalances(state, action) {
      state.balances = action.payload;
    },
    resetTokens() {
      return initialState;
    },
    resetTokenBalances(state) {
      state.balances = initialState.balances;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get tokens
      .addCase(getTokens.pending, (state) => {
        state.isPendingTokenDistribution = true;
      })
      .addCase(getTokens.rejected, (state) => {
        state.isPendingTokenDistribution = false;
      });
  },
});

export { getTokens };
export const {
  setContracts,
  setInfo,
  setIsPendingTokenDistribution,
  setBalances,
  resetTokens,
  resetTokenBalances,
} = tokenSlice.actions;

export default tokenSlice.reducer;
