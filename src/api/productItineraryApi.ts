import type {
  BusinessType,
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
  title?: string;
  timeSlotDesc?: string;
}

interface ApiItinerarySpec {
  adult?: number;
  children?: number;
  itinerarySpecs?: string;
  itinerarySpecsDesc?: string;
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
  const itinerarySpecs = normalizeJsonArray<ApiItinerarySpec>(
    item.itinerarySpecs,
    item.itinerarySpecsJson,
  );
  const priceType = normalizePriceType(item.priceModel, item.priceModelDesc);

  return {
    productCode,
    productName: item.productName?.trim() || productCode,
    itineraryCode,
    itineraryName: item.itineraryName?.trim() || itineraryCode,
    businessType: normalizeBusinessType(item.categorySubDesc),
    tripDays: item.itineraryDays || dailyHotels.length || 1,
    priceModel: item.priceModel,
    priceModelDesc: priceType,
    priceConfig: buildPriceConfig(priceType, itinerarySpecs, item.categorySubDesc),
    dailyItinerary: buildDailyItinerary(dailyHotels, dailyActivities),
  };
}

function buildDailyItinerary(
  dailyHotels: ApiDailyHotel[],
  dailyActivities: ApiDailyActivity[],
): ProductItineraryDay[] {
  const activitiesByDay = new Map(
    dailyActivities.map((day) => [
      day.day,
      (day.activities ?? [])
        .map((activity) => activity.title?.trim())
        .filter(Boolean)
        .join(" / "),
    ]),
  );

  return dailyHotels
    .map((day) => {
      const hotel = day.hotels?.find((candidate) => candidate.hotelCode && candidate.hotelName);
      if (!hotel?.hotelCode || !hotel.hotelName) return null;

      return {
        dayIndex: day.day,
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
        hotelShortName: hotel.hotelShort || hotel.hotelName,
        activityName: activitiesByDay.get(day.day) || "-",
      };
    })
    .filter(Boolean) as ProductItineraryDay[];
}

function buildPriceConfig(
  priceType: PriceType,
  itinerarySpecs: ApiItinerarySpec[],
  businessTypeDesc?: string,
): PriceConfig {
  if (priceType === "家庭") {
    const familySpecs = itinerarySpecs.length > 0 ? itinerarySpecs : [{ adult: 1, children: 1 }];

    return {
      priceType,
      singleRoomSupplement: 0,
      familyPrices: familySpecs.map((spec, index) => {
        const adultCount = spec.adult || 1;
        const childCount = spec.children ?? 1;
        return {
          familyCode: spec.itinerarySpecsDesc || `${adultCount}大${childCount}小`,
          adultCount,
          childCount,
          bigChildPrice: 0,
          middleChildPrice: 0,
          smallChildPrice: 0,
        };
      }),
    };
  }

  if (priceType === "套") {
    const firstSpec = itinerarySpecs[0];
    const adultCount = firstSpec?.adult || 2;
    const childCount = firstSpec?.children || 0;

    return {
      priceType,
      packagePeople: adultCount + childCount,
      adultCount,
      packagePrice: 0,
    };
  }

  return {
    priceType: "人",
    adultPrice: 0,
    singleRoomSupplement: 0,
    childPriceFollowsAdult: true,
    ...(isGuaranteeBusinessType(businessTypeDesc) ? { guaranteeAmount: 0 } : {}),
  };
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
