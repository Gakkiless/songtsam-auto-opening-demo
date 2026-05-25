import type {
  BusinessFrequencyRule,
  Hotel,
  InventoryItem,
  Product,
  ProductOpeningConfig,
  RoomClass,
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
      priceConfig: product.priceConfig ?? currentConfig?.priceConfig ?? createDefaultOpeningConfig(product, businessRules).priceConfig,
    });
  });

  return [...nextConfigsByKey.values()];
}

export function mergeHotelsForProducts(baseHotels: Hotel[], products: Product[]): Hotel[] {
  const hotelsByCode = new Map(baseHotels.map((hotel) => [hotel.hotelCode, hotel]));

  products.flatMap((product) => product.dailyItinerary).forEach((day) => {
    if (hotelsByCode.has(day.hotelCode)) return;

    hotelsByCode.set(day.hotelCode, {
      hotelCode: day.hotelCode,
      hotelName: day.hotelName,
      hotelShortName: day.hotelShortName,
      roomTypes: [
        createSyntheticRoomType(day.hotelCode, "大床"),
        createSyntheticRoomType(day.hotelCode, "双床"),
      ],
    });
  });

  return [...hotelsByCode.values()];
}

export function mergeInventoryForHotels(baseInventory: InventoryItem[], hotels: Hotel[]): InventoryItem[] {
  const inventoryByKey = new Map(
    baseInventory.map((item) => [inventoryKey(item.hotelCode, item.date, item.roomTypeCode), item]),
  );

  hotels.forEach((hotel) => {
    hotel.roomTypes.forEach((roomType) => {
      const key = inventoryKey(hotel.hotelCode, "2026-06-01", roomType.roomTypeCode);
      if (inventoryByKey.has(key)) return;

      inventoryByKey.set(key, {
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
        hotelShortName: hotel.hotelShortName,
        roomTypeCode: roomType.roomTypeCode,
        roomTypeName: roomType.roomTypeName,
        publicPool: 30,
        preReserved: 0,
        preAllocated: 0,
        preOccupied: 0,
        actualOccupied: 0,
        roomClass: roomType.roomClass,
        date: "2026-06-01",
        isAdvancedRoom: roomType.isAdvancedRoom,
      });
    });
  });

  return [...inventoryByKey.values()];
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
      adultPrice: 0,
      singleRoomSupplement: 0,
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

function createSyntheticRoomType(hotelCode: string, roomClass: RoomClass) {
  return {
    roomTypeCode: `${hotelCode}-B-${roomClass === "大床" ? "KING" : "TWIN"}`,
    roomTypeName: `基础${roomClass}`,
    roomClass,
    roomLevel: "基础" as const,
    isAdvancedRoom: false,
  };
}

function openingConfigKey(productCode: string, itineraryCode?: string) {
  return `${productCode}|${itineraryCode ?? ""}`;
}

function inventoryKey(hotelCode: string, date: string, roomTypeCode: string) {
  return `${hotelCode}|${date}|${roomTypeCode}`;
}
