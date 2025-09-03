import { Fallback } from '@/components/fallback';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDateTime } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { selectOpenOrders } from '@/selectors/select-open-orders';
import { formatAmount } from '@shared/helpers';
import { Dot } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fillOrder } from './exchange-slice';

function OrdersByType({ orders, type = 'buying' }) {
  const {
    balances: [baseBalanceExchange, quoteBalanceExchange],
    contract: exchangeContract,
    pending: { fill: pendingFillOrders },
  } = useSelector((state) => state.exchange);

  const {
    addresses: [baseAddress, quoteAddress],
  } = useSelector((state) => state.tokens);

  const [baseSymbol, quoteSymbol] = useSelector(
    (state) => state.tokens.symbols,
  );

  const dispatch = useDispatch();

  const hasOrders = orders.length > 0;
  const disabled = !(baseAddress && quoteAddress && exchangeContract);

  async function dispatchFillOrder(orderId) {
    await dispatch(fillOrder({ orderId }));
  }

  return (
    <>
      {!hasOrders ? (
        <Fallback>No {type} orders.</Fallback>
      ) : (
        <ScrollArea className="h-[29vh] min-h-[375px] pr-4">
          <Table>
            <TableHeader className="sticky top-0 z-1 bg-muted">
              <TableRow>
                <TableHead className="w-1/5 text-center text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="w-1/5 text-right text-muted-foreground">
                  {baseSymbol}
                </TableHead>
                <TableHead className="w-1/5 text-right text-muted-foreground">
                  Price
                </TableHead>
                <TableHead className="w-1/5 text-right text-muted-foreground">
                  {quoteSymbol}
                </TableHead>
                <TableHead className="w-1/5 pr-2.5 text-right text-muted-foreground">
                  Option
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(
                ({
                  id,
                  baseAmount,
                  quoteAmount,
                  price,
                  isOwnOrder,
                  createdAt,
                  color,
                }) => {
                  const isPendingFill = pendingFillOrders.includes(id);

                  let balanceExchange, orderAmount, orderSymbol, action;

                  switch (type) {
                    case 'buying':
                      balanceExchange = baseBalanceExchange;
                      orderAmount = baseAmount;
                      orderSymbol = baseSymbol;
                      action = 'Sell';
                      break;

                    case 'selling':
                      balanceExchange = quoteBalanceExchange;
                      orderAmount = quoteAmount;
                      orderSymbol = quoteSymbol;
                      action = 'Buy';
                      break;

                    default:
                      break;
                  }

                  const notEnoughBalance = balanceExchange < orderAmount;
                  const noBalance = balanceExchange === 0;

                  const disabledOrder =
                    disabled || isOwnOrder || isPendingFill || notEnoughBalance;

                  return (
                    <TableRow key={id} className="hover:bg-muted-foreground/7">
                      <TableCell className="h-12 text-center" style={{ color }}>
                        {isOwnOrder && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Dot className="-ml-5.5 inline-block" />
                            </TooltipTrigger>
                            <TooltipContent className="font-medium">
                              My order from {formatDateTime(createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {type === 'buying' ? 'Buying' : 'Selling'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(baseAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(quoteAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger
                            asChild
                            className="disabled:pointer-events-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-12"
                              disabled={disabledOrder}
                              onClick={() => {
                                dispatchFillOrder(id);
                              }}
                            >
                              {isPendingFill ? <Loading /> : action}
                            </Button>
                          </TooltipTrigger>
                          {isOwnOrder ? (
                            <TooltipContent className="font-medium">
                              My order from {formatDateTime(createdAt)}
                            </TooltipContent>
                          ) : (
                            notEnoughBalance && (
                              <TooltipContent className="font-medium">
                                {noBalance ? (
                                  `No ${orderSymbol} balance available on exchange.`
                                ) : (
                                  <>
                                    Your {balanceExchange} {orderSymbol} balance
                                    is lower than {orderAmount}.
                                  </>
                                )}
                              </TooltipContent>
                            )
                          )}
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </>
  );
}

function Buying() {
  const { buyOrders } = useSelector(selectOpenOrders);
  return <OrdersByType orders={buyOrders} type="buying" />;
}

function Selling() {
  const { sellOrders } = useSelector(selectOpenOrders);
  return <OrdersByType orders={sellOrders} type="selling" />;
}

export function OpenOrders() {
  const { userAccount } = useSelector((state) => state.wallet);
  const { buyOrders, sellOrders } = useSelector(selectOpenOrders);
  const hasOrders = buyOrders.length > 0 || sellOrders.length > 0;

  return (
    <div
      className={cn(
        'relative col-start-1 col-end-13 m-[0.13em] h-[36vh] min-h-[470px] bg-sidebar-accent px-[1.75em] py-[0.75em]',
        {
          'bg-sidebar-accent/30': !userAccount,
        },
      )}
    >
      <h2 className="text-md mt-3 mb-6 font-medium uppercase">Open Orders</h2>

      {!hasOrders ? (
        <Fallback>No orders.</Fallback>
      ) : (
        <div className="flex flex-col items-stretch gap-y-10 lg:flex-row lg:gap-x-13">
          <div className="relative lg:w-1/2">
            <Buying />
          </div>

          <div className="relative lg:w-1/2">
            <Selling />
          </div>
        </div>
      )}
    </div>
  );
}
