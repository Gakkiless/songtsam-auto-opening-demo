import type { Hotel } from "../types/domain";

const HOTEL_API_URL = "/tool-api/hotel/list";

interface HotelApiResponse {
  code: number;
  message: string;
  success: boolean;
  data?: HotelApiItem[];
}

interface HotelApiItem {
  hotelCode?: string;
  hotelName?: string;
  hotelShort?: string;
  sta?: string;
}

export async function fetchHotels(): Promise<Hotel[]> {
  const response = await fetch(HOTEL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`酒店信息接口请求失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as HotelApiResponse;

  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error(payload.message || "酒店信息接口返回格式不正确");
  }

  return payload.data
    .filter((item) => item.sta === "I")
    .map(normalizeHotel)
    .filter(Boolean) as Hotel[];
}

function normalizeHotel(item: HotelApiItem): Hotel | null {
  const hotelCode = item.hotelCode?.trim();
  const hotelName = item.hotelName?.trim();

  if (!hotelCode || !hotelName) return null;

  return {
    hotelCode,
    hotelName,
    hotelShortName: item.hotelShort?.trim() || hotelName,
    roomTypes: [],
  };
}
