import { clearError, setError } from '@/features/error/error-slice';
import { getErrorMessage } from '@/lib/helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { toUnits } from '@shared/helpers';
import { ethers } from 'ethers';

export const doTransfer = createAsyncThunk(
  'exchange/transfer',
  async (transfer, thunkApi) => {
    const { transferType, tokenAmount, tokenIdx } = transfer;

    const { tokens, exchange, wallet } = thunkApi.getState();
    const { ethersProvider } = wallet;
    const { contracts, symbols, decimals } = tokens;
    const { contract: exchangeContract } = exchange;

    const tokenContract = contracts[tokenIdx];
    const tokenSymbol = symbols[tokenIdx];
    const tokenDecimals = decimals[tokenIdx];

    const amountInUnits = toUnits(tokenAmount, tokenDecimals, ethers);

    try {
      const signer = await ethersProvider.getSigner();

      let tx;
      switch (transferType) {
        case 'deposit':
          tx = await tokenContract
            .connect(signer)
            .approve(exchangeContract.target, amountInUnits);
          await tx.wait();

          tx = await exchangeContract
            .connect(signer)
            .deposit(tokenContract.target, amountInUnits);
          await tx.wait();

          break;

        case 'withdraw':
          tx = await exchangeContract
            .connect(signer)
            .withdraw(tokenContract.target, amountInUnits);
          await tx.wait();

          break;

        default:
          break;
      }

      thunkApi.dispatch(clearError({ domain: 'transfer' }));
    } catch (error) {
      const message = getErrorMessage({
        error,
        contract: exchangeContract,
        tokenSymbol,
        tokenDecimals,
      });
      const meta = error;

      thunkApi.dispatch(setError({ domain: 'transfer', message }));
      return thunkApi.rejectWithValue(message, meta);
    }
  },
);
