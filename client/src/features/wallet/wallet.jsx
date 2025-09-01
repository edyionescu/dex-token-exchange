import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WalletDetails } from './wallet-details';
import { connectToProvider } from './wallet-utils';

export function Wallet() {
  const dispatch = useDispatch();
  const { providers, connectedWallet, userAccount } = useSelector(
    (state) => state.wallet,
  );

  useEffect(
    function tryAutoConnect() {
      async function run() {
        if (providers.length > 0) {
          for (const { provider, info } of providers) {
            const connected = await connectToProvider(
              { provider, info, requestAccounts: false },
              dispatch,
            );
            if (connected) {
              break;
            }
          }
        }
      }
      run().catch(console.error);
    },
    [providers, dispatch],
  );

  return (
    <>
      {connectedWallet.info && userAccount ? (
        <WalletDetails />
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button>Connect wallet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect your wallet</DialogTitle>
            </DialogHeader>

            <div className="mt-2 mb-3 flex justify-center text-sm text-muted-foreground">
              {providers.length ? (
                providers.map(({ info, provider }) => (
                  <DialogClose asChild key={info.uuid}>
                    <Button
                      onClick={() =>
                        connectToProvider(
                          { provider, info, requestAccounts: true },
                          dispatch,
                        )
                      }
                      variant="outline"
                      className="mx-3 my-1 h-auto w-32 py-4"
                    >
                      <span className="text-center">
                        <img
                          src={info.icon}
                          alt={info.name}
                          className="m-auto mb-2 block w-12"
                        />
                        {info.name}
                      </span>
                    </Button>
                  </DialogClose>
                ))
              ) : (
                <div className="mt-2 mb-5">
                  Install{' '}
                  <a href="https://metamask.io/download" target="_blank">
                    <b>
                      MetaMask{' '}
                      <SquareArrowOutUpRight
                        size={14}
                        className="inline-block"
                      />
                    </b>
                  </a>{' '}
                  to connect to the app.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
