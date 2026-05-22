import type {
  AvailabilityIssue,
  AvailabilityResult,
  BusinessFrequencyRule,
  GenerateOpeningResult,
  Hotel,
  InventoryItem,
  InventoryViewRow,
  ItineraryResourceRequirement,
  LockedInventory,
  OpeningPayload,
  OpeningPlan,
  Product,
  ProductOpeningConfig,
  ProductRoomTypePreference,
  ResolvedResourceUsage,
  ResolvedOpeningConfig,
  RoomLevel,
  RoomTypeChoice,
  RuleCheckResult,
  StrategyConfig,
} from "../types/domain";

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function generateMonthDates(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(Date.UTC(year, month - 1, index + 1))),
  );
}

export function generateDateRangeDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function generateCandidateDepartureDates(
  _product: Product,
  monthDates: string[],
  openingConfig: ResolvedOpeningConfig,
): string[] {
  if (openingConfig.frequencyType === "daily") {
    return monthDates;
  }

  if (openingConfig.frequencyType === "intervalDays") {
    const intervalDays = openingConfig.intervalDays ?? 1;
    return monthDates.filter((_, index) => index % intervalDays === 0);
  }

  if (openingConfig.frequencyType === "weekly") {
    const candidateWeekdays = [
      ...openingConfig.preferredWeekdays,
      ...openingConfig.fallbackWeekdays,
    ];
    const preferredWeekdays =
      candidateWeekdays.length > 0 ? candidateWeekdays : openingConfig.weekdays ?? [6];
    const datesByWeek = new Map<number, string[]>();
    const firstMonthWeekday = getWeekday(monthDates[0]);
    const firstWeekOffsetFromMonday = (firstMonthWeekday + 6) % 7;

    monthDates.forEach((date) => {
      const weekBucket = Math.floor(
        (getDayOfMonth(date) - 1 + firstWeekOffsetFromMonday) / 7,
      );
      datesByWeek.set(weekBucket, [...(datesByWeek.get(weekBucket) ?? []), date]);
    });

    return [...datesByWeek.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, dates]) => {
        for (const weekday of preferredWeekdays) {
          const matchedDate = dates.find((date) => getWeekday(date) === weekday);
          if (matchedDate) return matchedDate;
        }
        return undefined;
      })
      .filter((date): date is string => Boolean(date));
  }

  return [];
}

export function checkAllowedDepartureRule(
  openingConfig: ResolvedOpeningConfig,
  date: string,
): RuleCheckResult {
  const rule = openingConfig.allowedDepartureRule;
  const dayOfMonth = getDayOfMonth(date);
  const weekday = getWeekday(date);

  if (rule.type === "none") {
    return { allowed: true, reason: "不限出发日" };
  }

  if (rule.type === "oddDays") {
    return dayOfMonth % 2 === 1
      ? { allowed: true, reason: "符合单数日出发规则" }
      : { allowed: false, reason: `${date} 是双数日，不符合单数日出发规则` };
  }

  if (rule.type === "evenDays") {
    return dayOfMonth % 2 === 0
      ? { allowed: true, reason: "符合双数日出发规则" }
      : { allowed: false, reason: `${date} 是单数日，不符合双数日出发规则` };
  }

  if (rule.type === "weekdays") {
    const allowedWeekdays = rule.weekdays ?? [];
    return allowedWeekdays.includes(weekday)
      ? { allowed: true, reason: `符合${formatWeekdays(allowedWeekdays)}出发规则` }
      : {
          allowed: false,
          reason: `${date} 是${weekdayNames[weekday]}，不符合${formatWeekdays(allowedWeekdays)}出发规则`,
        };
  }

  return { allowed: false, reason: "未知出发日规则" };
}

export function calculateItineraryResourceUsage(
  product: Product,
  departureDate: string,
  openingConfig: ResolvedOpeningConfig,
): ItineraryResourceRequirement[] {
  const stayDays = [...product.dailyItinerary].sort((a, b) => a.dayIndex - b.dayIndex);
  const requirements: ItineraryResourceRequirement[] = [];
  let blockNumber = 0;
  let previousHotelCode = "";
  let previousDayIndex = 0;

  stayDays.forEach((day) => {
    if (day.hotelCode !== previousHotelCode || day.dayIndex !== previousDayIndex + 1) {
      blockNumber += 1;
    }

    const date = addDays(departureDate, day.dayIndex - 1);
    requirements.push({
      productCode: product.productCode,
      hotelCode: day.hotelCode,
      hotelName: day.hotelName,
      hotelShortName: day.hotelShortName,
      date,
      quantity: openingConfig.defaultRoomCount,
      roomTypePreference:
        openingConfig.roomTypePreferences.find((preference) => preference.hotelCode === day.hotelCode) ??
        null,
      blockKey: `${product.productCode}-${product.itineraryCode}-${departureDate}-${day.hotelCode}-${blockNumber}`,
    });

    previousHotelCode = day.hotelCode;
    previousDayIndex = day.dayIndex;
  });

  return requirements;
}

export function chooseRoomType(
  hotel: Hotel,
  roomTypePreference: ProductRoomTypePreference | null | undefined,
  config: StrategyConfig,
): RoomTypeChoice {
  if (roomTypePreference?.roomTypeCode) {
    const preferredRoomType = hotel.roomTypes.find(
      (roomType) => roomType.roomTypeCode === roomTypePreference.roomTypeCode,
    );

    if (!preferredRoomType) {
      return { reason: `配置的偏好房型 ${roomTypePreference.roomTypeCode} 不存在` };
    }

    if (isRoomLevelUsable(preferredRoomType.roomLevel, config)) {
      return {
        roomType: preferredRoomType,
        reason: `优先使用配置房型 ${preferredRoomType.roomTypeName}`,
      };
    }

    return {
      reason: `配置房型 ${preferredRoomType.roomTypeName} 为高级房型，会触发团期涨价，基本盘第一版不自动使用`,
    };
  }

  for (const roomLevel of config.roomLevelPriority) {
    if (!isRoomLevelUsable(roomLevel, config)) continue;
    const matchedRoomType = hotel.roomTypes.find(
      (roomType) =>
        roomType.roomLevel === roomLevel &&
        (!roomTypePreference?.roomClass || roomType.roomClass === roomTypePreference.roomClass),
    );
    if (matchedRoomType) {
      return {
        roomType: matchedRoomType,
        reason: roomTypePreference?.roomClass
          ? `按配置房类选择 ${matchedRoomType.roomTypeName}`
          : `按房型优先级选择 ${matchedRoomType.roomTypeName}`,
      };
    }
  }

  const advancedRoom = hotel.roomTypes.find(
    (roomType) =>
      roomType.roomLevel === "高级" &&
      (!roomTypePreference?.roomClass || roomType.roomClass === roomTypePreference.roomClass),
  );

  if (advancedRoom) {
    return {
      reason: `未找到可自动使用的基础房型；存在高级房型 ${advancedRoom.roomTypeName}，但高级房型会触发团期涨价，基本盘第一版不自动使用`,
    };
  }

  return { reason: "未找到可自动使用的基础房型" };
}

export function checkInventoryAvailability(
  resourceUsage: ResolvedResourceUsage[],
  inventory: InventoryItem[],
  lockedInventory: LockedInventory,
  config: StrategyConfig,
): AvailabilityResult {
  const usageByKey = aggregateUsageByKey(resourceUsage);
  const issues: AvailabilityIssue[] = [];

  usageByKey.forEach((usage, key) => {
    const inventorySnapshot = findInventorySnapshot(
      inventory,
      usage.hotelCode,
      usage.date,
      usage.roomTypeCode,
    );
    const publicPool = inventorySnapshot?.publicPool ?? usage.publicPool;
    const usedRooms = getInventoryUsedRooms(inventorySnapshot);
    const lockedRooms = lockedInventory[key]?.quantity ?? 0;
    const availableLimit = publicPool;
    const requestedRooms = usage.quantity;

    if (usedRooms + lockedRooms + requestedRooms > availableLimit) {
      issues.push({
        hotelCode: usage.hotelCode,
        hotelName: usage.hotelName,
        date: usage.date,
        roomTypeCode: usage.roomTypeCode,
        roomTypeName: usage.roomTypeName,
        requestedRooms,
        publicPool,
        usedRooms,
        lockedRooms,
        availableLimit,
        reason: `${usage.date} ${usage.hotelName} ${usage.roomTypeName} 需 ${requestedRooms} 间，库存占用 ${usedRooms} 间，本轮已锁 ${lockedRooms} 间，公共池可用 ${availableLimit} 间；高级房型会触发团期涨价，基本盘第一版不自动切换`,
      });
    }
  });

  return {
    available: issues.length === 0,
    issues,
  };
}

export function lockInventory(
  resourceUsage: ResolvedResourceUsage[],
  lockedInventory: LockedInventory,
): LockedInventory {
  resourceUsage.forEach((usage) => {
    const key = inventoryKey(usage.hotelCode, usage.date, usage.roomTypeCode);
    const currentQuantity = lockedInventory[key]?.quantity ?? 0;
    lockedInventory[key] = {
      hotelCode: usage.hotelCode,
      date: usage.date,
      roomTypeCode: usage.roomTypeCode,
      quantity: currentQuantity + usage.quantity,
    };
  });

  return lockedInventory;
}

export function generateOpeningPayload(openingPlan: OpeningPlan): OpeningPayload {
  const resources = aggregateUsageByKey(openingPlan.resourceUsage);

  return {
    productCode: openingPlan.productCode,
    itineraryCode: openingPlan.itineraryCode,
    businessType: openingPlan.businessType,
    departureDate: openingPlan.departureDate,
    groupSize: openingPlan.groupSize,
    groupNo: openingPlan.groupNo,
    resourceList: [...resources.values()].map((usage) => ({
      hotelCode: usage.hotelCode,
      roomTypeCode: usage.roomTypeCode,
      date: usage.date,
      quantity: usage.quantity,
    })),
  };
}

export function generateOpeningPlans(params: {
  products: Product[];
  productOpeningConfigs: ProductOpeningConfig[];
  hotels: Hotel[];
  inventory: InventoryItem[];
  config: StrategyConfig;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): GenerateOpeningResult {
  const { products, productOpeningConfigs, hotels, inventory, config } = params;
  const monthDates =
    params.startDate && params.endDate
      ? generateDateRangeDates(params.startDate, params.endDate)
      : generateMonthDates(params.year ?? 2026, params.month ?? 6);
  const lockedInventory: LockedInventory = {};
  const openingPlans: OpeningPlan[] = [];
  let planSequence = 1;

  products.forEach((product) => {
    const resolvedConfig = resolveOpeningConfig(
      product,
      productOpeningConfigs,
      config.businessTypeOpeningRules,
    );

    if (!resolvedConfig.openingConfig) {
      openingPlans.push(
        createOpeningPlan({
          product,
          openingConfig: null,
          departureDate: monthDates[0],
          planSequence: planSequence++,
          status: "规则冲突",
          reason: resolvedConfig.reason,
          resourceUsage: [],
        }),
      );
      return;
    }

    const openingConfig = resolvedConfig.openingConfig;

    if (!openingConfig.enabled) return;

    const candidateDates = generateCandidateDepartureDates(
      product,
      monthDates,
      openingConfig,
    );

    candidateDates.forEach((departureDate) => {
      const ruleCheck = checkAllowedDepartureRule(openingConfig, departureDate);

      if (!ruleCheck.allowed) {
        openingPlans.push(
          createOpeningPlan({
            product,
            openingConfig,
            departureDate,
            planSequence: planSequence++,
            status: "规则冲突",
            reason: ruleCheck.reason,
            resourceUsage: [],
          }),
        );
        return;
      }

      if (openingConfig.skipInventoryLock) {
        openingPlans.push(
          createOpeningPlan({
            product,
            openingConfig,
            departureDate,
            planSequence: planSequence++,
            status: "可开团",
            reason: "目的地套餐每日开团，当前基本盘策略不预占酒店资源",
            resourceUsage: [],
          }),
        );
        return;
      }

      const requirement = calculateItineraryResourceUsage(product, departureDate, openingConfig);
      const resolvedResource = resolveResourceUsage(requirement, hotels, inventory, config);

      if (resolvedResource.issues.length > 0) {
        openingPlans.push(
          createOpeningPlan({
            product,
            openingConfig,
            departureDate,
            planSequence: planSequence++,
            status: "资源不足",
            reason: resolvedResource.issues.join("；"),
            resourceUsage: resolvedResource.resourceUsage,
          }),
        );
        return;
      }

      const inventoryAvailability = checkInventoryAvailability(
        resolvedResource.resourceUsage,
        inventory,
        lockedInventory,
        config,
      );

      if (inventoryAvailability.available) {
        lockInventory(resolvedResource.resourceUsage, lockedInventory);
        openingPlans.push(
          createOpeningPlan({
            product,
            openingConfig,
            departureDate,
            planSequence: planSequence++,
            status: "可开团",
            reason: "基础房型公共池资源满足本次计划占用",
            resourceUsage: resolvedResource.resourceUsage,
          }),
        );
        return;
      }

      openingPlans.push(
        createOpeningPlan({
          product,
          openingConfig,
          departureDate,
          planSequence: planSequence++,
          status: "资源不足",
          reason: summarizeAvailabilityIssues(inventoryAvailability.issues),
          resourceUsage: resolvedResource.resourceUsage,
        }),
      );
    });
  });

  const payloads = openingPlans
    .filter((plan) => plan.status === "可开团")
    .map((plan) => generateOpeningPayload(plan));

  return {
    openingPlans,
    payloads,
    inventoryRows: buildInventoryRows(openingPlans, inventory, config),
    lockedInventory,
  };
}

export function getItineraryShortCode(product: Product): string {
  return product.dailyItinerary.map((day) => day.hotelShortName).join("");
}

export function resolveOpeningConfig(
  product: Product,
  productOpeningConfigs: ProductOpeningConfig[],
  businessTypeOpeningRules: BusinessFrequencyRule[],
): { openingConfig: ResolvedOpeningConfig | null; reason: string } {
  const businessRule = businessTypeOpeningRules.find(
    (rule) => rule.businessType === product.businessType,
  );

  if (!businessRule) {
    return {
      openingConfig: null,
      reason: `未找到业务类型 ${product.businessType} 的开团规则配置`,
    };
  }

  if (!businessRule.enabled) {
    return {
      openingConfig: null,
      reason: `业务类型 ${product.businessType} 未启用自动开团`,
    };
  }

  const productConfig =
    productOpeningConfigs.find(
      (openingConfig) =>
        openingConfig.productCode === product.productCode &&
        openingConfig.itineraryCode === product.itineraryCode,
    ) ??
    productOpeningConfigs.find(
      (openingConfig) =>
        openingConfig.productCode === product.productCode && !openingConfig.itineraryCode,
    );

  if (!productConfig) {
    return {
      openingConfig: null,
      reason: `未找到产品 ${product.productCode} 的开团配置`,
    };
  }

  const overrideRule = productConfig.overrideRule ?? {};

  return {
    openingConfig: {
      productCode: product.productCode,
      itineraryCode: productConfig.itineraryCode,
      enabled: productConfig.enabled ?? businessRule.enabled,
      defaultGroupSize: productConfig.defaultGroupSize,
      defaultRoomCount: productConfig.defaultRoomCount,
      frequencyType: overrideRule.frequencyType ?? businessRule.frequencyType,
      weekdays: overrideRule.weekdays ?? businessRule.weekdays,
      intervalDays: overrideRule.intervalDays ?? businessRule.intervalDays,
      allowedDepartureRule:
        overrideRule.allowedDepartureRule ?? businessRule.allowedDepartureRule,
      preferredWeekdays: overrideRule.preferredWeekdays ?? businessRule.preferredWeekdays,
      fallbackWeekdays: overrideRule.fallbackWeekdays ?? businessRule.fallbackWeekdays,
      skipInventoryLock:
        overrideRule.skipInventoryLock ?? businessRule.skipInventoryLock ?? false,
      ruleLabel: productConfig.overrideRule
        ? `${businessRule.label} / 产品行程覆盖`
        : businessRule.label,
      roomTypePreferences: productConfig.roomTypePreferences,
    },
    reason: "已合并业务类型和产品行程开团配置",
  };
}

function resolveResourceUsage(
  requirements: ItineraryResourceRequirement[],
  hotels: Hotel[],
  inventory: InventoryItem[],
  config: StrategyConfig,
): { resourceUsage: ResolvedResourceUsage[]; issues: string[] } {
  const hotelsByCode = new Map(hotels.map((hotel) => [hotel.hotelCode, hotel]));
  const requirementsByBlock = new Map<string, ItineraryResourceRequirement[]>();
  const resourceUsage: ResolvedResourceUsage[] = [];
  const issues: string[] = [];

  requirements.forEach((requirement) => {
    requirementsByBlock.set(requirement.blockKey, [
      ...(requirementsByBlock.get(requirement.blockKey) ?? []),
      requirement,
    ]);
  });

  requirementsByBlock.forEach((blockRequirements) => {
    const firstRequirement = blockRequirements[0];
    const hotel = hotelsByCode.get(firstRequirement.hotelCode);

    if (!hotel) {
      issues.push(`${firstRequirement.hotelName} 未配置酒店基础数据`);
      return;
    }

    const preference =
      blockRequirements.find((requirement) => Boolean(requirement.roomTypePreference))
        ?.roomTypePreference ?? null;
    const choice = chooseRoomType(hotel, preference, config);

    if (!choice.roomType) {
      issues.push(`${hotel.hotelName}：${choice.reason ?? "未找到可用房型"}`);
      return;
    }

    blockRequirements.forEach((requirement) => {
      const inventorySnapshot = findInventorySnapshot(
        inventory,
        requirement.hotelCode,
        requirement.date,
        choice.roomType!.roomTypeCode,
      );

      resourceUsage.push({
        ...requirement,
        roomTypeCode: choice.roomType!.roomTypeCode,
        roomTypeName: choice.roomType!.roomTypeName,
        roomClass: choice.roomType!.roomClass,
        roomLevel: choice.roomType!.roomLevel,
        isAdvancedRoom: choice.roomType!.isAdvancedRoom,
        publicPool: inventorySnapshot?.publicPool ?? 0,
      });
    });
  });

  return { resourceUsage, issues };
}

function buildInventoryRows(
  openingPlans: OpeningPlan[],
  inventory: InventoryItem[],
  config: StrategyConfig,
): InventoryViewRow[] {
  const usageByKey = aggregateUsageByKey(
    openingPlans
      .filter((plan) => plan.status !== "规则冲突")
      .flatMap((plan) => plan.resourceUsage),
  );

  return [...usageByKey.values()]
    .map((usage) => {
      const inventorySnapshot = findInventorySnapshot(
        inventory,
        usage.hotelCode,
        usage.date,
        usage.roomTypeCode,
      );
      const publicPool = inventorySnapshot?.publicPool ?? usage.publicPool;
      const usedRooms = getInventoryUsedRooms(inventorySnapshot);
      const plannedRooms = usage.quantity;
      const availableLimit = publicPool;
      const occupancyRate = publicPool === 0 ? 0 : (usedRooms + plannedRooms) / publicPool;

      return {
        date: usage.date,
        hotelCode: usage.hotelCode,
        hotelName: usage.hotelName,
        hotelShortName: usage.hotelShortName,
        roomTypeCode: usage.roomTypeCode,
        roomTypeName: usage.roomTypeName,
        roomClass: usage.roomClass,
        isAdvancedRoom: usage.isAdvancedRoom,
        publicPool,
        preReserved: inventorySnapshot?.preReserved ?? 0,
        preAllocated: inventorySnapshot?.preAllocated ?? 0,
        preOccupied: inventorySnapshot?.preOccupied ?? 0,
        actualOccupied: inventorySnapshot?.actualOccupied ?? 0,
        usedRooms,
        plannedRooms,
        availableLimit,
        occupancyRate,
        overLimit: usedRooms + plannedRooms > availableLimit,
      };
    })
    .sort((a, b) =>
      `${a.date}-${a.hotelName}-${a.roomTypeName}`.localeCompare(
        `${b.date}-${b.hotelName}-${b.roomTypeName}`,
        "zh-CN",
      ),
    );
}

function createOpeningPlan(params: {
  product: Product;
  openingConfig: ResolvedOpeningConfig | null;
  departureDate: string;
  planSequence: number;
  status: OpeningPlan["status"];
  reason: string;
  resourceUsage: ResolvedResourceUsage[];
}): OpeningPlan {
  const { product, openingConfig, departureDate, planSequence, status, reason, resourceUsage } =
    params;
  return {
    planId: `${product.productCode}-${product.itineraryCode}-${departureDate}-${planSequence}`,
    productCode: product.productCode,
    productName: product.productName,
    itineraryCode: product.itineraryCode,
    itineraryName: product.itineraryName,
    businessType: product.businessType,
    departureDate,
    groupNo: generateGroupNo(product.productCode, departureDate, planSequence),
    groupSize: openingConfig?.defaultGroupSize ?? 0,
    roomCount: openingConfig?.defaultRoomCount ?? 0,
    status,
    reason,
    resourceUsage,
  };
}

function summarizeAvailabilityIssues(issues: AvailabilityIssue[]): string {
  if (issues.length === 0) return "资源不足";
  const visibleIssues = issues.slice(0, 2).map((issue) => issue.reason);
  const hiddenIssueCount = issues.length - visibleIssues.length;

  return hiddenIssueCount > 0
    ? `${visibleIssues.join("；")}；另有 ${hiddenIssueCount} 条超限`
    : visibleIssues.join("；");
}

function aggregateUsageByKey(resourceUsage: ResolvedResourceUsage[]): Map<string, ResolvedResourceUsage> {
  const usageByKey = new Map<string, ResolvedResourceUsage>();

  resourceUsage.forEach((usage) => {
    const key = inventoryKey(usage.hotelCode, usage.date, usage.roomTypeCode);
    const existing = usageByKey.get(key);
    usageByKey.set(key, {
      ...usage,
      quantity: (existing?.quantity ?? 0) + usage.quantity,
    });
  });

  return usageByKey;
}

function findInventorySnapshot(
  inventory: InventoryItem[],
  hotelCode: string,
  date: string,
  roomTypeCode: string,
): InventoryItem | undefined {
  return (
    inventory.find(
      (item) =>
        item.hotelCode === hotelCode && item.date === date && item.roomTypeCode === roomTypeCode,
    ) ??
    inventory.find((item) => item.hotelCode === hotelCode && item.roomTypeCode === roomTypeCode)
  );
}

function getInventoryUsedRooms(inventoryItem?: InventoryItem): number {
  if (!inventoryItem) return 0;
  return (
    inventoryItem.preReserved +
    inventoryItem.preAllocated +
    inventoryItem.preOccupied +
    inventoryItem.actualOccupied
  );
}

function isRoomLevelUsable(roomLevel: RoomLevel, config: StrategyConfig): boolean {
  if (roomLevel === "高级") return config.autoUseAdvancedRoom;
  return roomLevel === "基础";
}

export function inventoryKey(hotelCode: string, date: string, roomTypeCode: string): string {
  return `${hotelCode}|${date}|${roomTypeCode}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return toIsoDate(new Date(Date.UTC(year, month - 1, day + days)));
}

export function getWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getDayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function formatWeekdays(weekdays: number[]): string {
  return weekdays.map((weekday) => weekdayNames[weekday]).join("、");
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateGroupNo(productCode: string, departureDate: string, sequence: number): string {
  return `KT-${departureDate.replace(/-/g, "")}-${productCode}-${String(sequence).padStart(3, "0")}`;
}
