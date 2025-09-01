import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import {
  addCancelledOrderFromEvent,
  addFilledOrderFromEvent,
  addOrderFromEvent,
  cancelOrder,
  fillOrder,
  makeOrder,
} from './order-thunk';
import { doTransfer } from './transfer-thunk';

const ordersAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.createdAt - a.createdAt,
});

const initialState = {
  contract: null,
  balances: [],
  orders: ordersAdapter.getInitialState({
    // Add extra fields to the normalized state
    shouldFetchPastOrders: true,
    filledOrderIds: [], // Array of order IDs
    cancelledOrderIds: [], // Array of order IDs
  }),
  pending: {
    cancel: [], // Array of order IDs being cancelled
    fill: [], // Array of order IDs being filled
  },
  order: {
    side: 'buy',
    isPendingMake: false,
  },
  transfer: {
    type: 'deposit',
    pendingTransferOf: null,
  },
  history: {
    type: 'orders',
  },
};

export const exchangeSlice = createSlice({
  name: 'exchange',
  initialState,
  reducers: {
    setContract(state, action) {
      if (state.contract) {
        state.contract.removeAllListeners();
      }
      state.contract = action.payload;
    },
    setBalances(state, action) {
      state.balances = action.payload;
    },
    resetExchange(state) {
      if (state.contract) {
        state.contract.removeAllListeners();
      }
      return initialState;
    },
    resetExchangeBalances(state) {
      state.balances = initialState.balances;
    },
    addAllOrdersFromEvents: (state, action) => {
      ordersAdapter.setAll(state.orders, action.payload);
    },
    addFilledOrdersFromEvents: (state, action) => {
      ordersAdapter.upsertMany(state.orders, action.payload);
      state.orders.filledOrderIds = action.payload.map((order) => order.id);
    },
    addCancelledOrdersFromEvents: (state, action) => {
      ordersAdapter.upsertMany(state.orders, action.payload);
      state.orders.cancelledOrderIds = action.payload.map((order) => order.id);
    },
    setPastOrdersFetched(state) {
      state.orders.shouldFetchPastOrders = false;
    },
    setOrderSide(state, action) {
      state.order.side = action.payload;
    },
    setTransferType(state, action) {
      state.transfer.type = action.payload;
    },
    setHistoryType(state, action) {
      state.history.type = action.payload;
    },
    removePendingFillOrder(state, action) {
      const index = state.pending.fill.indexOf(action.payload);
      if (index !== -1) {
        state.pending.fill.splice(index, 1);
      }
    },
    removePendingCancelOrder(state, action) {
      const index = state.pending.cancel.indexOf(action.payload);
      if (index !== -1) {
        state.pending.cancel.splice(index, 1);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Add order from event
      .addCase(addOrderFromEvent.fulfilled, (state, action) => {
        const { orderData } = action.payload;
        // Add a new order or update an existing one
        ordersAdapter.upsertOne(state.orders, orderData);
      })
      .addCase(addFilledOrderFromEvent.fulfilled, (state, action) => {
        const { orderData, wasAdded } = action.payload;
        ordersAdapter.upsertOne(state.orders, orderData);
        if (wasAdded) {
          state.orders.filledOrderIds.push(orderData.id);
        }
      })
      .addCase(addCancelledOrderFromEvent.fulfilled, (state, action) => {
        const { orderData, wasAdded } = action.payload;
        ordersAdapter.upsertOne(state.orders, orderData);
        if (wasAdded) {
          state.orders.cancelledOrderIds.push(orderData.id);
        }
      })

      // Make order
      .addCase(makeOrder.pending, (state) => {
        state.order.isPendingMake = true;
      })
      .addCase(makeOrder.fulfilled, (state) => {
        state.order.isPendingMake = false;
      })
      .addCase(makeOrder.rejected, (state) => {
        state.order.isPendingMake = false;
      })

      // Fill order
      .addCase(fillOrder.pending, (state, action) => {
        const { orderId } = action.meta.arg;
        if (!state.pending.fill.includes(orderId)) {
          state.pending.fill.push(orderId);
        }
      })
      .addCase(fillOrder.rejected, (state, action) => {
        const { orderId } = action.meta.arg;
        // Override payload so we can remove it from the pending fill orders array
        action.payload = orderId;
        exchangeSlice.caseReducers.removePendingFillOrder(state, action);
      })

      // Cancel order
      .addCase(cancelOrder.pending, (state, action) => {
        const { orderId } = action.meta.arg;
        if (!state.pending.cancel.includes(orderId)) {
          state.pending.cancel.push(orderId);
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        const { orderId } = action.meta.arg;
        // Override payload so we can remove it from the pending cancel orders array
        action.payload = orderId;
        exchangeSlice.caseReducers.removePendingCancelOrder(state, action);
      })

      // Transfer (Deposit/Withdraw)
      .addCase(doTransfer.pending, (state, action) => {
        state.transfer.pendingTransferOf =
          action.meta.arg.tokenIdx === 0 ? 'base' : 'quote';
      })
      .addCase(doTransfer.fulfilled, (state) => {
        state.transfer.pendingTransferOf =
          initialState.transfer.pendingTransferOf;
      })
      .addCase(doTransfer.rejected, (state) => {
        state.transfer.pendingTransferOf =
          initialState.transfer.pendingTokenIdx;
      });
  },
});

export {
  addCancelledOrderFromEvent,
  addFilledOrderFromEvent,
  addOrderFromEvent,
  cancelOrder,
  doTransfer,
  fillOrder,
  makeOrder,
};

export const {
  setContract,
  setBalances,
  resetExchange,
  resetExchangeBalances,
  addAllOrdersFromEvents,
  addFilledOrdersFromEvents,
  addCancelledOrdersFromEvents,
  setPastOrdersFetched,
  setOrderSide,
  setTransferType,
  setHistoryType,
  removePendingCancelOrder,
  removePendingFillOrder,
} = exchangeSlice.actions;

export const {
  selectAll: selectAllOrders,
  selectById: selectOrderById,
  selectIds: selectOrderIds,
} = ordersAdapter.getSelectors((state) => state.exchange.orders);

export default exchangeSlice.reducer;
