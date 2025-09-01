import hre from 'hardhat';
import { sleep } from '../../lib/helpers.js';

const { ethers } = hre;

export async function withRetries(fn) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        await sleep(5); // Wait 5 seconds before retrying
      }
      const tx = await fn();
      const receipt = await tx.wait();
      return { ...receipt, errorMessage: '' };
    } catch (error) {
      if (i === maxRetries - 1) {
        const errorMessage = `Transaction failed on attempt ${maxRetries} with ${error.message}`;
        return { wait: async () => {}, blockNumber: 'SKIPPED', errorMessage }; // Return a mock transaction object
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
