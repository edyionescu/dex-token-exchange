import {
  addAllOrdersFromEvents,
  addCancelledOrderFromEvent,
  addCancelledOrdersFromEvents,
  addFilledOrderFromEvent,
  addFilledOrdersFromEvents,
  addOrderFromEvent,
  removePendingCancelOrder,
  removePendingFillOrder,
  setBalances as setExchangeBalances,
  setPastOrdersFetched,
} from '@/features/exchange/exchange-slice';
import { formatDateTime, toTokens } from '@/lib/helpers';
import { sleep } from '@shared/helpers';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

import { clearError, setError } from '@/features/error/error-slice';
import { fetchExchangeBalances } from '@/features/exchange/exchange-utils';
import {
  setIsPendingTokenDistribution,
  setBalances as setTokenBalances,
} from '@/features/token/token-slice';
import { fetchTokenBalances } from '@/features/token/token-utils';
import { setUserBalance } from '@/features/wallet/wallet-slice';
import useDeepCompareEffect from 'use-deep-compare-effect';

export const useEventListeners = () => {
  const { ethersProvider, userAccount, chainId } = useSelector(
    (state) => state.wallet,
  );
  const {
    contract: exchangeContract,
    orders: { shouldFetchPastOrders },
  } = useSelector((state) => state.exchange);
  const {
    contracts: tokenContracts,
    addresses: tokenAddresses,
    decimals: tokenDecimals,
  } = useSelector((state) => state.tokens);

  const dispatch = useDispatch();

  useDeepCompareEffect(
    function setupExchangeEventListener() {
      if (
        !(
          ethersProvider &&
          exchangeContract &&
          userAccount &&
          tokenAddresses.length > 0 &&
          tokenDecimals.length > 0 &&
          tokenContracts.length > 0
        )
      ) {
        return;
      }

      let tokensDistributedEventListener,
        depositEventListener,
        withdrawEventListener,
        makeOrderEventListener,
        fillOrderEventListener,
        cancelOrderEventListener;

      // Tokens distributions, deposits and withdrawals are not stored in the state,
      // so we're using a simple in-memory set to protect against duplicate event alerts
      const processedTokensDistributions = new Set();
      const processedDeposits = new Set();
      const processedWithdrawals = new Set();
      // These come in batches that last up to a few seconds, so 1 minute is a good enough interval to clear them.
      const CLEAR_INTERVAL = 60 * 1000;

      const processedTokensDistributionsInterval = setInterval(() => {
        processedTokensDistributions.clear();
      }, CLEAR_INTERVAL);

      const processedDepositsInterval = setInterval(() => {
        processedDeposits.clear();
      }, CLEAR_INTERVAL);

      const processedWithdrawalsInterval = setInterval(() => {
        processedWithdrawals.clear();
      }, CLEAR_INTERVAL);

      async function main() {
        try {
          tokensDistributedEventListener = async (...args) => {
            const event = args.at(-1); // 'event' is always the last argument
            const { transactionHash } = event.log;
            if (!processedTokensDistributions.has(transactionHash)) {
              processedTokensDistributions.add(transactionHash);

              const transferData = event.args;
              await updateBalances();
              dispatch(setIsPendingTokenDistribution(false));
              toastSuccess('Tokens added to your wallet', transferData);
            }
          };

          depositEventListener = async (...args) => {
            const event = args.at(-1);
            const { transactionHash } = event.log;
            if (!processedDeposits.has(transactionHash)) {
              processedDeposits.add(transactionHash);

              const transferData = event.args;
              await updateBalances();
              toastSuccess('Tokens deposited on the exchange', transferData);
            }
          };

          withdrawEventListener = async (...args) => {
            const event = args.at(-1);
            const { transactionHash } = event.log;
            if (!processedWithdrawals.has(transactionHash)) {
              processedWithdrawals.add(transactionHash);

              const transferData = event.args;
              await updateBalances();
              toastSuccess('Tokens withdrawn from the exchange', transferData);
            }
          };

          makeOrderEventListener = async (...args) => {
            const event = args.at(-1);
            const orderData = buildOrderFromEvent(event);
            const result = await dispatch(addOrderFromEvent(orderData));
            if (result.payload.wasAdded) {
              await updateBalances();
              toastSuccess('Order placed', orderData);
            }
          };

          fillOrderEventListener = async (...args) => {
            const event = args.at(-1);
            const orderData = buildOrderFromEvent(event);
            const result = await dispatch(addFilledOrderFromEvent(orderData));
            if (result.payload.wasAdded) {
              await updateBalances();
              toastSuccess('Order filled', orderData);
              dispatch(removePendingFillOrder(orderData.id));
            }
          };

          cancelOrderEventListener = async (...args) => {
            const event = args.at(-1);
            const orderData = buildOrderFromEvent(event);
            const result = await dispatch(
              addCancelledOrderFromEvent(orderData),
            );
            if (result.payload.wasAdded) {
              await updateBalances();
              toastSuccess('Order cancelled', orderData);
              dispatch(removePendingCancelOrder(orderData.id));
            }
          };

          // Wait for next tick before settting up event listeners.
          // Without this, some of the events are not picked up due to potential ethers.js internal causes
          await sleep(0);

          // Subscribe to Order events
          exchangeContract.on('Deposit', depositEventListener);
          exchangeContract.on('Withdraw', withdrawEventListener);
          exchangeContract.on('MakeOrder', makeOrderEventListener);
          exchangeContract.on('FillOrder', fillOrderEventListener);
          exchangeContract.on('CancelOrder', cancelOrderEventListener);

          // Listen for token distribution events
          tokenContracts.forEach((tokenContract) => {
            tokenContract.on(
              'TokensDistributed',
              tokensDistributedEventListener,
            );
          });

          // Also listen for historical events
          if (shouldFetchPastOrders) {
            const allOrders = await getPastOrdersFromEvents({
              filter: exchangeContract.filters.MakeOrder(),
            });
            dispatch(addAllOrdersFromEvents(allOrders));

            const filledOrders = await getPastOrdersFromEvents({
              filter: exchangeContract.filters.FillOrder(),
            });
            dispatch(addFilledOrdersFromEvents(filledOrders));

            const cancelledOrders = await getPastOrdersFromEvents({
              filter: exchangeContract.filters.CancelOrder(),
            });
            dispatch(addCancelledOrdersFromEvents(cancelledOrders));

            dispatch(setPastOrdersFetched());
            dispatch(clearError({ domain: 'eventListeners' }));
          }
        } catch (error) {
          const message = 'Error setting up event listeners.';
          dispatch(setError({ domain: 'eventListeners', message }));
          if (import.meta.env.DEV) {
            console.error({ error });
          }
        }
      }

      main();

      async function updateBalances() {
        const userBalance = String(
          await ethersProvider.getBalance(userAccount),
        );
        const tokenBalances = await fetchTokenBalances({
          tokenContracts,
          tokenDecimals,
          userAccount,
        });
        const exchangeBalances = await fetchExchangeBalances({
          exchangeContract,
          tokenAddresses,
          tokenDecimals,
          userAccount,
        });

        dispatch(setUserBalance(userBalance));
        dispatch(setTokenBalances(tokenBalances));
        dispatch(setExchangeBalances(exchangeBalances));
      }

      async function getEventsByFilter({ filter }) {
        const currentBlock = await ethersProvider.getBlockNumber();

        const onLocalhost = chainId === 31337 || chainId === 31338; // 31337 (Hardhat), 31338 (Foundry)

        const fromBlock = onLocalhost
          ? // Start from the last 2000 blocks on localhost
            Math.max(0, currentBlock - 2000)
          : // and from block 9_088_971 on blockchain, where the deployment and initial seeding happened
            // https://sepolia.etherscan.io/tx/0x59aeaa90195bcda80dd98c61b73e1ff2b16bb4bc1489d5e5ea2b0cd69d6a1a42
            9_088_971;

        const pastEvents = await exchangeContract.queryFilter(
          filter,
          fromBlock,
          currentBlock,
        );

        return pastEvents;
      }

      async function getPastOrdersFromEvents({ filter }) {
        const pastEvents = await getEventsByFilter({
          filter,
        });

        return pastEvents.map(buildOrderFromEvent);
      }

      function buildOrderFromEvent(event) {
        const {
          args: {
            id,
            maker,
            taker,
            tokenGive,
            amountGive,
            tokenGet,
            amountGet,
            createdAt,
          },
        } = event;

        const blockNumber = event.log?.blockNumber ?? event?.blockNumber;
        const logIndex = event.log?.index ?? event?.index;
        const transactionIndex =
          event.log?.transactionIndex ?? event?.transactionIndex;
        const transactionHash =
          event.log?.transactionHash ?? event?.transactionHash;

        let orderData;

        try {
          const tokenGiveIdx = tokenAddresses.indexOf(tokenGive);
          const tokenGetIdx = tokenAddresses.indexOf(tokenGet);
          const timestamp = Number(createdAt);

          orderData = {
            id: id.toString(),
            maker,
            taker,
            tokenGive,
            amountGive: toTokens(amountGive, tokenDecimals[tokenGiveIdx]),
            tokenGet,
            amountGet: toTokens(amountGet, tokenDecimals[tokenGetIdx]),
            createdAt: timestamp,
            createdAtFmt: formatDateTime(timestamp),
            blockNumber,
            logIndex,
            transactionIndex,
            transactionHash,
          };
        } catch (err) {
          console.error('Error building order data:', err);
        }

        return orderData;
      }

      function toastSuccess(message, { maker, taker, user }) {
        if (message && [maker, taker, user].includes(userAccount)) {
          toast.success(message);
        }
      }

      // Cleanup event listeners
      return () => {
        if (tokenContracts.length > 0) {
          if (tokensDistributedEventListener) {
            tokenContracts.forEach((tokenContract) => {
              tokenContract.off(
                'TokensDistributed',
                tokensDistributedEventListener,
              );
            });
          }
        }

        if (exchangeContract) {
          if (depositEventListener) {
            exchangeContract.off('Deposit', depositEventListener);
          }
          if (withdrawEventListener) {
            exchangeContract.off('Withdraw', withdrawEventListener);
          }
          if (makeOrderEventListener) {
            exchangeContract.off('MakeOrder', makeOrderEventListener);
          }
          if (fillOrderEventListener) {
            exchangeContract.off('FillOrder', fillOrderEventListener);
          }
          if (cancelOrderEventListener) {
            exchangeContract.off('CancelOrder', cancelOrderEventListener);
          }
        }

        if (processedTokensDistributionsInterval) {
          clearInterval(processedTokensDistributionsInterval);
        }
        if (processedDepositsInterval) {
          clearInterval(processedDepositsInterval);
        }
        if (processedWithdrawalsInterval) {
          clearInterval(processedWithdrawalsInterval);
        }
      };
    },
    [
      ethersProvider,
      exchangeContract,
      userAccount,
      chainId,
      tokenAddresses,
      tokenDecimals,
      tokenContracts,
      shouldFetchPastOrders,
      dispatch,
    ],
  );
};
