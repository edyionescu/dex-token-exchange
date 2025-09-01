import { createSelector } from '@reduxjs/toolkit';
import _orderBy from 'lodash/orderBy';
import { selectAllOrders } from '../features/exchange/exchange-slice';
import { extendOrder, ordersFromCurrentMarket, orderStrategy } from './helpers';

const selectTokenAddresses = (state) => state.tokens.addresses;
const selectFilledOrderIds = (state) => state.exchange.orders.filledOrderIds;
const selectCancelledOrderIds = (state) =>
  state.exchange.orders.cancelledOrderIds;
const selectUserAccount = (state) => state.wallet.userAccount;

export const selectOpenOrders = createSelector(
  [
    selectTokenAddresses,
    selectAllOrders,
    selectFilledOrderIds,
    selectCancelledOrderIds,
    selectUserAccount,
  ],
  (
    tokenAddresses,
    allOrders,
    filledOrderIds,
    cancelledOrderIds,
    connectedAddress,
  ) => {
    let buyOrders = [];
    let sellOrders = [];

    if (
      tokenAddresses.length !== 2 ||
      allOrders.length === 0 ||
      connectedAddress === undefined
    ) {
      return {
        buyOrders,
        sellOrders,
      };
    }

    let openOrders = allOrders.filter(
      (order) =>
        [...filledOrderIds, ...cancelledOrderIds].includes(order.id) === false,
    );

    openOrders = ordersFromCurrentMarket(openOrders, tokenAddresses).map(
      (order) => extendOrder(order, tokenAddresses),
    );

    openOrders.forEach((order) => {
      order.isOwnOrder = connectedAddress === order.maker;
    });

    // Sort descending
    buyOrders = openOrders.filter((order) => order.side === 'buy');
    buyOrders = _orderBy(buyOrders, ...orderStrategy('desc'));

    sellOrders = openOrders.filter((order) => order.side === 'sell');
    sellOrders = _orderBy(sellOrders, ...orderStrategy('desc'));

    return {
      buyOrders,
      sellOrders,
    };
  },
);
