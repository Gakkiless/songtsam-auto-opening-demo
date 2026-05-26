import type { Hotel, InventoryItem, RoomClass } from "../types/domain";

const INVENTORY_API_URL = "/tool-api/inventory-board/query";
const UNIT_CODE = "SONGTSAM-CS";

interface InventoryBoardResponse {
  code: number;
  message: string;
  success: boolean;
  data?: InventoryBoardItem[];
}

interface InventoryBoardItem {
  rsvDate?: string;
  hotelCode?: string;
  hotelName?: string;
  hotelShortName?: string;
  rmtype?: string;
  rmtypeName?: string;
  rmClassDesc?: string;
  isPremium?: string;
  publicPoolNum?: number;
  blockAvailNum?: number;
  preAllocationNum?: number;
  preOccupiedNum?: number;
  realOccupiedNum?: number;
  pmsTotalNum?: number;
  oooNum?: number;
  pmsOtherOrderNum?: number;
}

export async function fetchInventoryBoard(params: {
  hotelCodes: string[];
  beginDate: string;
  endDate: string;
}): Promise<InventoryItem[]> {
  if (params.hotelCodes.length === 0) return [];

  const response = await fetch(INVENTORY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hotelGroupCode: UNIT_CODE,
      hotelCodes: params.hotelCodes,
      beginDate: params.beginDate,
      endDate: params.endDate,
      unitCode: UNIT_CODE,
    }),
  });

  if (!response.ok) {
    throw new Error(`酒店房型库存接口请求失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as InventoryBoardResponse;

  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error(payload.message || "酒店房型库存接口返回格式不正确");
  }

  return payload.data.map(normalizeInventoryItem).filter(Boolean) as InventoryItem[];
}

export function mergeInventoryRoomTypesIntoHotels(hotels: Hotel[], inventory: InventoryItem[]): Hotel[] {
  const roomTypesByHotel = new Map<string, Hotel["roomTypes"]>();

  inventory.forEach((item) => {
    const roomTypes = roomTypesByHotel.get(item.hotelCode) ?? [];
    if (!roomTypes.some((roomType) => roomType.roomTypeCode === item.roomTypeCode)) {
      roomTypes.push({
        roomTypeCode: item.roomTypeCode,
        roomTypeName: item.roomTypeName,
        roomClass: item.roomClass,
        roomLevel: item.isAdvancedRoom ? "高级" : "基础",
        isAdvancedRoom: item.isAdvancedRoom,
      });
    }
    roomTypesByHotel.set(item.hotelCode, roomTypes);
  });

  return hotels.map((hotel) => ({
    ...hotel,
    roomTypes: roomTypesByHotel.get(hotel.hotelCode) ?? hotel.roomTypes,
  }));
}

function normalizeInventoryItem(item: InventoryBoardItem): InventoryItem | null {
  const date = item.rsvDate?.trim();
  const hotelCode = item.hotelCode?.trim();
  const hotelName = item.hotelName?.trim();
  const roomTypeCode = item.rmtype?.trim();
  const roomTypeName = item.rmtypeName?.trim();

  if (!date || !hotelCode || !hotelName || !roomTypeCode || !roomTypeName) return null;

  return {
    hotelCode,
    hotelName,
    hotelShortName: item.hotelShortName?.trim() || hotelName,
    roomTypeCode,
    roomTypeName,
    totalRooms: toNumber(item.pmsTotalNum),
    publicPool: toNumber(item.publicPoolNum),
    preReserved: toNumber(item.blockAvailNum),
    preAllocated: toNumber(item.preAllocationNum),
    preOccupied: toNumber(item.preOccupiedNum),
    actualOccupied: toNumber(item.realOccupiedNum),
    offlineOccupied: toNumber(item.pmsOtherOrderNum),
    maintenance: toNumber(item.oooNum),
    roomClass: normalizeRoomClass(item.rmClassDesc, roomTypeName),
    date,
    isAdvancedRoom: item.isPremium === "T",
  };
}

function normalizeRoomClass(roomClassDesc: string | undefined, roomTypeName: string): RoomClass {
  const normalizedClass = roomClassDesc?.trim().toUpperCase();
  if (normalizedClass === "B") return "双床";
  if (normalizedClass === "D") return "大床";
  return roomTypeName.includes("双") ? "双床" : "大床";
}

function toNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
