// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('Contracts', (m) => {
  const deployer = m.getAccount(0);
  const initialOwner = deployer;
  const initialSupply = 1_000_000;
  const recipient = initialOwner;
  const faucetDailyLimit = {
    dEx: 5,
    mEth: 20,
    mLink: 100,
  };

  const feeAccount = m.getAccount(1);
  const feePercentage = 10; // 10% fee

  const baseToken = m.contract(
    'Token',
    ['DEX', 'dEx', recipient, initialOwner, initialSupply, faucetDailyLimit.dEx],
    {
      id: 'token_dEx',
    }
  );

  const quoteToken_1 = m.contract(
    'Token',
    ['Mock ETH', 'mEth', recipient, initialOwner, initialSupply, faucetDailyLimit.mEth],
    {
      id: 'token_mEth',
    }
  );

  const quoteToken_2 = m.contract(
    'Token',
    ['Mock LINK', 'mLink', recipient, initialOwner, initialSupply, faucetDailyLimit.mLink],
    {
      id: 'token_mLink',
    }
  );

  const exchange = m.contract('Exchange', [initialOwner, feeAccount, feePercentage], {
    id: 'exchange',
  });

  return { baseToken, quoteToken_1, quoteToken_2, exchange };
});
