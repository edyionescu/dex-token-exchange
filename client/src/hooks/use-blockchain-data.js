import { setBalances as setExchangeBalances } from '@/features/exchange/exchange-slice';
import {
  fetchExchange,
  fetchExchangeBalances,
} from '@/features/exchange/exchange-utils';
import { setBalances as setTokenBalances } from '@/features/token/token-slice';
import { fetchTokenBalances, fetchTokens } from '@/features/token/token-utils';
import { setUserBalance } from '@/features/wallet/wallet-slice';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { clearError, setError } from '@/features/error/error-slice';
import { contractsConfig } from '@/lib/helpers';

export const useBlockchainData = () => {
  const { userAccount, chainId, ethersProvider } = useSelector(
    (state) => state.wallet,
  );
  const { contracts: tokenContracts, decimals: tokenDecimals } = useSelector(
    (state) => state.tokens,
  );
  const { contract: exchangeContract } = useSelector((state) => state.exchange);

  const dispatch = useDispatch();

  const {
    exchange,
    tokens: { baseToken, quoteToken_1 },
  } = contractsConfig(chainId);

  useEffect(
    function fetchBlockchainData() {
      async function run() {
        if (
          ethersProvider &&
          userAccount &&
          exchange.address &&
          baseToken.address &&
          quoteToken_1.address
        ) {
          try {
            // Fetch the user's ETH balance
            const userBalance = String(
              await ethersProvider.getBalance(userAccount),
            );

            let newTokenDecimals, newTokenBalances, newExchangeBalances;

            // Load the default market pair
            const tokenAddresses = [baseToken.address, quoteToken_1.address];

            if (!tokenContracts.length) {
              const { balances, decimals } = await fetchTokens(
                {
                  ethersProvider,
                  userAccount,
                  tokenAddresses,
                },
                dispatch,
              );
              newTokenBalances = balances;
              newTokenDecimals = decimals;
            } else {
              const balances = await fetchTokenBalances({
                tokenContracts,
                tokenDecimals,
                userAccount,
              });
              newTokenBalances = balances;
            }

            if (!exchangeContract) {
              if (tokenDecimals.length || newTokenDecimals.length) {
                // Load exchange smart contract
                const { balances } = await fetchExchange(
                  {
                    ethersProvider,
                    exchangeAddress: exchange.address,
                    userAccount,
                    tokenAddresses,
                    tokenDecimals: tokenDecimals.length
                      ? tokenDecimals
                      : newTokenDecimals,
                  },
                  dispatch,
                );
                newExchangeBalances = balances;
              }
            } else {
              const balances = await fetchExchangeBalances({
                exchangeContract,
                tokenAddresses,
                tokenDecimals,
                userAccount,
              });
              newExchangeBalances = balances;
            }

            dispatch(clearError({ domain: 'blockchain' }));
            dispatch(setUserBalance(userBalance));
            dispatch(setTokenBalances(newTokenBalances));
            dispatch(setExchangeBalances(newExchangeBalances));
          } catch (error) {
            const message = 'Error fetching blockchain data.';
            dispatch(setError({ domain: 'blockchain', message }));
            if (import.meta.env.DEV) {
              console.error({ error });
            }
          }
        }
      }
      run();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      ethersProvider,
      userAccount,
      baseToken.address,
      quoteToken_1.address,
      exchange.address,
      dispatch,
    ],
  );
};
