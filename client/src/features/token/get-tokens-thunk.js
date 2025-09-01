import { clearError, setError } from '@/features/error/error-slice';
import { getErrorMessage } from '@/lib/helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { toUnits } from '@shared/helpers';
import { ethers } from 'ethers';

export const getTokens = createAsyncThunk(
  'tokens/getTokens',
  async (payload, thunkApi) => {
    const { requestedTokens, availableTokens, tokenIdx } = payload;

    if (requestedTokens > availableTokens) {
      const message = 'The requested amount exceeds the available tokens.';
      thunkApi.dispatch(setError({ domain: 'getTokens', message }));
      return thunkApi.rejectWithValue(message);
    }

    const { tokens, wallet } = thunkApi.getState();
    const { ethersProvider } = wallet;
    const { contracts, decimals, symbols } = tokens;

    const tokenContract = contracts[tokenIdx];
    const tokenDecimals = decimals[tokenIdx];
    const tokenSymbol = symbols[tokenIdx];

    const requestedAmountInUnits = toUnits(
      requestedTokens,
      tokenDecimals,
      ethers,
    );

    try {
      const user = await ethersProvider.getSigner();
      const tx = await tokenContract
        .connect(user)
        .getTokens(requestedAmountInUnits);
      await tx.wait();

      thunkApi.dispatch(clearError({ domain: 'getTokens' }));
    } catch (error) {
      const message = getErrorMessage({
        error,
        contract: tokenContract,
        tokenSymbol,
        tokenDecimals,
      });
      const meta = error;

      thunkApi.dispatch(setError({ domain: 'getTokens', message }));
      return thunkApi.rejectWithValue(message, meta);
    }
  },
);
