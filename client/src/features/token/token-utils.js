import { toTokens } from '@/lib/helpers';
import { Contract } from 'ethers';
import { resetTokens, setContracts, setInfo } from './token-slice';

import TOKEN_ABI from '@/lib/contracts/abi/Token.json';

export async function fetchTokenBalances({
  tokenContracts,
  tokenDecimals,
  userAccount,
}) {
  const [baseTokenContract, quoteTokenContract] = tokenContracts;
  const [baseTokenDecimals, quoteTokenDecimals] = tokenDecimals;

  const balances = [
    toTokens(await baseTokenContract.balanceOf(userAccount), baseTokenDecimals),
    toTokens(
      await quoteTokenContract.balanceOf(userAccount),
      quoteTokenDecimals,
    ),
  ];

  return balances;
}

export async function fetchTokens(
  { ethersProvider, userAccount, tokenAddresses = [] },
  dispatch,
) {
  const [baseTokenAddress, quoteTokenAddress] = tokenAddresses;

  if (!baseTokenAddress || !quoteTokenAddress) {
    dispatch(resetTokens());
    return;
  }

  const baseTokenContract = new Contract(
    baseTokenAddress,
    TOKEN_ABI,
    ethersProvider,
  );

  const quoteTokenContract = new Contract(
    quoteTokenAddress,
    TOKEN_ABI,
    ethersProvider,
  );

  const contracts = [baseTokenContract, quoteTokenContract];

  const symbols = [
    await baseTokenContract.symbol(),
    await quoteTokenContract.symbol(),
  ];

  const baseTokenDecimals = Number(await baseTokenContract.decimals());
  const quoteTokenDecimals = Number(await quoteTokenContract.decimals());

  const decimals = [baseTokenDecimals, quoteTokenDecimals];

  const info = {
    symbols,
    addresses: tokenAddresses,
    decimals,
  };

  dispatch(setContracts(contracts));
  dispatch(setInfo(info));

  const balances = await fetchTokenBalances({
    tokenContracts: contracts,
    tokenDecimals: decimals,
    userAccount,
  });

  return { decimals, balances };
}
