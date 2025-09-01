import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GetTokens } from '@/features/token/get-tokens';
import { cn } from '@/lib/utils';
import { formatAmount } from '@shared/helpers';
import capitalize from 'lodash/capitalize';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { doTransfer, setTransferType } from './exchange-slice';

import dExLogo from '@/assets/dex.webp';
import mEthLogo from '@/assets/eth.webp';
import mLinkLogo from '@/assets/link.webp';

const tokenLogos = {
  dEx: dExLogo,
  mEth: mEthLogo,
  mLink: mLinkLogo,
};

export function Transfer() {
  const [openBaseDialog, setOpenBaseDialog] = useState(false);
  const [openQuoteDialog, setOpenQuoteDialog] = useState(false);

  const {
    symbols: [baseSymbol, quoteSymbol],
    addresses: [baseAddress, quoteAddress],
    balances: [baseBalanceWallet, quoteBalanceWallet],
  } = useSelector((state) => state.tokens);

  const {
    contract: exchangeContract,
    balances: [baseBalanceExchange, quoteBalanceExchange],
    transfer: { type: transferType, pendingTransferOf },
  } = useSelector((state) => state.exchange);

  const dispatch = useDispatch();

  const disabled = !(baseAddress && quoteAddress && exchangeContract);

  async function dispatchTransfer(ev) {
    ev.preventDefault();

    const formData = new FormData(ev.target);
    const tokenAmount = Number(formData.get('tokenAmount'));
    const tokenIdx = Number(formData.get('tokenIdx'));

    if (tokenAmount > 0 && tokenIdx >= 0) {
      await dispatch(
        doTransfer({
          transferType,
          tokenAmount,
          tokenIdx,
        }),
      );

      ev.target.reset();
    }
  }

  return (
    <div className="col-start-2 col-end-12 sm:col-start-3 sm:col-end-11 md:col-start-7 md:col-end-13 md:row-start-1 md:row-end-3 lg:col-start-7 lg:col-end-12 lg:row-start-1 lg:row-end-3 xl:col-start-1 xl:col-end-13 xl:row-[3]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-md font-medium uppercase">Transfer</h2>
        <div className="rounded-md bg-background">
          {['deposit', 'withdraw'].map((thisType) => (
            <Button
              key={thisType}
              onClick={() => dispatch(setTransferType(thisType))}
              disabled={disabled}
              size="sm"
              className={cn(
                'min-w-[5em] bg-transparent text-foreground hover:bg-transparent',
                {
                  'bg-foreground text-background hover:bg-foreground':
                    thisType === transferType,
                },
              )}
            >
              {capitalize(thisType)}
            </Button>
          ))}
        </div>
      </div>

      {['base', 'quote'].map((symbolType) => {
        const isBase = symbolType === 'base';

        const symbol = isBase ? baseSymbol : quoteSymbol;
        const balanceWallet = isBase ? baseBalanceWallet : quoteBalanceWallet;
        const balanceExchange = isBase
          ? baseBalanceExchange
          : quoteBalanceExchange;
        const openDialog = isBase ? openBaseDialog : openQuoteDialog;
        const setOpenDialog = isBase ? setOpenBaseDialog : setOpenQuoteDialog;

        return (
          <TransferToken
            key={symbolType}
            transferType={transferType}
            symbolType={symbolType}
            symbol={symbol}
            balanceWallet={balanceWallet}
            balanceExchange={balanceExchange}
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
            dispatchTransfer={dispatchTransfer}
            disabled={disabled}
            pendingTransferOf={pendingTransferOf}
          />
        );
      })}
    </div>
  );
}

function TransferToken({
  transferType,
  symbolType,
  symbol,
  balanceWallet,
  balanceExchange,
  openDialog,
  setOpenDialog,
  dispatchTransfer,
  disabled,
  pendingTransferOf,
}) {
  const tokenIndexValue = symbolType === 'base' ? 0 : 1;
  const hasPendingTransfer = pendingTransferOf === symbolType;
  const noBalance =
    (transferType === 'deposit' && !balanceWallet) ||
    (transferType === 'withdraw' && !balanceExchange);

  return (
    <>
      <div className="flex items-center justify-between pt-[0] pb-[0.75em] pl-[0]">
        <p>
          <span className="text-muted-foreground">Token</span>
          <br />
          {symbol ? (
            <>
              <img
                src={tokenLogos[symbol]}
                alt={symbol}
                className="float-left my-[0] mt-0.5 mr-[0.4em] ml-[0] h-[20px] grayscale-[100%] filter"
              />
              {symbol}
            </>
          ) : (
            '-'
          )}
        </p>
        <p className="text-right">
          <span className="text-muted-foreground">Wallet</span>
          <br />
          {balanceWallet >= 0 ? formatAmount(balanceWallet) : '-'}
        </p>
        <p className="text-right">
          <span className="text-muted-foreground">Exchange</span>
          <br />
          {balanceExchange >= 0 ? formatAmount(balanceExchange) : '-'}
        </p>
      </div>

      <form onSubmit={dispatchTransfer}>
        <fieldset disabled={disabled}>
          <Input type="hidden" name="tokenIdx" value={tokenIndexValue} />

          <label>
            <Input
              name="tokenAmount"
              type="number"
              required
              placeholder="0.00"
              min="0.01"
              step="0.01"
              max={
                transferType == 'deposit'
                  ? formatAmount(balanceWallet, 2, false)
                  : formatAmount(balanceExchange, 2, false)
              }
              className="my-[0.75em] text-right"
            />
          </label>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <Tooltip>
              <TooltipTrigger asChild className="disabled:pointer-events-auto">
                <Button
                  type="submit"
                  disabled={noBalance || hasPendingTransfer}
                  className="mx-[auto] my-[0.75em] w-full"
                >
                  {hasPendingTransfer ? (
                    <Loading text="Pending confirmation" />
                  ) : (
                    `${capitalize(transferType)} ${symbol}`
                  )}
                </Button>
              </TooltipTrigger>
              {noBalance && (
                <TooltipContent>
                  Your {transferType == 'deposit' ? 'wallet' : 'exchange'}{' '}
                  <b>{symbol}</b> balance is 0.
                  {transferType == 'deposit' && (
                    <div>
                      Click{' '}
                      <DialogTrigger asChild>
                        <span className="cursor-pointer font-bold">here</span>
                      </DialogTrigger>{' '}
                      to get test tokens.
                    </div>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
            {noBalance && (
              <GetTokens
                tokenIdx={tokenIndexValue}
                openDialog={openDialog}
                setOpenDialog={setOpenDialog}
              />
            )}
          </Dialog>
        </fieldset>
      </form>

      {symbolType === 'base' && <hr className="mx-[auto] my-[1.75em]" />}
    </>
  );
}
