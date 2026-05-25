export type BusinessType = "主题团" | "自由行" | "私享管家" | "目的地套餐";
export type RoomClass = "大床" | "双床";
export type RoomLevel = "基础" | "高级";
export type FrequencyType = "weekly" | "intervalDays" | "daily";
export type OpeningPlanStatus = "可开团" | "资源不足" | "规则冲突";
export type OpeningExecutionStatus = "开团成功" | "开团失败";
export type OpeningChannel = "WECHAT" | "CRS" | "小红书" | "招商银行";
export type PriceType = "人" | "家庭" | "套";
export type InterfaceAmount = number | null;

export interface AllowedDepartureRule {
  type: "none" | "oddDays" | "evenDays" | "weekdays";
  weekdays?: number[];
  description: string;
}

export interface ProductItineraryDay {
  dayIndex: number;
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  activityName: string;
  hotelMissing?: boolean;
  activityMissing?: boolean;
}

export interface Product {
  productCode: string;
  productName: string;
  itineraryCode: string;
  itineraryName: string;
  businessType: BusinessType;
  tripDays: number;
  priceModel?: string;
  priceModelDesc?: PriceType;
  priceConfig?: PriceConfig;
  dailyItinerary: ProductItineraryDay[];
}

export interface ProductRoomTypePreference {
  hotelCode: string;
  roomTypeCode?: string;
  roomClass?: RoomClass;
  description: string;
}

export interface OpeningRuleOverride {
  frequencyType?: FrequencyType;
  weekdays?: number[];
  intervalDays?: number;
  allowedDepartureRule?: AllowedDepartureRule;
  preferredWeekdays?: number[];
  fallbackWeekdays?: number[];
}

export interface ProductOpeningConfig {
  productCode: string;
  itineraryCode?: string;
  channels: OpeningChannel[];
  defaultGroupSize: number;
  defaultRoomCount: number;
  priceConfig: PriceConfig;
  overrideRule?: OpeningRuleOverride;
  roomTypePreferences: ProductRoomTypePreference[];
}

export interface PerPersonPriceConfig {
  priceType: "人";
  adultPrice: InterfaceAmount;
  singleRoomSupplement: InterfaceAmount;
  childPriceFollowsAdult: true;
  guaranteeAmount?: InterfaceAmount;
}

export interface FamilyPriceItem {
  familyCode: string;
  adultCount: number;
  childCount: number;
  bigChildPrice: InterfaceAmount;
  middleChildPrice: InterfaceAmount;
  smallChildPrice: InterfaceAmount;
}

export interface FamilyPriceConfig {
  priceType: "家庭";
  singleRoomSupplement: InterfaceAmount;
  familyPrices: FamilyPriceItem[];
}

export interface PackagePriceConfig {
  priceType: "套";
  packagePeople: InterfaceAmount;
  adultCount: InterfaceAmount;
  packagePrice: InterfaceAmount;
}

export type PriceConfig = PerPersonPriceConfig | FamilyPriceConfig | PackagePriceConfig;

export interface RoomType {
  roomTypeCode: string;
  roomTypeName: string;
  roomClass: RoomClass;
  roomLevel: RoomLevel;
  isAdvancedRoom: boolean;
}

export interface Hotel {
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  roomTypes: RoomType[];
}

export interface InventoryItem {
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  roomTypeCode: string;
  roomTypeName: string;
  publicPool: number;
  preReserved: number;
  preAllocated: number;
  preOccupied: number;
  actualOccupied: number;
  roomClass: RoomClass;
  date: string;
  isAdvancedRoom: boolean;
}

export interface BusinessFrequencyRule {
  businessType: BusinessType;
  enabled: boolean;
  label: string;
  frequencyType: FrequencyType;
  weekdays?: number[];
  intervalDays?: number;
  allowedDepartureRule: AllowedDepartureRule;
  preferredWeekdays: number[];
  fallbackWeekdays: number[];
}

export interface StrategyConfig {
  businessTypeOpeningRules: BusinessFrequencyRule[];
  roomLevelPriority: RoomLevel[];
  autoUseAdvancedRoom: boolean;
}

export interface ResolvedOpeningConfig {
  productCode: string;
  itineraryCode?: string;
  channels: OpeningChannel[];
  defaultGroupSize: number;
  defaultRoomCount: number;
  priceConfig: PriceConfig;
  frequencyType: FrequencyType;
  weekdays?: number[];
  intervalDays?: number;
  allowedDepartureRule: AllowedDepartureRule;
  preferredWeekdays: number[];
  fallbackWeekdays: number[];
  ruleLabel: string;
  roomTypePreferences: ProductRoomTypePreference[];
}

export interface ItineraryResourceRequirement {
  productCode: string;
  dayIndex: number;
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  date: string;
  quantity: number;
  roomTypePreference?: ProductRoomTypePreference | null;
  blockKey: string;
}

export interface ResolvedResourceUsage extends ItineraryResourceRequirement {
  roomTypeCode: string;
  roomTypeName: string;
  roomClass: RoomClass;
  roomLevel: RoomLevel;
  isAdvancedRoom: boolean;
  publicPool: number;
}

export interface RoomTypeChoice {
  roomType?: RoomType;
  reason?: string;
}

export interface InventoryLockEntry {
  hotelCode: string;
  date: string;
  roomTypeCode: string;
  quantity: number;
}

export type LockedInventory = Record<string, InventoryLockEntry>;

export interface AvailabilityIssue {
  hotelCode: string;
  hotelName: string;
  date: string;
  roomTypeCode: string;
  roomTypeName: string;
  requestedRooms: number;
  publicPool: number;
  usedRooms: number;
  lockedRooms: number;
  availableLimit: number;
  reason: string;
}

export interface AvailabilityResult {
  available: boolean;
  issues: AvailabilityIssue[];
}

export interface RuleCheckResult {
  allowed: boolean;
  reason: string;
}

export interface OpeningPlan {
  planId: string;
  productCode: string;
  productName: string;
  itineraryCode: string;
  itineraryName: string;
  businessType: BusinessType;
  departureDate: string;
  channels: OpeningChannel[];
  groupSize: number;
  roomCount: number;
  priceConfig: PriceConfig | null;
  status: OpeningPlanStatus;
  reason: string;
  resourceUsage: ResolvedResourceUsage[];
}

export interface OpeningPayloadResource {
  hotelCode: string;
  roomTypeCode: string;
  date: string;
  quantity: number;
}

export interface OpeningPayload {
  productCode: string;
  itineraryCode: string;
  businessType: BusinessType;
  departureDate: string;
  channels: OpeningChannel[];
  groupSize: number;
  priceConfig: PriceConfig | null;
  resourceList: OpeningPayloadResource[];
}

export interface OpeningExecutionRecord {
  executionId: string;
  batchId: string;
  executedAt: string;
  planId: string;
  productCode: string;
  productName: string;
  itineraryCode: string;
  itineraryName: string;
  businessType: BusinessType;
  departureDate: string;
  channels: OpeningChannel[];
  groupSize: number;
  priceConfig: PriceConfig | null;
  roomSummary: string;
  status: OpeningExecutionStatus;
  groupPeriodNo?: string;
  failureReason?: string;
  payload: OpeningPayload;
}

export interface InventoryViewRow {
  date: string;
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  roomTypeCode: string;
  roomTypeName: string;
  roomClass: RoomClass;
  isAdvancedRoom: boolean;
  publicPool: number;
  preReserved: number;
  preAllocated: number;
  preOccupied: number;
  actualOccupied: number;
  usedRooms: number;
  plannedRooms: number;
  availableLimit: number;
  occupancyRate: number;
  overLimit: boolean;
}

export interface GenerateOpeningResult {
  openingPlans: OpeningPlan[];
  payloads: OpeningPayload[];
  inventoryRows: InventoryViewRow[];
  lockedInventory: LockedInventory;
}
