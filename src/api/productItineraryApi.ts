import type {
  BusinessType,
  ItinerarySpec,
  PriceConfig,
  PriceType,
  Product,
  ProductItineraryDay,
} from "../types/domain";

const PRODUCT_ITINERARY_API_URL = "/tool-api/product-itinerary/list";

const productItineraryRequestBody = {
  unitCode: "SONGTSAM-CS",
  travelType: "",
  categorySub: "",
  itineraryCode: "",
  travelTypes: [],
  categorySubs: [],
};

interface ProductItineraryApiResponse {
  code: number;
  message: string;
  success: boolean;
  data?: ProductItineraryApiItem[];
}

interface ProductItineraryApiItem {
  travelType?: string;
  productName?: string;
  itineraryCode?: string;
  itineraryName?: string;
  categorySubDesc?: string;
  itineraryDays?: number;
  descriptShort?: string;
  priceModel?: string;
  priceModelDesc?: string;
  dailyHotelsJson?: string | null;
  dailyActivitiesJson?: string | null;
  itinerarySpecsJson?: string | null;
  dailyHotels?: ApiDailyHotel[];
  dailyActivities?: ApiDailyActivity[];
  itinerarySpecs?: ApiItinerarySpec[];
}

interface ApiDailyHotel {
  day: number;
  hotels?: ApiHotel[];
}

interface ApiHotel {
  hotelCode?: string;
  hotelName?: string;
  hotelShort?: string;
}

interface ApiDailyActivity {
  day: number;
  activities?: ApiActivity[];
}

interface ApiActivity {
  activityCode?: string;
  activityName?: string;
  title?: string;
  timeSlotDesc?: string;
}

interface ApiItinerarySpec {
  adult?: number;
  children?: number;
  itinerarySpecs?: string;
  itinerarySpecsDesc?: string;
  priceModel?: string;
  priceModelDesc?: string;
}

export async function fetchProductItineraries(): Promise<Product[]> {
  const response = await fetch(PRODUCT_ITINERARY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productItineraryRequestBody),
  });

  if (!response.ok) {
    throw new Error(`产品行程接口请求失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ProductItineraryApiResponse;

  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error(payload.message || "产品行程接口返回格式不正确");
  }

  return payload.data.map(normalizeProductItinerary).filter(Boolean) as Product[];
}

function normalizeProductItinerary(item: ProductItineraryApiItem): Product | null {
  const productCode = item.travelType?.trim();
  const itineraryCode = item.itineraryCode?.trim();

  if (!productCode || !itineraryCode) return null;

  const dailyHotels = normalizeJsonArray<ApiDailyHotel>(item.dailyHotels, item.dailyHotelsJson);
  const dailyActivities = normalizeJsonArray<ApiDailyActivity>(
    item.dailyActivities,
    item.dailyActivitiesJson,
  );
  const itinerarySpecs = normalizeItinerarySpecs(
    normalizeJsonArray<ApiItinerarySpec>(item.itinerarySpecs, item.itinerarySpecsJson),
  );
  const priceType = normalizePriceType(item.priceModel, item.priceModelDesc);

  return {
    productCode,
    productName: item.productName?.trim() || productCode,
    itineraryCode,
    itineraryName: item.itineraryName?.trim() || itineraryCode,
    businessType: normalizeBusinessType(item.categorySubDesc),
    tripDays: item.itineraryDays || getMaxDay(dailyHotels, dailyActivities) || 0,
    priceModel: item.priceModel,
    priceModelDesc: priceType,
    itinerarySpecs,
    priceConfig: buildPriceConfig(priceType, itinerarySpecs, item.categorySubDesc),
    dailyItinerary: buildDailyItinerary(
      dailyHotels,
      dailyActivities,
      item.itineraryDays || getMaxDay(dailyHotels, dailyActivities),
    ),
  };
}

function buildDailyItinerary(
  dailyHotels: ApiDailyHotel[],
  dailyActivities: ApiDailyActivity[],
  tripDays: number,
): ProductItineraryDay[] {
  const hotelsByDay = new Map(dailyHotels.map((day) => [day.day, day.hotels ?? []]));
  const activitiesByDay = new Map(
    dailyActivities.map((day) => [
      day.day,
      (day.activities ?? [])
        .map((activity) => activity.activityName?.trim() || activity.title?.trim())
        .filter(Boolean)
        .join(" / "),
    ]),
  );
  const maxDay = tripDays || getMaxDay(dailyHotels, dailyActivities);

  return Array.from({ length: maxDay }, (_, index) => {
    const dayIndex = index + 1;
    const hotel = hotelsByDay.get(dayIndex)?.find((candidate) => candidate.hotelCode && candidate.hotelName);
    const activityName = activitiesByDay.get(dayIndex) || "";

    return {
      dayIndex,
      hotelCode: hotel?.hotelCode?.trim() ?? "",
      hotelName: hotel?.hotelName?.trim() ?? "",
      hotelShortName: hotel?.hotelShort?.trim() ?? "",
      activityName,
      hotelMissing: !hotel?.hotelCode || !hotel.hotelName,
      activityMissing: !activityName,
    };
  });
}

function buildPriceConfig(
  priceType: PriceType,
  itinerarySpecs: ItinerarySpec[],
  businessTypeDesc?: string,
): PriceConfig {
  if (priceType === "家庭") {
    return {
      priceType,
      singleRoomSupplement: null,
      familyPrices: itinerarySpecs.map((spec) => ({
        specCode: spec.specCode,
        familyCode: spec.specName,
        adultCount: spec.adultCount,
        childCount: spec.childCount,
        bigChildPrice: null,
        middleChildPrice: null,
        smallChildPrice: null,
      })),
    };
  }

  if (priceType === "套") {
    return {
      priceType,
      packagePeople: null,
      adultCount: null,
      packagePrice: null,
    };
  }

  return {
    priceType: "人",
    adultPrice: null,
    singleRoomSupplement: null,
    childPriceFollowsAdult: true,
    ...(isGuaranteeBusinessType(businessTypeDesc) ? { guaranteeAmount: null } : {}),
  };
}

function normalizeItinerarySpecs(specs: ApiItinerarySpec[]): ItinerarySpec[] {
  return specs.map((spec, index) => {
    const adultCount = spec.adult ?? 0;
    const childCount = spec.children ?? 0;

    return {
      specCode: spec.itinerarySpecs?.trim() || `SPEC-${index + 1}`,
      specName: spec.itinerarySpecsDesc?.trim() || formatSpecName(adultCount, childCount),
      adultCount,
      childCount,
      priceModel: spec.priceModel,
      priceModelDesc: spec.priceModelDesc,
    };
  });
}

function formatSpecName(adultCount: number, childCount: number) {
  if (adultCount > 0 && childCount > 0) return `${adultCount}成人${childCount}儿童`;
  if (adultCount > 0) return `${adultCount}成人`;
  if (childCount > 0) return `${childCount}儿童`;
  return "接口未返回";
}

function getMaxDay(dailyHotels: ApiDailyHotel[], dailyActivities: ApiDailyActivity[]): number {
  return Math.max(
    0,
    ...dailyHotels.map((day) => day.day || 0),
    ...dailyActivities.map((day) => day.day || 0),
  );
}

function normalizeJsonArray<T>(value: T[] | undefined, jsonValue: string | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (!jsonValue) return [];

  try {
    const parsed = JSON.parse(jsonValue);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizeBusinessType(value: string | undefined): BusinessType {
  if (value === "自由行") return "自由行";
  if (value === "私享管家") return "私享管家";
  if (value === "目的地套餐") return "目的地套餐";
  return "主题团";
}

function normalizePriceType(priceModel: string | undefined, priceModelDesc: string | undefined): PriceType {
  if (priceModel === "FAMILY" || priceModelDesc === "家庭") return "家庭";
  if (priceModel === "PACKAGE" || priceModelDesc === "套") return "套";
  return "人";
}

function isGuaranteeBusinessType(value: string | undefined) {
  return value === "自由行" || value === "私享管家";
}
