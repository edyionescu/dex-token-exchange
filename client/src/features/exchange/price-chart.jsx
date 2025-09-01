import { Fallback } from '@/components/fallback';
import { useTheme } from '@/hooks/use-theme';
import { chartColors, options } from '@/lib/price-chart.config';
import { cn } from '@/lib/utils';
import { selectPriceChartData } from '@/selectors/select-price-chart-data';
import { formatAmount } from '@shared/helpers';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { useSelector } from 'react-redux';

const LazyApexChart = lazy(() =>
  import('@/components/apexchart').then((module) => ({
    default: module.ApexChart,
  })),
);

export function PriceChart() {
  const { userAccount, chainId } = useSelector((state) => state.wallet);

  const {
    symbols: [baseSymbol, quoteSymbol],
  } = useSelector((state) => state.tokens);

  const { ohlcData, lastPrice, direction } = useSelector(selectPriceChartData);
  const chartSeries = [{ data: ohlcData }];

  const { GREEN, RED } = chartColors;
  const color = direction === 'up' ? GREEN : RED;

  const { theme: generalTheme } = useTheme();
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  const tooltipTheme = generalTheme === 'system' ? systemTheme : generalTheme;
  const chartOptions = {
    ...options,
    tooltip: { ...options.tooltip, theme: tooltipTheme },
  };

  return (
    <div
      className={cn(
        'relative col-start-1 col-end-13 m-[0.13em] h-[31vh] bg-sidebar-accent px-[1.75em] py-[0.75em]',
        {
          'bg-sidebar-accent/30': !userAccount,
        },
      )}
    >
      {!userAccount || !chainId ? (
        <Fallback />
      ) : (
        <>
          <div className="my-5 flex items-center justify-between">
            <div className="flex items-center">
              {baseSymbol && quoteSymbol && (
                <h2 className="text-md font-medium">
                  {baseSymbol} / {quoteSymbol}
                </h2>
              )}

              {lastPrice > 0 && (
                <div className="flex items-center">
                  <span className="mx-2.5">
                    {direction === 'up' ? (
                      <TrendingUp color={GREEN} />
                    ) : (
                      <TrendingDown color={RED} />
                    )}
                  </span>
                  <span className={`font-medium`} style={{ color }}>
                    {formatAmount(lastPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!ohlcData.length ? (
            <Fallback>No historical data.</Fallback>
          ) : (
            <Suspense>
              <LazyApexChart
                type="candlestick"
                options={chartOptions}
                series={chartSeries}
                height="85%"
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
