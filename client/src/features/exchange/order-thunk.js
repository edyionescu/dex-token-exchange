import { clearError, setError } from '@/features/error/error-slice';
import { getErrorMessage } from '@/lib/helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { formatAmount, toUnits } from '@shared/helpers';
import { ethers } from 'ethers';
import { selectOrderById } from './exchange-slice';

export const makeOrder = createAsyncThunk(
  'exchange/makeOrder',
  async (order, thunkApi) => {
    const { side, baseAddress, baseAmount, basePrice, quoteAddress } = order;

    const { tokens, exchange, wallet } = thunkApi.getState();
    const { ethersProvider } = wallet;
    const {
      symbols: [baseSymbol, quoteSymbol],
      decimals: [baseDecimals, quoteDecimals],
    } = tokens;
    const {
      contract: exchangeContract,
      balances: [baseExchangeBalance, quoteExchangeBalance],
    } = exchange;

    let tokenGet,
      amountGet,
      tokenGetDecimals,
      tokenGive,
      tokenGiveSymbol,
      amountGive,
      tokenGiveDecimals,
      exchangeBalance;

    switch (side) {
      case 'buy':
        tokenGet = baseAddress;
        amountGet = baseAmount;
        tokenGetDecimals = baseDecimals;
        tokenGive = quoteAddress;
        tokenGiveSymbol = quoteSymbol;
        amountGive = baseAmount * basePrice;
        tokenGiveDecimals = quoteDecimals;
        exchangeBalance = quoteExchangeBalance;

        break;

      case 'sell':
        tokenGet = quoteAddress;
        amountGet = baseAmount * basePrice;
        tokenGetDecimals = quoteDecimals;
        tokenGive = baseAddress;
        tokenGiveSymbol = baseSymbol;
        amountGive = baseAmount;
        tokenGiveDecimals = baseDecimals;
        exchangeBalance = baseExchangeBalance;

        break;

      default:
        break;
    }

    if (exchangeBalance < amountGive) {
      const message = `Your current balance is ${exchangeBalance} ${tokenGiveSymbol}.
          Make a deposit of ${formatAmount(amountGive - exchangeBalance)} ${tokenGiveSymbol} or more to continue.`;

      thunkApi.dispatch(
        setError({
          domain: 'order',
          message,
        }),
      );

      return thunkApi.rejectWithValue(message);
    }

    const amountGetUnits = toUnits(amountGet, tokenGetDecimals, ethers);
    const amountGiveUnits = toUnits(amountGive, tokenGiveDecimals, ethers);

    try {
      const signer = await ethersProvider.getSigner();
      const tx = await exchangeContract
        .connect(signer)
        .makeOrder(tokenGet, amountGetUnits, tokenGive, amountGiveUnits);
      await tx.wait();

      thunkApi.dispatch(clearError({ domain: 'order' }));
    } catch (error) {
      const message = getErrorMessage({
        error,
        contract: exchangeContract,
        tokenSymbol: tokenGiveSymbol,
        tokenDecimals: tokenGiveDecimals,
      });
      const meta = error;

      thunkApi.dispatch(setError({ domain: 'order', message }));
      return thunkApi.rejectWithValue(message, meta);
    }
  },
);

export const fillOrder = createAsyncThunk(
  'exchange/fillOrder',
  async (order, thunkApi) => {
    const { orderId } = order;

    const state = thunkApi.getState();
    const { tokens, exchange, wallet } = state;
    const { ethersProvider } = wallet;
    const { contract: exchangeContract } = exchange;
    const { symbols, decimals, addresses } = tokens;

    const existingOrder = selectOrderById(state, orderId);
    const { tokenGet } = existingOrder;

    const tokenIdx = addresses.indexOf(tokenGet);
    const tokenSymbol = symbols[tokenIdx];
    const tokenDecimals = decimals[tokenIdx];

    try {
      const signer = await ethersProvider.getSigner();
      const tx = await exchangeContract.connect(signer).fillOrder(orderId);
      await tx.wait();

      thunkApi.dispatch(clearError({ domain: 'order' }));
    } catch (error) {
      const message = getErrorMessage({
        error,
        contract: exchangeContract,
        tokenSymbol,
        tokenDecimals,
      });
      const meta = error;

      thunkApi.dispatch(setError({ domain: 'order', message }));
      return thunkApi.rejectWithValue(message, meta);
    }
  },
);

export const cancelOrder = createAsyncThunk(
  'exchange/cancelOrder',
  async (order, thunkApi) => {
    const { orderId } = order;

    const { exchange, wallet } = thunkApi.getState();
    const { ethersProvider } = wallet;
    const { contract: exchangeContract } = exchange;

    try {
      const signer = await ethersProvider.getSigner();
      const tx = await exchangeContract.connect(signer).cancelOrder(orderId);
      await tx.wait();

      thunkApi.dispatch(clearError({ domain: 'order' }));
    } catch (error) {
      const message = getErrorMessage({
        error,
        contract: exchangeContract,
      });
      const meta = error;

      thunkApi.dispatch(setError({ domain: 'order', message }));
      return thunkApi.rejectWithValue(message, meta);
    }
  },
);

export const addOrderFromEvent = createAsyncThunk(
  'exchange/addOrderFromEvent',
  async (orderData, thunkApi) => {
    const {
      exchange: { orders },
    } = thunkApi.getState();

    const orderExists = orders.ids.includes(orderData.id);

    return {
      orderData,
      wasAdded: !orderExists,
    };
  },
);

export const addFilledOrderFromEvent = createAsyncThunk(
  'exchange/addFilledOrderFromEvent',
  async (orderData, thunkApi) => {
    const {
      exchange: { orders },
    } = thunkApi.getState();

    const orderExists = orders.filledOrderIds.includes(orderData.id);

    return {
      orderData,
      wasAdded: !orderExists,
    };
  },
);

export const addCancelledOrderFromEvent = createAsyncThunk(
  'exchange/addCancelledOrderFromEvent',
  async (orderData, thunkApi) => {
    const {
      exchange: { orders },
    } = thunkApi.getState();

    const orderExists = orders.cancelledOrderIds.includes(orderData.id);

    return {
      orderData,
      wasAdded: !orderExists,
    };
  },
);
