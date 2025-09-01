import { toTokens } from '@/lib/helpers';
import { Contract } from 'ethers';
import { setContract } from './exchange-slice';

import EXCHANGE_ABI from '@/lib/contracts/abi/Exchange.json';

export async function fetchExchangeBalances({
  exchangeContract,
  tokenAddresses,
  tokenDecimals,
  userAccount,
}) {
  const [baseTokenAddress, quoteTokenAddress] = tokenAddresses;
  const [baseTokenDecimals, quoteTokenDecimals] = tokenDecimals;

  const balances = [
    toTokens(
      await exchangeContract.balanceOf(baseTokenAddress, userAccount),
      baseTokenDecimals,
    ),

    toTokens(
      await exchangeContract.balanceOf(quoteTokenAddress, userAccount),
      quoteTokenDecimals,
    ),
  ];

  return balances;
}

export async function fetchExchange(
  {
    ethersProvider,
    exchangeAddress,
    userAccount,
    tokenAddresses = [],
    tokenDecimals = [],
  },
  dispatch,
) {
  const exchangeContract = new Contract(
    exchangeAddress,
    EXCHANGE_ABI,
    ethersProvider,
  );

  dispatch(setContract(exchangeContract));

  const balances = await fetchExchangeBalances({
    exchangeContract,
    tokenAddresses,
    tokenDecimals,
    userAccount,
  });

  return { balances };
}
