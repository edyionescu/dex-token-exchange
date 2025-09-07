import hre from 'hardhat';
import { sleep } from '../../lib/helpers.js';

const { ethers } = hre;

export async function buildTxParams(owner) {
  try {
    const feeData = await owner.provider.getFeeData();
    const txParams = {
      maxFeePerGas: (feeData.maxFeePerGas * 150n) / 100n, // 50% higher
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 150n) / 100n, // 50% higher
    };

    return txParams;
  } catch (error) {
    return {};
  }
}

export async function withRetries(fn, logtoConsole = false) {
  const maxRetries = 3;
  const timeoutMs = 5 * 60 * 1000; // 5 minutes timeout

  function mockTx(errorMessage) {
    // Return a mock transaction object
    return { wait: async () => {}, blockNumber: 'SKIPPED', errorMessage };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mempoolTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MEMPOOL_TIMEOUT')), timeoutMs);
      });

      if (attempt > 1) {
        logtoConsole && console.log(`${now()} - Waiting 5 seconds before retrying...`);
        await sleep(5); // Wait 5 seconds before retrying after a failed attempt
      }

      // Don't wait more than 5 minutes (timeoutMs) for the transaction to be sent
      const tx = await Promise.race([fn(), mempoolTimeoutPromise]);
      logtoConsole &&
        console.log(`${now()} - Transaction sent to the mempool, waiting to be included in the chain...`);

      // If there's a wait method, check it with a fresh timeout
      if (tx && typeof tx.wait === 'function') {
        const blockchainTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('BLOCKCHAIN_TIMEOUT')), timeoutMs);
        });

        const receipt = await Promise.race([tx.wait(), blockchainTimeoutPromise]);
        logtoConsole && console.log(`${now()} - Transaction mined`);

        return { ...receipt, errorMessage: '' };
      }

      return { ...result, errorMessage: '' };
    } catch (error) {
      // If it's a timeout, don't retry - just exit and move on
      if (error.message === 'MEMPOOL_TIMEOUT' || error.message === 'BLOCKCHAIN_TIMEOUT') {
        const errorMessage = `${error.message}: Operation timed out after ${timeoutMs}ms on attempt ${attempt}`;
        return mockTx(errorMessage);
      }

      logtoConsole && console.log(`${now()} - Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        const errorMessage = `Transaction failed on attempt ${attempt} with ${error.message}`;
        return mockTx(errorMessage);
      }
    }
  }
}

export async function blockTimestamp(blockNumber) {
  if (typeof blockNumber !== 'number') {
    return '';
  }

  const block = await ethers.provider.getBlock(blockNumber);
  return new Date(block.timestamp * 1000).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // current timezone
  });
}

export function next30MinTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  const currentHour = date.getHours();
  const currentMinutes = date.getMinutes();

  let targetHour = currentHour;
  let targetMinutes = 30;

  if (currentMinutes >= 30) {
    targetMinutes = 0;
    targetHour = currentHour + 1;
  }

  const next30Min = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    targetHour,
    targetMinutes,
    0,
    0
  );

  return Math.floor(next30Min.getTime() / 1000);
}

export function now() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // current timezone
  });

  return formatter.format(new Date());
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomFloat(min, max, decimals = 2) {
  const rand = Math.random() * (max - min) + min;
  const power = Math.pow(10, decimals);
  return Math.floor(rand * power) / power;
}
