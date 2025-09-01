import { formatAmount } from '@shared/helpers';
import { formatUnits } from 'ethers';
import CONTRACTS_CONFIG from './contracts/contracts.config.json';

export function formatAddress(address) {
  if (!address) {
    return '';
  }

  // e.g. 0xf39f...2266
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function toHex(number) {
  number = Number(number);

  if (number <= 0) {
    return '';
  }

  // localhost chainId 31337 -> 0x7a69
  return '0x' + number.toString(16);
}

export function formatEthAmount(val) {
  if (!Number(val)) {
    return '0 ETH';
  }

  const GWEI = 10 ** 9;
  const ETHER = 10 ** 18;

  const maximumFractionDigits = 4;
  const useGrouping = false;
  const roundingMode = 'halfExpand';

  if (val < 0.0001 * GWEI) {
    return `${formatAmount(formatUnits(val, 'wei'), maximumFractionDigits, useGrouping, roundingMode)} Wei`;
  } else if (val < 0.0001 * ETHER) {
    return `${formatAmount(formatUnits(val, 'gwei'), maximumFractionDigits, useGrouping, roundingMode)} Gwei`;
  }

  return `${formatAmount(formatUnits(val, 'ether'), maximumFractionDigits, useGrouping, roundingMode)} ETH`;
}

export function formatDateTime(
  timestamp,
  { dateStyle = 'short', timeStyle = 'short' } = {},
) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle,
    ...(timeStyle && {
      timeStyle,
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // current timezone
    }),
  });

  return formatter.format(new Date(timestamp * 1000));
}

export function getDateParts(timestamp) {
  const date = new Date(timestamp * 1000);

  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    year: date.getFullYear(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
  };
}

export function contractsConfig(chainId) {
  const config = CONTRACTS_CONFIG[chainId] ?? {
    network: {
      name: '',
      explorerUrl: '',
    },
    exchange: {
      address: '',
    },
    tokens: {
      baseToken: {
        symbol: '',
        address: '',
      },
      quoteToken_1: {
        symbol: '',
        address: '',
      },
      quoteToken_2: {
        symbol: '',
        address: '',
      },
    },
  };

  config.supportedChains = Object.keys(CONTRACTS_CONFIG).filter((key) => {
    const {
      exchange,
      tokens: { baseToken, quoteToken_1, quoteToken_2 },
    } = CONTRACTS_CONFIG[key];
    return (
      exchange.address &&
      baseToken.address &&
      quoteToken_1.address &&
      quoteToken_2.address
    );
  });

  return config;
}

export function toTokens(num, decimals = 18) {
  return Number(formatUnits(num.toString(), decimals));
}

export function getErrorMessage({
  error,
  contract,
  tokenSymbol,
  tokenDecimals,
}) {
  let result = error.shortMessage ?? error.message;

  if (
    error.code === 'ACTION_REJECTED' &&
    error.action === 'sendTransaction' &&
    error.reason === 'rejected'
  ) {
    result = 'Transaction signature denied.';
    return result;
  }

  const customErrorSelector = error.data ?? '';

  if (customErrorSelector) {
    const customErrorDescription =
      contract.interface.parseError(customErrorSelector);

    switch (customErrorDescription.name) {
      // Get tokens
      case 'Token__AmountNotGreaterThanZero':
        result = 'The requested amount must be greater than zero.';
        break;

      case 'Token__DailyLimitExceeded': {
        const { amount, dailyLimit } = customErrorDescription.args;
        result = `DailyLimitExceeded: The requested amount of ${toTokens(amount, tokenDecimals)} ${tokenSymbol} exceeds the daily limit of ${toTokens(dailyLimit, tokenDecimals)} ${tokenSymbol}.`;
        break;
      }

      // Make order
      case 'Exchange__InsufficientBalancToMakeOrder': {
        const { balance, amount } = customErrorDescription.args;
        result = `Your current balance is ${toTokens(balance, tokenDecimals)} ${tokenSymbol}.
            Make a deposit of  ${formatAmount(toTokens(amount - balance, tokenDecimals))} ${tokenSymbol} or more to continue.`;
        break;
      }

      // Transfer tokens
      case 'Exchange__TransferFailed': {
        const { transferType } = customErrorDescription.args;
        result = `Token ${Number(transferType) === 0 ? 'deposit' : 'withdrawal'} failed.`;
        break;
      }

      // Withdraw tokens
      case 'Exchange__InsufficientBalanceToWithdraw': {
        const { balance, amount } = customErrorDescription.args;
        result = `Your request to withdraw ${toTokens(amount, tokenDecimals)} ${tokenSymbol} exceeds your current balance of ${toTokens(balance, tokenDecimals)} ${tokenSymbol}.`;
        break;
      }

      // Cancel order
      case 'Exchange__UnauthorizedClient': {
        result = `You are not authorized to perform this action.`;
        break;
      }

      // Cancel/Fill order
      case 'Exchange__InvalidOrder': {
        const { id } = customErrorDescription.args;
        result = `The order with id ${id} does not exist.`;
        break;
      }
      case 'Exchange__OrderAlreadyCancelled': {
        const { id } = customErrorDescription.args;
        result = `The order with id ${id} has already been cancelled.`;
        break;
      }
      case 'Exchange__OrderAlreadyFilled': {
        const { id } = customErrorDescription.args;
        result = `The order with id ${id} has already been filled.`;
        break;
      }

      // Fill order
      case 'Exchange__InsufficientBalanceToFillOrder': {
        const { balance, amount } = customErrorDescription.args;
        result = `Your request to fill the order exceeds your current balance of ${toTokens(balance, tokenDecimals)} ${tokenSymbol}.
          The required amount is ${toTokens(amount, tokenDecimals)} ${tokenSymbol}.`;
        break;
      }

      default:
        break;
    }
  }

  return result;
}
