import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatAmount } from '@shared/helpers';
import { AlertCircleIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import { formatAddress, formatDateTime, toTokens } from '@/lib/helpers';
import { CircleAlert, MoveRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getTokens } from './get-tokens-thunk';

import dExLogo from '@/assets/dex.webp';
import mEthLogo from '@/assets/eth.webp';
import mLinkLogo from '@/assets/link.webp';

const tokenLogos = {
  dEx: dExLogo,
  mEth: mEthLogo,
  mLink: mLinkLogo,
};

export function GetTokens({ tokenIdx, openDialog, setOpenDialog }) {
  const [loading, setLoading] = useState(true);
  const [availableTokens, setAvailableTokens] = useState(null);
  const [nextTime, setNextTime] = useState(null);

  const { contracts, decimals, symbols, isPendingTokenDistribution } =
    useSelector((state) => state.tokens);
  const tokenContract = contracts[tokenIdx];
  const tokenSymbol = symbols[tokenIdx];
  const tokenDecimals = decimals[tokenIdx];

  const { userAccount } = useSelector((state) => state.wallet);

  const dispatch = useDispatch();

  const getFaucetInfo = useCallback(async () => {
    if (openDialog && userAccount && tokenContract && tokenDecimals) {
      setLoading(true);
      setAvailableTokens(null);
      setNextTime(null);

      const availableTokens =
        await tokenContract.getAvailableTokensToday(userAccount);
      const nextTime = await tokenContract.getNextDistributionTime(userAccount);

      setLoading(false);
      setAvailableTokens(toTokens(availableTokens, tokenDecimals));
      setNextTime(Number(nextTime));
    }
  }, [openDialog, userAccount, tokenContract, tokenDecimals]);

  useEffect(
    function faucetInfo() {
      getFaucetInfo().catch(console.error);
    },
    [getFaucetInfo],
  );

  async function dispatchGetTokens(ev) {
    ev.preventDefault();

    const formData = new FormData(ev.target);
    const requestedTokens = Number(formData.get('requestedTokens'));

    if (requestedTokens > 0 && availableTokens > 0) {
      await dispatch(
        getTokens({
          requestedTokens,
          availableTokens,
          tokenIdx,
        }),
      );

      ev.target.reset();
      setOpenDialog(false);
    }
  }

  const dailyLimitReached = availableTokens === 0;

  return (
    <DialogContent>
      <DialogHeader className="items-center">
        <DialogTitle className="mt-3 mb-2 text-center">Get tokens</DialogTitle>
      </DialogHeader>

      <form onSubmit={dispatchGetTokens} className="text-center">
        <div className="flex items-center justify-center">
          <img
            src={tokenLogos[tokenSymbol]}
            alt={tokenSymbol}
            className="mr-[0.4em] h-[24px] grayscale-[100%] filter"
          />

          {tokenSymbol}

          {!dailyLimitReached && (
            <Input
              name="requestedTokens"
              type="number"
              required
              placeholder="0.00"
              min="0.01"
              step="0.01"
              max={formatAmount(availableTokens, 2, false)}
              disabled={loading || isPendingTokenDistribution}
              className="ml-2 w-1/5 text-right"
            />
          )}

          {dailyLimitReached ? (
            <CircleAlert size={24} className="mx-3 inline-block text-red-400" />
          ) : (
            <MoveRight size={20} className="mx-3 inline-block" />
          )}

          {formatAddress(userAccount)}
        </div>

        {!dailyLimitReached && (
          <div className="mt-4 text-xs text-muted-foreground">
            Maximum claimable today: {formatAmount(availableTokens)}{' '}
            {tokenSymbol}
          </div>
        )}

        {dailyLimitReached && (
          <Alert variant="destructive" className="mx-auto mt-4 w-3/4 text-left">
            <AlertCircleIcon />
            <AlertTitle>Daily limit reached.</AlertTitle>
            <AlertDescription>
              <p>Next distribution available at: {formatDateTime(nextTime)}.</p>
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter className="mt-5 mb-3 sm:justify-center">
          {dailyLimitReached ? (
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          ) : (
            <Button
              type="submit"
              disabled={loading || isPendingTokenDistribution}
            >
              {isPendingTokenDistribution ? (
                <Loading text="Pending confirmation" />
              ) : (
                `Get ${tokenSymbol}`
              )}
            </Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
