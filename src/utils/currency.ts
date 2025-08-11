export type CurrencySettings = {
  currency: string; // e.g. 'USD', 'CNY'
  rateToUSD: number; // 1 USD -> rateToUSD target currency
  precision?: number;
};

export function formatCurrency(usdValue: number | null | undefined, settings: CurrencySettings): string {
  if (usdValue == null) return '-';
  const precision = settings.precision ?? 6;
  const value = settings.currency === 'USD' ? usdValue : usdValue * (settings.rateToUSD || 1);
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  const symbol = settings.currency === 'USD' ? '$' : '';
  return `${symbol}${rounded.toFixed(precision)}${settings.currency !== 'USD' ? ' ' + settings.currency : ''}`;
}

// 简单的汇率获取，可替换为后端服务或更可靠的数据源
export async function fetchExchangeRate(base: string, target: string): Promise<number> {
  if (!base || !target || base === target) return 1;
  try {
    const resp = await fetch(`https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`);
    if (!resp.ok) return 1;
    const data = await resp.json();
    const rate = data?.rates?.[target];
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) return rate;
    return 1;
  } catch {
    return 1;
  }
}

