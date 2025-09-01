require('@nomicfoundation/hardhat-toolbox');
require('hardhat-abi-exporter');

// To set a variable, run `npx hardhat vars set INFURA_API_KEY`
const { vars } = require('hardhat/config');

// Etherscan API key is required to verify the contracts on Etherscan
const ETHERSCAN_API_KEY = vars.get('ETHERSCAN_API_KEY');

// Alchemy API key is required to interact with their nodes, mainly during deployment
const ALCHEMY_API_KEY = vars.get('DEX_ALCHEMY_API_KEY');
const SEPOLIA_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Deploying the contracts requires a deployer account that must be funded with ETH
const DEPLOYER = vars.get('DEPLOYER');
// The fee account is used to collect fees from order takers
const FEES = vars.get('FEES');

// The externally owned accounts are used for seeding the exchange with initial liquidity
// They also need to be funded with ETH to pay for gas
const EOA_1 = vars.get('EOA_1');
const EOA_2 = vars.get('EOA_2');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.28',
    settings: {
      evmVersion: 'cancun',
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    // Doesn't need an API key
    enabled: true,
  },
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    localhost_foundry: {
      url: 'http://127.0.0.1:8546',
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [DEPLOYER, FEES, EOA_1, EOA_2],
    },
  },
  paths: {
    sources: './src',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  abiExporter: [
    {
      runOnCompile: true,
      path: '../client/src/lib/contracts/abi',
      only: [':Token$', ':Exchange$'],
      format: 'fullName',
      clear: true,
      flat: true,
      spacing: 2,
    },
  ],
};
