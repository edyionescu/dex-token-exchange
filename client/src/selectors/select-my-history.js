import { chartColors } from '@/lib/price-chart.config';
import { createSelector } from '@reduxjs/toolkit';
import _orderBy from 'lodash/orderBy';
import { orderStrategy } from './helpers';
import { selectOpenOrders } from './select-open-orders';
import { selectTradeBook } from './select-trade-book';

const selectUserAccount = (state) => state.wallet.userAccount;

export const selectMyHistory = createSelector(
  [selectOpenOrders, selectTradeBook, selectUserAccount],
  (orderBook, trades, selectedUserAccount) => {
    let myOrders = [];
    let myTrades = [];

    orderBook = [...orderBook.buyOrders, ...orderBook.sellOrders];

    if (
      (orderBook.length === 0 && trades.length === 0) ||
      selectedUserAccount === undefined
    ) {
      return {
        myOrders,
        myTrades,
      };
    }

    const { GREEN, RED } = chartColors;

    // Get open orders of the connected account and sort them descending
    myOrders = orderBook.filter((order) => order.maker === selectedUserAccount);
    myOrders = _orderBy(myOrders, ...orderStrategy('desc'));

    // Get trades initiated or executed by the connected account (trades previously sorted descending)
    myTrades = trades
      .filter((order) =>
        [order.maker, order.taker].includes(selectedUserAccount),
      )
      .map((order) => {
        let { side, color } = order;

        // reverse the side if the connected account is the taker
        if (order.taker === selectedUserAccount) {
          side = side === 'buy' ? 'sell' : 'buy';
        }

        // Re-set the color based on the order side
        color = side === 'buy' ? GREEN : RED;

        return {
          ...order,
          side,
          color,
        };
      });

    return {
      myOrders,
      myTrades,
    };
  },
);
