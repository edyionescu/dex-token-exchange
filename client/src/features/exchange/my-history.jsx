import { Fallback } from '@/components/fallback';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  cancelOrder,
  setHistoryType,
} from '@/features/exchange/exchange-slice';
import { contractsConfig, formatDateTime } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { selectMyHistory } from '@/selectors/select-my-history';
import { formatAmount } from '@shared/helpers';
import capitalize from 'lodash/capitalize';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export function MyHistory() {
  const { userAccount, chainId } = useSelector((state) => state.wallet);

  const {
    history: { type: historyType },
    contract: exchangeContract,
    pending: { cancel: pendingCancelOrders },
  } = useSelector((state) => state.exchange);

  const {
    addresses: [baseAddress, quoteAddress],
  } = useSelector((state) => state.tokens);

  const [baseSymbol, quoteSymbol] = useSelector(
    (state) => state.tokens.symbols,
  );

  const { myOrders, myTrades } = useSelector(selectMyHistory);
  const history = historyType === 'orders' ? myOrders : myTrades;
  const hasHistory = history.length > 0;

  const {
    network: { explorerUrl },
  } = contractsConfig(chainId);

  const dispatch = useDispatch();

  const disabled = !(baseAddress && quoteAddress && exchangeContract);

  async function dispatchCancelOrder(orderId) {
    await dispatch(cancelOrder({ orderId }));
  }

  const scrollAreaRef = useRef(null);
  const scrollPositions = useRef({ orders: 0, trades: 0 });

  // Maintain scroll position when switching between history types
  useEffect(() => {
    if (!scrollAreaRef.current) {
      return;
    }

    const scrollContainer = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]',
    );

    if (!scrollContainer) {
      return;
    }

    // Save scroll position
    const handleScroll = () => {
      scrollPositions.current[historyType] = scrollContainer.scrollTop;
    };
    scrollContainer.addEventListener('scrollend', handleScroll);

    // Restore scroll position
    const savedPosition = scrollPositions.current[historyType] || 0;
    scrollContainer.scrollTop = savedPosition;

    return () => {
      scrollContainer.removeEventListener('scrollend', handleScroll);
    };
  }, [historyType, history]);

  return (
    <div
      className={cn(
        'relative col-start-1 col-end-13 m-[0.13em] h-[21.77vh] min-h-[280px] bg-sidebar-accent px-[1.75em] py-[0.75em] md:col-start-1 md:col-end-7',
        {
          'bg-sidebar-accent/30': !userAccount,
        },
      )}
    >
      <div className="mt-2 mb-3 flex items-center justify-between">
        <h2 className="text-md font-medium uppercase">My history</h2>
        <div className="rounded-md bg-background">
          <Button
            onClick={() => dispatch(setHistoryType('orders'))}
            disabled={disabled}
            size="sm"
            className={cn(
              'min-w-[5em] bg-transparent text-foreground hover:bg-transparent',
              {
                'bg-foreground text-background hover:bg-foreground':
                  historyType === 'orders',
              },
            )}
          >
            Orders
          </Button>
          <Button
            onClick={() => dispatch(setHistoryType('trades'))}
            disabled={disabled}
            size="sm"
            className={cn(
              'min-w-[5em] bg-transparent text-foreground hover:bg-transparent',
              {
                'bg-foreground text-background hover:bg-foreground':
                  historyType === 'trades',
              },
            )}
          >
            Trades
          </Button>
        </div>
      </div>

      {!hasHistory ? (
        <Fallback>No {historyType}.</Fallback>
      ) : (
        <ScrollArea ref={scrollAreaRef} className="mt-5 h-[70%] w-[101%] pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
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
                {historyType === 'orders' ? (
                  <TableHead className="w-1/5 pr-5.5 text-right text-muted-foreground">
                    Option
                  </TableHead>
                ) : (
                  // Trade history
                  <TableHead className="w-1/5 pr-6 text-right text-muted-foreground">
                    Date
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(
                ({
                  id,
                  baseAmount,
                  quoteAmount,
                  side,
                  createdAt,
                  price,
                  color,
                  transactionHash,
                }) => {
                  const isPendingOrder =
                    historyType === 'orders' &&
                    pendingCancelOrders.includes(id);
                  const isExplorableTrade =
                    historyType === 'trades' && explorerUrl.length;

                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className={cn('hover:bg-muted-foreground/7', {
                            'cursor-pointer': isExplorableTrade,
                          })}
                          {...(isExplorableTrade && {
                            onClick: () => {
                              window.open(
                                `${explorerUrl}/tx/${transactionHash}`,
                                '_blank',
                                'noopener,noreferrer',
                              );
                            },
                          })}
                        >
                          <TableCell
                            className="h-12.5 text-center"
                            style={{ color }}
                          >
                            {capitalize(side)}
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
                          {historyType === 'orders' ? (
                            <TableCell className="pl-6 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-18"
                                disabled={isPendingOrder}
                                onClick={() => {
                                  dispatchCancelOrder(id);
                                }}
                              >
                                {isPendingOrder ? <Loading /> : 'Cancel'}
                              </Button>
                            </TableCell>
                          ) : (
                            // Trade history
                            <TableCell className="pr-3.5 pl-6 text-right">
                              {formatDateTime(createdAt)}
                            </TableCell>
                          )}
                        </TableRow>
                      </TooltipTrigger>
                      {historyType === 'orders' && (
                        <TooltipContent className="font-medium">
                          {`My order from ${formatDateTime(createdAt)}`}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                },
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
