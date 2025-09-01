import { Fallback } from '@/components/fallback';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { contractsConfig, formatDateTime } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { selectTradeBook } from '@/selectors/select-trade-book';
import { formatAmount } from '@shared/helpers';
import capitalize from 'lodash/capitalize';
import { useSelector } from 'react-redux';

export function TradeBook() {
  const { userAccount, chainId } = useSelector((state) => state.wallet);
  const [baseSymbol, quoteSymbol] = useSelector(
    (state) => state.tokens.symbols,
  );
  const trades = useSelector(selectTradeBook);

  const hasTrades = trades.length > 0;

  const {
    network: { explorerUrl },
  } = contractsConfig(chainId);

  return (
    <div
      className={cn(
        'relative col-start-1 col-end-13 m-[0.13em] h-[283px] bg-sidebar-accent px-[1.75em] py-[0.75em] md:col-start-7 md:col-end-13',
        {
          'bg-sidebar-accent/30': !userAccount,
        },
      )}
    >
      <h2 className="text-md mt-3 mb-4.5 font-medium uppercase">Trade book</h2>

      {!hasTrades ? (
        <Fallback>No trades.</Fallback>
      ) : (
        <ScrollArea className="h-[200px] w-[101%] pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow className="hover:bg-muted-foreground/7">
                <TableHead className="h-12.5 w-1/5 text-center text-muted-foreground">
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
                <TableHead className="w-1/5 pr-4.5 text-right text-muted-foreground">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map(
                ({
                  id,
                  baseAmount,
                  quoteAmount,
                  side,
                  createdAt,
                  price,
                  color,
                  transactionHash,
                }) => (
                  <TableRow
                    key={id}
                    className={cn('hover:bg-muted-foreground/7', {
                      'cursor-pointer': explorerUrl.length,
                    })}
                    {...(explorerUrl.length && {
                      onClick: () => {
                        window.open(
                          `${explorerUrl}/tx/${transactionHash}`,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      },
                    })}
                  >
                    <TableCell className="h-12.5 text-center" style={{ color }}>
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
                    <TableCell className="pl-6 text-right">
                      {formatDateTime(createdAt)}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
