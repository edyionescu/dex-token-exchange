import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contractsConfig } from '@/lib/helpers';
import { useDispatch, useSelector } from 'react-redux';

import { setBalances as setExchangeBalances } from '@/features/exchange/exchange-slice';
import { fetchExchangeBalances } from '@/features/exchange/exchange-utils';
import { setBalances as setTokenBalances } from './token-slice';
import { fetchTokens } from './token-utils';

export function Market() {
  const dispatch = useDispatch();

  const { userAccount, chainId, ethersProvider } = useSelector(
    (state) => state.wallet,
  );
  const { addresses } = useSelector((state) => state.tokens);
  const { contract: exchangeContract } = useSelector((state) => state.exchange);

  const { tokens: { baseToken, quoteToken_1, quoteToken_2 } = {} } =
    contractsConfig(chainId);

  async function changeMarket(newMarket) {
    const tokenAddresses = newMarket.split(',');
    const [newBaseToken, newQuoteToken] = tokenAddresses;

    if (ethersProvider && newBaseToken && newQuoteToken) {
      dispatch(setTokenBalances([]));
      dispatch(setExchangeBalances([]));

      const { decimals: tokenDecimals, balances: tokenBalances } =
        await fetchTokens(
          {
            ethersProvider,
            userAccount,
            tokenAddresses,
          },
          dispatch,
        );

      const exchangeBalances = await fetchExchangeBalances({
        exchangeContract,
        tokenAddresses,
        tokenDecimals,
        userAccount,
      });

      dispatch(setTokenBalances(tokenBalances));
      dispatch(setExchangeBalances(exchangeBalances));
    }
  }

  return (
    <div className="col-start-2 col-end-12 sm:col-start-3 sm:col-end-11 md:col-start-1 md:col-end-6 md:row-start-1 md:row-end-3 lg:col-start-2 lg:row-start-1 lg:row-end-3 xl:col-start-1 xl:col-end-13 xl:row-[1]">
      <div className="mb-[0.75em]">
        <h2 className="text-md font-medium uppercase">Markets</h2>
      </div>

      <Select
        value={userAccount ? addresses.toString() : ''}
        onValueChange={changeMarket}
        disabled={!userAccount}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            {...(!userAccount && {
              placeholder: '...',
            })}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Markets</SelectLabel>
            {[quoteToken_1, quoteToken_2].map((quoteToken) => {
              if (!quoteToken.symbol) {
                return null;
              }
              return (
                <SelectItem
                  key={quoteToken.symbol}
                  value={`${baseToken.address},${quoteToken.address}`}
                >
                  {baseToken.symbol} / {quoteToken.symbol}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>

      <hr className="mx-[auto] my-[1.75em]" />
    </div>
  );
}
