import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { resetExchange } from '@/features/exchange/exchange-slice';
import { resetTokens } from '@/features/token/token-slice';
import { contractsConfig, formatAddress, formatEthAmount } from '@/lib/helpers';
import { Check, Copy, Unplug } from 'lucide-react';
import { useState } from 'react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useDispatch, useSelector } from 'react-redux';
import { disconnectWallet } from './wallet-slice';

export function WalletDetails() {
  const initialButtonCopyText = 'Copy address';
  const [buttonCopyText, setButtonCopyText] = useState(initialButtonCopyText);

  const { connectedWallet, userAccount, userBalance, chainId } = useSelector(
    (state) => state.wallet,
  );

  const dispatch = useDispatch();

  const {
    info: { name: walletName, icon: walletIcon },
  } = connectedWallet;

  const {
    network: { explorerUrl },
  } = contractsConfig(chainId);

  function copyAddress() {
    navigator.clipboard.writeText(userAccount);
    setButtonCopyText('Copied!');
    setTimeout(() => {
      setButtonCopyText(initialButtonCopyText);
    }, 1500);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex cursor-default items-center rounded-md bg-sidebar-accent">
          <p className="mx-auto my-0 px-3 py-2 text-sm font-medium">
            {formatEthAmount(userBalance)}
          </p>
          <Button className="px-3 py-2">
            <span className="leading-none">
              <Jazzicon
                diameter={16}
                seed={jsNumberForAddress(userAccount)}
              />{' '}
            </span>
            {formatAddress(userAccount)}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="items-center">
          <DialogTitle>
            <p className="text-sm text-muted-foreground">
              Connected with {walletName}
              <img
                src={walletIcon}
                alt={walletName}
                className="ml-2 inline-block h-4 w-4"
              />
            </p>
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 text-center">
          <Jazzicon diameter={72} seed={jsNumberForAddress(userAccount)} />
          <div className="pt-2 pb-1 text-lg leading-none font-semibold">
            {explorerUrl.length ? (
              <a
                href={`${explorerUrl}/address/${userAccount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600"
              >
                {formatAddress(userAccount)}
              </a>
            ) : (
              formatAddress(userAccount)
            )}
          </div>
          <span className="text-base text-muted-foreground">
            {formatEthAmount(userBalance)}
          </span>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={copyAddress} variant="outline">
            {buttonCopyText === initialButtonCopyText ? <Copy /> : <Check />}
            {buttonCopyText}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Unplug />
                Disconnect wallet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader className="items-center">
                <AlertDialogTitle>Disconnect wallet?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    dispatch(disconnectWallet());
                    dispatch(resetTokens());
                    dispatch(resetExchange());
                  }}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
