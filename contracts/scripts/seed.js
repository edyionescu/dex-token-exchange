import { time } from '@nomicfoundation/hardhat-network-helpers';
import hre from 'hardhat';
import { formatAmount, sleep, toUnits } from '../../lib/helpers.js';
import {
  blockTimestamp,
  getRandomFloat,
  getRandomInt,
  next30MinTimestamp,
  now,
  withRetries,
} from '../lib/helpers.js';

import { dExmEthOHLC } from './ohlc-data/dEx-mEth.js';
import { dExmLinkOHLC } from './ohlc-data/dEx-mLink.js';
const { default: CONTRACTS_CONFIG } = await import('../../client/src/lib/contracts/contracts.config.json', {
  with: { type: 'json' },
});

const { ethers } = hre;
const { toBigInt } = ethers;

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const onLocalhost = chainId === toBigInt(31337) || chainId === toBigInt(31338); // 31337 (Hardhat), 31338 (Foundry)
  const onBlockchain = !onLocalhost;
  const delay = onBlockchain ? sleep : (s) => time.increase(s);
  const goToNext30MinMark = onBlockchain
    ? async () => {
        const now = new Date();
        const nextTimestamp = next30MinTimestamp(now / 1000);
        const secondsUntilNext = nextTimestamp - now.getTime() / 1000;
        await sleep(secondsUntilNext);
      }
    : async () => {
        const currentTimestamp = await time.latest();
        const nextTimestamp = next30MinTimestamp(currentTimestamp);
        return time.increaseTo(nextTimestamp);
      };

  console.clear() ||
    console.log(`🚀 Initiate seeding on ${onBlockchain ? 'blockchain' : 'localhost'}/${chainId}...`);

  const {
    exchange: { address: exchangeAddress },
    tokens: {
      baseToken: { address: dExAddress },
      quoteToken_1: { address: mEthAddress },
      quoteToken_2: { address: mLinkAddress },
    },
  } = CONTRACTS_CONFIG[chainId];

  const [deployer, feeAccount, client1, client2] = await ethers.getSigners();
  const owner = deployer;

  const exchange = await ethers.getContractAt('Exchange', exchangeAddress);
  const dEx = await ethers.getContractAt('Token', dExAddress);
  const mEth = await ethers.getContractAt('Token', mEthAddress);
  const mLink = await ethers.getContractAt('Token', mLinkAddress);

  const dExDecimals = Number(await dEx.decimals());
  const mEthDecimals = Number(await mEth.decimals());
  const mLinkDecimals = Number(await mLink.decimals());

  console.log(`
    Exchange fetched from: ${exchange.target}`);
  console.log(`
    dEx fetched from:     ${dEx.target}`);
  console.log(`
    mEth fetched from:     ${mEth.target}`);
  console.log(`
    mLink fetched from:     ${mLink.target}`);

  console.log(`
    ====================== DISTRIBUTE TOKENS ======================`);

  const distribute_dEx = 6_000;
  const distribute_mEth = 10_000;
  const distribute_mLink = 10_000;

  for await (const [idx, client] of [client1, client2].entries()) {
    console.log(`
    > Client${idx + 1}:`);

    let tx;
    tx = await withRetries(() =>
      dEx.connect(owner).transfer(client.address, toUnits(distribute_dEx, dExDecimals, ethers))
    );
    console.log(
      `
      Transfer ${distribute_dEx} dEx - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() =>
      mEth.connect(owner).transfer(client.address, toUnits(distribute_mEth, mEthDecimals, ethers))
    );
    console.log(
      `
      Transfer ${distribute_mEth} mEth - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() =>
      mLink.connect(owner).transfer(client.address, toUnits(distribute_mLink, mLinkDecimals, ethers))
    );
    console.log(
      `
      Transfer ${distribute_mLink} mLink - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );
  }

  console.log(`
    ======================== DEPOSIT TOKENS =======================`);

  const deposit_dEx = distribute_dEx / 2;
  const deposit_dEx_units = toUnits(deposit_dEx, dExDecimals, ethers);

  const deposit_mEth = distribute_mEth / 2;
  const deposit_mEth_units = toUnits(deposit_mEth, mEthDecimals, ethers);

  const deposit_mLink = distribute_mLink / 2;
  const deposit_mLink_units = toUnits(deposit_mLink, mLinkDecimals, ethers);

  for await (const [idx, client] of [client1, client2].entries()) {
    console.log(`
    > Client${idx + 1}:`);

    let tx;
    tx = await withRetries(() => dEx.connect(client).approve(exchange.target, deposit_dEx_units));
    console.log(
      `
      Approve ${deposit_dEx} dEx - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() => exchange.connect(client).deposit(dEx.target, deposit_dEx_units));
    console.log(
      `
      Deposit ${deposit_dEx} dEx - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() => mEth.connect(client).approve(exchange.target, deposit_mEth_units));
    console.log(
      `
      Approve ${deposit_mEth} mEth - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() => exchange.connect(client).deposit(mEth.target, deposit_mEth_units));
    console.log(
      `
      Deposit ${deposit_mEth} mEth - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() => mLink.connect(client).approve(exchange.target, deposit_mLink_units));
    console.log(
      `
      Approve ${deposit_mLink} mLink - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );

    tx = await withRetries(() => exchange.connect(client).deposit(mLink.target, deposit_mLink_units));
    console.log(
      `
      Deposit ${deposit_mLink} mLink - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );
  }

  console.log(`
    ========================= CANCEL ORDER ========================`);

  // Client1 makes an order and then cancels it
  let tx = await withRetries(() =>
    exchange
      .connect(client1)
      .makeOrder(mEth.target, toUnits(100, mEthDecimals, ethers), dEx.target, toUnits(5, dExDecimals, ethers))
  );
  console.log(
    `
      Client1 makes an order - ${await blockTimestamp(tx.blockNumber)}`,
    tx.errorMessage
  );

  if (!tx.errorMessage) {
    let orderId = await exchange.getOrderCount();
    tx = await withRetries(() => exchange.connect(client1).cancelOrder(orderId));
    console.log(
      `
      Client1 cancels the order - ${await blockTimestamp(tx.blockNumber)}`,
      tx.errorMessage
    );
  }

  console.log(`
    ========================= TRADE BOOK =========================`);

  // Generate random dEx/mEth orders from the mock OHLC data and add them to the exchange as a starting point.
  // The OHLC data will be recreated on the frontend from these orders and displayed on the candlestick chart
  function generateOrdersFromOHLC(ohlcSets, quoteContract) {
    let result = [];

    ohlcSets.forEach((set) => {
      const { y: ohlc = [] } = set;
      result = [
        ...result,
        ...ohlc.map((price) => {
          const dExs = quoteContract === mEth ? getRandomInt(1, 10) : getRandomFloat(0.1, 1, 1);
          const quoteAmount = formatAmount(dExs * price);
          const type = ['sell', 'buy'][getRandomInt(0, 1)];
          const maker = [client1, client2][getRandomInt(0, 1)];

          return {
            icon: type === 'buy' ? '🟢' : '🔴',
            type,
            dExs,
            [quoteContract === mEth ? 'mEths' : 'mLinks']: quoteAmount,
            maker,
          };
        }),
      ];
    });

    return result;
  }

  const dExmEthOrders = generateOrdersFromOHLC(dExmEthOHLC[0].data, mEth);
  const dExmLinkOrders = generateOrdersFromOHLC(dExmLinkOHLC[0].data, mLink);
  const ordersToFill = [...dExmLinkOrders, ...dExmEthOrders];

  await goToNext30MinMark();

  for await (const [index, order] of ordersToFill.entries()) {
    const { icon, type, dExs, mEths, mLinks, maker } = order;

    const quoteContract = mEths > 0 ? mEth : mLink;
    const quoteContractDecimals = mEths > 0 ? mEthDecimals : mLinkDecimals;
    const quoteSymbol = mEths > 0 ? 'mEth' : 'mLink';
    const quoteAmount = mEths > 0 ? mEths : mLinks;

    const tokenGet = type === 'buy' ? dEx.target : quoteContract.target;
    const tokenGetDecimals = type === 'buy' ? dExDecimals : quoteContractDecimals;
    const amountGet = type === 'buy' ? dExs : quoteAmount;

    const tokenGive = type === 'sell' ? dEx.target : quoteContract.target;
    const tokenGiveDecimals = type === 'sell' ? dExDecimals : quoteContractDecimals;
    const amountGive = type === 'sell' ? dExs : quoteAmount;

    // Maker creates order
    let tx = await withRetries(() =>
      exchange
        .connect(maker)
        .makeOrder(
          tokenGet,
          toUnits(amountGet, tokenGetDecimals, ethers),
          tokenGive,
          toUnits(amountGive, tokenGiveDecimals, ethers)
        )
    );

    if (!tx.errorMessage) {
      await delay(60 * 1); // Wait 1 minute before filling the order

      // Taker fills order
      const taker = maker === client1 ? client2 : client1;
      const orderId = await exchange.getOrderCount();
      tx = await withRetries(() => exchange.connect(taker).fillOrder(orderId));

      console.log(
        `
      ${index + 1}. ${icon} ${
          maker === client1 ? 'Client1' : 'Client2'
        } ${type}s ${dExs} dEx for ${quoteAmount} ${quoteSymbol} - ${await blockTimestamp(tx.blockNumber)}`,
        tx.errorMessage
      );
    }

    if (index !== ordersToFill.length - 1 && (index + 1) % 4 === 0) {
      console.log(`
    > Start filling the next 4 orders at the next 30 minutes mark - ${now()}
    `);
      await goToNext30MinMark();
    }
  }

  console.log(`
    ========================= OPEN ORDERS =========================`);

  async function createOpenOrders(mockData, quoteContract) {
    const lastSet = mockData.at(-1);
    const { y: ohlc = [] } = lastSet;
    const close = ohlc.at(-1);

    let countBuy = 0;
    let countSell = 0;
    let type;

    // Each client opens 10 random orders
    const totalOrders = 10;
    for await (const [idx, client] of [client1, client2].entries()) {
      console.log(`
      > Client${idx + 1}:`);

      for (let index = 1; index <= totalOrders; index++) {
        const dExs = quoteContract === mEth ? getRandomInt(1, 10) : getRandomFloat(0.1, 1, 1);
        const price = getRandomFloat(close - 0.5, close + 0.5);
        const quoteAmount = formatAmount(dExs * price);

        if (countBuy === totalOrders || countSell === totalOrders) {
          if (countBuy === totalOrders) {
            type = 'sell';
          }
          if (countSell === totalOrders) {
            type = 'buy';
          }
        } else {
          type = ['sell', 'buy'][getRandomInt(0, 1)];
        }

        if (type === 'buy') {
          countBuy++;
        } else {
          countSell++;
        }

        const icon = type === 'buy' ? '🟢' : '🔴';

        const quoteContractDecimals = quoteContract === mEth ? mEthDecimals : mLinkDecimals;

        const tokenGet = type === 'buy' ? dEx.target : quoteContract.target;
        const tokenGetDecimals = type === 'buy' ? dExDecimals : quoteContractDecimals;
        const amountGet = type === 'buy' ? dExs : quoteAmount;

        const tokenGive = type === 'sell' ? dEx.target : quoteContract.target;
        const tokenGiveDecimals = type === 'sell' ? dExDecimals : quoteContractDecimals;
        const amountGive = type === 'sell' ? dExs : quoteAmount;

        let tx;
        tx = await withRetries(() =>
          exchange
            .connect(client)
            .makeOrder(
              tokenGet,
              toUnits(amountGet, tokenGetDecimals, ethers),
              tokenGive,
              toUnits(amountGive, tokenGiveDecimals, ethers)
            )
        );

        console.log(
          `
        Opens order to ${type} ${dExs} dEx for ${quoteAmount} ${
            quoteContract === mEth ? 'mEth' : 'mLink'
          } - ${await blockTimestamp(tx.blockNumber)}`,
          tx.errorMessage
        );

        await delay(60); // Wait 1 minute before opening the next order
      }
    }
  }

  console.log(`
    > Start opening dEx/mEth orders`);
  await createOpenOrders(dExmEthOHLC[0].data, mEth);

  console.log(`
    > Start opening dEx/mLink orders`);
  await createOpenOrders(dExmLinkOHLC[0].data, mLink);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
