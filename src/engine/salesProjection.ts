import type { OpeningExecutionRecord } from "../types/domain";

export interface SalesProjectionSummary {
  totalSalesValue: number;
  targetRatio: number | null;
  estimatedSalesValue: number | null;
  missingPriceCount: number;
}

export function summarizeExecutionSales(
  records: OpeningExecutionRecord[],
  salesTarget: number | null,
  historicalSuccessRate: number | null,
): SalesProjectionSummary {
  const successfulRecords = records.filter((record) => record.status === "开团成功");
  const salesValues = successfulRecords.map(calculateExecutionRecordSalesValue);
  const totalSalesValue = salesValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const targetRatio = salesTarget && salesTarget > 0 ? totalSalesValue / salesTarget : null;
  const estimatedSalesValue =
    historicalSuccessRate === null || historicalSuccessRate === undefined
      ? null
      : totalSalesValue * (historicalSuccessRate / 100);

  return {
    totalSalesValue,
    targetRatio,
    estimatedSalesValue,
    missingPriceCount: salesValues.filter((value) => value === null).length,
  };
}

export function calculateExecutionRecordSalesValue(record: OpeningExecutionRecord): number | null {
  const priceConfig = record.priceConfig;
  if (!priceConfig) return null;

  if (priceConfig.priceType === "人") {
    return priceConfig.adultPrice === null ? null : priceConfig.adultPrice * record.groupSize;
  }

  if (priceConfig.priceType === "家庭") {
    const prices = priceConfig.familyPrices
      .flatMap((price) => [price.bigChildPrice, price.middleChildPrice, price.smallChildPrice])
      .filter((value): value is number => typeof value === "number");

    if (prices.length === 0) return null;
    const averageSpecPrice = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    return averageSpecPrice * record.roomCount;
  }

  if (priceConfig.packagePrice === null) return null;
  const packagePeople = priceConfig.packagePeople && priceConfig.packagePeople > 0 ? priceConfig.packagePeople : 1;
  return priceConfig.packagePrice * Math.ceil(record.groupSize / packagePeople);
}

export function formatCurrency(value: number) {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
