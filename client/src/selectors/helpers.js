import { chartColors } from '@/lib/price-chart.config';
import { formatAmount } from '@shared/helpers';

export function ordersFromCurrentMarket(orders, tokenAddresses) {
  return orders
    .filter((order) => tokenAddresses.includes(order.tokenGet))
    .filter((order) => tokenAddresses.includes(order.tokenGive));
}

export function extendOrder(order, tokenAddresses) {
  const [baseAddress, quoteAddress] = tokenAddresses;
  const { GREEN, RED } = chartColors;
  let baseAmount, quoteAmount, side, color;

  if (order.tokenGive === quoteAddress) {
    side = 'buy';
    baseAmount = order.amountGet;
    quoteAmount = order.amountGive;
    color = GREEN;
  } else if (order.tokenGive === baseAddress) {
    side = 'sell';
    baseAmount = order.amountGive;
    quoteAmount = order.amountGet;
    color = RED;
  }

  return {
    ...order,
    side,
    baseAmount: formatAmount(baseAmount, 2, false),
    quoteAmount: formatAmount(quoteAmount, 2, false),
    price: formatAmount(quoteAmount / baseAmount, 2, false),
    color,
  };
}

export function orderStrategy(direction = 'desc') {
  // Primary: block number
  // Secondary: transaction index within block
  // Tertiary: log index within transaction
  const iteratees = ['blockNumber', 'transactionIndex', 'logIndex'];
  const orders = iteratees.map(() => direction);
  return [iteratees, orders];
}
