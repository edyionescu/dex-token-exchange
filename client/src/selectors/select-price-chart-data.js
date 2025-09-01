import { getDateParts } from '@/lib/helpers';
import { createSelector } from '@reduxjs/toolkit';
import _orderBy from 'lodash/orderBy';
import { selectAllOrders } from '../features/exchange/exchange-slice';
import { extendOrder, ordersFromCurrentMarket, orderStrategy } from './helpers';

const selectTokenAddresses = (state) => state.tokens.addresses;
const selectFilledOrderIds = (state) => state.exchange.orders.filledOrderIds;

export const selectPriceChartData = createSelector(
  [selectTokenAddresses, selectAllOrders, selectFilledOrderIds],
  (tokenAddresses, allOrders, filledOrderIds) => {
    let ohlcData = [];

    if (
      tokenAddresses.length !== 2 ||
      allOrders.length === 0 ||
      filledOrderIds.length === 0
    ) {
      return {
        ohlcData,
      };
    }

    let filledOrders = allOrders.filter((order) =>
      filledOrderIds.includes(order.id),
    );

    filledOrders = ordersFromCurrentMarket(filledOrders, tokenAddresses).map(
      (order) => extendOrder(order, tokenAddresses),
    );

    filledOrders = _orderBy(filledOrders, ...orderStrategy('asc'));

    ohlcData = buildOHLCdata(filledOrders, '30min');

    const lastCandlestick = ohlcData.at(-1);
    const [open, _, __, close] = lastCandlestick?.y ?? [];
    const direction = close > open ? 'up' : 'down';
    const lastPrice = close;

    return {
      ohlcData,
      lastPrice,
      direction,
    };
  },
);

function buildOHLCdata(orders = [], interval = '30min') {
  // Group by interval
  orders = Object.groupBy(orders, ({ createdAt }) => {
    const { month, day, year, hours, minutes, seconds } =
      getDateParts(createdAt);
    const date = `${month}/${day}/${year}`;

    switch (interval) {
      case 'day':
        return date;
      case 'hour':
        return `${date} ${hours}:00`;
      case '30min': {
        const intervalMark = minutes < 30 ? '00' : '30';
        return `${date} ${hours}:${intervalMark}`;
      }
      case 'minute':
        return `${date} ${hours}:${minutes}`;
      case 'second':
        return `${date} ${hours}:${minutes}:${seconds}`;
    }
  });

  return Object.keys(orders).map((date) => {
    const currentInterval = orders[date];
    const firstOrder = currentInterval[0];
    const lastOrder = currentInterval.at(-1);

    const open = Number(firstOrder.price);
    const high = Math.max(...currentInterval.map((order) => order.price));
    const low = Math.min(...currentInterval.map((order) => order.price));
    const close = Number(lastOrder.price);

    return {
      x: new Date(date),
      y: [open, high, low, close],
    };
  });
}
