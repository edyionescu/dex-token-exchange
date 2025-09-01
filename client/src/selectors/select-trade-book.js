import { createSelector } from '@reduxjs/toolkit';
import _orderBy from 'lodash/orderBy';
import { selectAllOrders } from '../features/exchange/exchange-slice';
import { extendOrder, ordersFromCurrentMarket, orderStrategy } from './helpers';

const selectTokenAddresses = (state) => state.tokens.addresses;
const selectFilledOrderIds = (state) => state.exchange.orders.filledOrderIds;

export const selectTradeBook = createSelector(
  [selectTokenAddresses, selectAllOrders, selectFilledOrderIds],
  (tokenContracts, allOrders, filledOrderIds) => {
    let trades = [];

    if (
      tokenContracts.length !== 2 ||
      allOrders.length === 0 ||
      filledOrderIds.length === 0
    ) {
      return trades;
    }

    let filledOrders = allOrders.filter((order) =>
      filledOrderIds.includes(order.id),
    );

    filledOrders = ordersFromCurrentMarket(filledOrders, tokenContracts).map(
      (order) => extendOrder(order, tokenContracts),
    );

    return _orderBy(filledOrders, ...orderStrategy('desc'));
  },
);
