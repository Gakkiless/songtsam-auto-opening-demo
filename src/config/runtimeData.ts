import type {
  BusinessFrequencyRule,
  Product,
  ProductOpeningConfig,
} from "../types/domain";

const defaultChannels: ProductOpeningConfig["channels"] = ["WECHAT", "CRS"];

export function mergeOpeningConfigsForProducts(
  existingConfigs: ProductOpeningConfig[],
  products: Product[],
  businessRules: BusinessFrequencyRule[],
): ProductOpeningConfig[] {
  const nextConfigsByKey = new Map(
    existingConfigs.map((config) => [openingConfigKey(config.productCode, config.itineraryCode), config]),
  );

  products.forEach((product) => {
    const key = openingConfigKey(product.productCode, product.itineraryCode);
    const currentConfig = nextConfigsByKey.get(key);

    nextConfigsByKey.set(key, {
      ...(currentConfig ?? createDefaultOpeningConfig(product, businessRules)),
      productCode: product.productCode,
      itineraryCode: product.itineraryCode,
      priceConfig:
        product.priceConfig ??
        currentConfig?.priceConfig ??
        createDefaultOpeningConfig(product, businessRules).priceConfig,
    });
  });

  return [...nextConfigsByKey.values()];
}

function createDefaultOpeningConfig(
  product: Product,
  businessRules: BusinessFrequencyRule[],
): ProductOpeningConfig {
  const businessRule = businessRules.find((rule) => rule.businessType === product.businessType);
  const defaultScale = getDefaultScale(product.businessType);

  return {
    productCode: product.productCode,
    itineraryCode: product.itineraryCode,
    channels: defaultChannels,
    defaultGroupSize: defaultScale.groupSize,
    defaultRoomCount: defaultScale.roomCount,
    priceConfig: product.priceConfig ?? {
      priceType: "人",
      adultPrice: null,
      singleRoomSupplement: null,
      childPriceFollowsAdult: true,
    },
    overrideRule: businessRule
      ? {
          frequencyType: businessRule.frequencyType,
          weekdays: businessRule.weekdays,
          intervalDays: businessRule.intervalDays,
          allowedDepartureRule: businessRule.allowedDepartureRule,
          preferredWeekdays: [],
          fallbackWeekdays: [],
        }
      : undefined,
    roomTypePreferences: [],
  };
}

function getDefaultScale(businessType: Product["businessType"]) {
  if (businessType === "自由行") return { groupSize: 4, roomCount: 2 };
  if (businessType === "私享管家") return { groupSize: 6, roomCount: 3 };
  if (businessType === "目的地套餐") return { groupSize: 2, roomCount: 1 };
  return { groupSize: 12, roomCount: 6 };
}

function openingConfigKey(productCode: string, itineraryCode?: string) {
  return `${productCode}|${itineraryCode ?? ""}`;
}
