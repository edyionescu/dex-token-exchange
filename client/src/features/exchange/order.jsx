import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { chartColors } from '@/lib/price-chart.config';
import { cn } from '@/lib/utils';
import capitalize from 'lodash/capitalize';
import { useDispatch, useSelector } from 'react-redux';
import { makeOrder, setOrderSide } from './exchange-slice';

export function Order() {
  const {
    symbols: [baseSymbol = '', quoteSymbol = ''],
    addresses: [baseAddress, quoteAddress],
  } = useSelector((state) => state.tokens);

  const {
    balances: [baseBalanceExchange, quoteBalanceExchange],
    contract: exchangeContract,
    order: { side, isPendingMake },
  } = useSelector((state) => state.exchange);

  const dispatch = useDispatch();

  const noBalance =
    (side == 'buy' && !quoteBalanceExchange) ||
    (side == 'sell' && !baseBalanceExchange);

  const orderButtonText = `${side === 'buy' ? 'Buy' : 'Sell'} ${baseSymbol}`;

  const { GREEN, RED } = chartColors;
  const backgroundColor = side === 'buy' ? GREEN : RED;

  async function dispatchMakeOrder(ev) {
    ev.preventDefault();

    const formData = new FormData(ev.target);
    const baseAmount = Number(formData.get('baseAmount'));
    const basePrice = Number(formData.get('basePrice'));

    if (baseAddress && quoteAddress && baseAmount > 0 && basePrice > 0) {
      await dispatch(
        makeOrder({
          side,
          baseAddress,
          quoteAddress,
          baseAmount,
          basePrice,
        }),
      );

      ev.target.reset();
    }
  }

  const disabled = !(baseAddress && quoteAddress && exchangeContract);

  return (
    <div className="col-start-2 col-end-12 sm:col-start-3 sm:col-end-11 md:col-start-1 md:col-end-6 md:row-start-2 md:row-end-3 lg:col-start-2 lg:row-start-2 lg:row-end-3 xl:col-start-1 xl:col-end-13 xl:row-[2]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-md font-medium uppercase">Order</h2>
        <div className="rounded-md bg-background">
          {['buy', 'sell'].map((thisSide) => (
            <Button
              key={thisSide}
              onClick={() => dispatch(setOrderSide(thisSide))}
              disabled={disabled}
              size="sm"
              className={cn(
                'min-w-[5em] bg-transparent text-foreground hover:bg-transparent',
                {
                  'bg-foreground text-background hover:bg-foreground':
                    thisSide === side,
                },
              )}
            >
              {capitalize(thisSide)}
            </Button>
          ))}
        </div>
      </div>

      <form onSubmit={dispatchMakeOrder}>
        <fieldset disabled={disabled}>
          <label>
            Amount <span className="float-right">{baseSymbol}</span>
            <Input
              name="baseAmount"
              type="number"
              required
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="my-[0.75em] text-right"
            />
          </label>
          <label>
            Price <span className="float-right">{quoteSymbol}</span>
            <Input
              name="basePrice"
              type="number"
              required
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="my-[0.75em] text-right"
            />
          </label>

          <Tooltip>
            <TooltipTrigger asChild className="disabled:pointer-events-auto">
              <Button
                type="submit"
                disabled={noBalance || isPendingMake}
                className="mx-[auto] my-[0.75em] w-full text-white"
                style={{ backgroundColor }}
              >
                {isPendingMake ? (
                  <Loading text="Pending confirmation" />
                ) : (
                  orderButtonText
                )}
              </Button>
            </TooltipTrigger>
            {noBalance && (
              <TooltipContent>
                Your exchange <b>{side == 'buy' ? quoteSymbol : baseSymbol}</b>{' '}
                balance is 0.
              </TooltipContent>
            )}
          </Tooltip>
        </fieldset>
      </form>

      <hr className="mx-[auto] my-[1.75em] md:last:hidden xl:last:block" />
    </div>
  );
}
