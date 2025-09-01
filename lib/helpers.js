export function formatAmount(amount, maximumFractionDigits = 2, useGrouping = true, roundingMode = 'floor') {
  if (amount === undefined) {
    return '';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    useGrouping,
    minimumFractionDigits: 0,
    maximumFractionDigits,
    roundingMode,
  });

  if (!useGrouping) {
    return Number(formatter.format(amount));
  }

  return formatter.format(amount);
}

export function toUnits(num, decimals = 18, ethersInstance) {
  return ethersInstance.parseUnits(num.toString(), decimals);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms * 1000));
}
