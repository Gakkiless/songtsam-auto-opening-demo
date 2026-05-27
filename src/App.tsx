import { useEffect, useMemo, useState } from "react";
import {
  ApartmentOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { ConfigProvider, Layout, Segmented, Space, Tag, Typography, theme } from "antd";
import { fetchHotels } from "./api/hotelApi";
import {
  fetchInventoryBoard,
  mergeInventoryRoomTypesIntoHotels,
} from "./api/inventoryApi";
import { fetchProductItineraries } from "./api/productItineraryApi";
import {
  hotels,
  inventory as initialInventory,
  productOpeningConfigs as initialProductOpeningConfigs,
  strategyConfig as initialStrategyConfig,
} from "./config/data";
import {
  mergeOpeningConfigsForProducts,
} from "./config/runtimeData";
import {
  buildInventoryRowsFromInventory,
  generateOpeningPayload,
  generateOpeningPlans,
} from "./engine/openingEngine";
import {
  calculateExecutionRecordSalesValue,
  summarizeExecutionSales,
} from "./engine/salesProjection";
import { AutoOpeningPage } from "./pages/AutoOpeningPage";
import { ExecutionResultPage } from "./pages/ExecutionResultPage";
import { InventoryPage } from "./pages/InventoryPage";
import { OpeningPlanPage } from "./pages/OpeningPlanPage";
import { PayloadPage } from "./pages/PayloadPage";
import type {
  GenerateOpeningResult,
  Hotel,
  OpeningExecutionRecord,
  OpeningPlan,
  Product,
  ProductOpeningConfig,
} from "./types/domain";

type TabKey = "home" | "plans" | "executions" | "inventory" | "payload";

export interface ProductOption {
  productCode: string;
  productName: string;
  businessType: Product["businessType"];
  itineraryCount: number;
}

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const tabs = [
  { value: "home" as const, label: "自动开团", icon: <DashboardOutlined /> },
  { value: "plans" as const, label: "待确认计划", icon: <FileDoneOutlined /> },
  { value: "executions" as const, label: "开团结果", icon: <HistoryOutlined /> },
  { value: "inventory" as const, label: "酒店资源占用表", icon: <TableOutlined /> },
  { value: "payload" as const, label: "Payload 预览", icon: <FileTextOutlined /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [draftProductCode, setDraftProductCode] = useState("");
  const [draftItineraryKey, setDraftItineraryKey] = useState("");
  const [addedItineraryKeys, setAddedItineraryKeys] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const [result, setResult] = useState<GenerateOpeningResult | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [executionHistory, setExecutionHistory] = useState<OpeningExecutionRecord[]>([]);
  const [latestBatchId, setLatestBatchId] = useState("");
  const [salesTarget, setSalesTarget] = useState<number | null>(null);
  const [historicalSuccessRate, setHistoricalSuccessRate] = useState<number | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableHotels, setAvailableHotels] = useState<Hotel[]>(hotels);
  const [availableInventory, setAvailableInventory] = useState(initialInventory);
  const [productDataSource, setProductDataSource] =
    useState<"loading" | "api" | "empty" | "error">("loading");
  const [hotelDataSource, setHotelDataSource] =
    useState<"loading" | "api" | "empty" | "error">("loading");
  const [inventoryDataSource, setInventoryDataSource] =
    useState<"loading" | "api" | "empty" | "error">("loading");
  const [openingConfigs, setOpeningConfigs] = useState<ProductOpeningConfig[]>(() =>
    cloneValue(initialProductOpeningConfigs),
  );

  const allProductOptions = useMemo(() => buildProductOptions(availableProducts), [availableProducts]);

  const draftItineraryOptions = useMemo(
    () => availableProducts.filter((product) => product.productCode === draftProductCode),
    [availableProducts, draftProductCode],
  );

  const selectedProducts = useMemo(() => {
    const selectedKeySet = new Set(addedItineraryKeys);
    return availableProducts.filter((product) => selectedKeySet.has(getProductItineraryKey(product)));
  }, [availableProducts, addedItineraryKeys]);

  const inventoryHotelCodes = useMemo(
    () => resolveInventoryHotelCodes(selectedProducts, availableHotels),
    [availableHotels, selectedProducts],
  );

  const generatedSummary = useMemo(() => {
    if (!result) return "未生成";
    const openable = result.openingPlans.filter((plan) => plan.status === "可开团").length;
    const blocked = result.openingPlans.length - openable;
    return `${openable} 待确认 / ${blocked} 需处理`;
  }, [result]);
  const inventoryRows = useMemo(
    () => result?.inventoryRows ?? buildInventoryRowsFromInventory(availableInventory),
    [availableInventory, result],
  );
  const hotelsForPlanning = useMemo(
    () => mergeInventoryRoomTypesIntoHotels(availableHotels, availableInventory),
    [availableHotels, availableInventory],
  );

  const resetGeneratedState = () => {
    setResult(null);
    setSelectedPlanIds([]);
  };

  useEffect(() => {
    let ignore = false;

    fetchProductItineraries()
      .then((apiProducts) => {
        if (ignore) return;
        setAvailableProducts(apiProducts);
        setOpeningConfigs((currentConfigs) =>
          mergeOpeningConfigsForProducts(
            currentConfigs,
            apiProducts,
            initialStrategyConfig.businessTypeOpeningRules,
          ),
        );
        setProductDataSource(apiProducts.length > 0 ? "api" : "empty");
      })
      .catch((error) => {
        console.warn("产品行程接口不可用", error);
        if (!ignore) {
          setAvailableProducts([]);
          setProductDataSource("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchHotels()
      .then((apiHotels) => {
        if (ignore) return;
        setAvailableHotels(apiHotels);
        setHotelDataSource(apiHotels.length > 0 ? "api" : "empty");
      })
      .catch((error) => {
        console.warn("酒店信息接口不可用", error);
        if (!ignore) {
          setAvailableHotels([]);
          setHotelDataSource("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (inventoryHotelCodes.length === 0 || !startDate || !endDate) {
      setAvailableInventory([]);
      setInventoryDataSource(hotelDataSource === "loading" ? "loading" : "empty");
      resetGeneratedState();
      return;
    }

    let ignore = false;
    setInventoryDataSource("loading");

    fetchInventoryBoard({
      hotelCodes: inventoryHotelCodes,
      beginDate: startDate,
      endDate,
    })
      .then((apiInventory) => {
        if (ignore) return;
        setAvailableInventory(apiInventory);
        setInventoryDataSource(apiInventory.length > 0 ? "api" : "empty");
        resetGeneratedState();
      })
      .catch((error) => {
        console.warn("酒店房型库存接口不可用", error);
        if (!ignore) {
          setAvailableInventory([]);
          setInventoryDataSource("error");
          resetGeneratedState();
        }
      });

    return () => {
      ignore = true;
    };
  }, [endDate, hotelDataSource, inventoryHotelCodes, startDate]);

  useEffect(() => {
    if (availableProducts.length === 0) return;
    const availableItineraryKeys = new Set(availableProducts.map(getProductItineraryKey));
    const firstProduct = availableProducts[0];
    const firstItineraryKey = getProductItineraryKey(firstProduct);

    setDraftProductCode((currentProductCode) =>
      availableProducts.some((product) => product.productCode === currentProductCode)
        ? currentProductCode
        : firstProduct.productCode,
    );
    setDraftItineraryKey((currentItineraryKey) =>
      availableItineraryKeys.has(currentItineraryKey) ? currentItineraryKey : firstItineraryKey,
    );
    setAddedItineraryKeys((currentKeys) => {
      const validKeys = currentKeys.filter((key) => availableItineraryKeys.has(key));
      return validKeys;
    });
    resetGeneratedState();
  }, [availableProducts]);

  const handleDateRangeChange = (nextStartDate: string, nextEndDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSelectionError("");
    resetGeneratedState();
  };

  const handleSelectDraftProduct = (productCode: string) => {
    const nextItinerary = availableProducts.find((product) => product.productCode === productCode);
    setDraftProductCode(productCode);
    setDraftItineraryKey(nextItinerary ? getProductItineraryKey(nextItinerary) : "");
    setSelectionError("");
  };

  const handleSelectDraftItinerary = (itineraryKey: string) => {
    setDraftItineraryKey(itineraryKey);
    setSelectionError("");
  };

  const handleAddDraftItinerary = () => {
    if (!draftProductCode || !draftItineraryKey) {
      setSelectionError("请先选择产品和行程。");
      return;
    }

    if (addedItineraryKeys.includes(draftItineraryKey)) {
      setSelectionError("该行程已经在待开团清单中。");
      return;
    }

    setAddedItineraryKeys((currentKeys) => [...currentKeys, draftItineraryKey]);
    setSelectionError("");
    resetGeneratedState();
  };

  const handleRemoveAddedItinerary = (itineraryKey: string) => {
    setAddedItineraryKeys((currentKeys) => currentKeys.filter((key) => key !== itineraryKey));
    setSelectionError("");
    resetGeneratedState();
  };

  const handleClearAddedItineraries = () => {
    setAddedItineraryKeys([]);
    setSelectionError("");
    resetGeneratedState();
  };

  const handleGenerate = () => {
    if (!startDate || !endDate || startDate > endDate) {
      setSelectionError("请先选择有效的开始日期和结束日期。");
      setActiveTab("home");
      return;
    }

    if (selectedProducts.length === 0) {
      setSelectionError("请至少选择一个产品行程。");
      setActiveTab("home");
      return;
    }

    if (inventoryDataSource === "loading") {
      setSelectionError("酒店房型库存接口加载中，请稍后再生成开团计划。");
      setActiveTab("home");
      return;
    }

    if (availableInventory.length === 0) {
      setSelectionError("酒店房型库存接口未返回数据，无法生成开团计划。");
      setActiveTab("home");
      return;
    }

    setSelectionError("");
    const nextResult = generateOpeningPlans({
      products: selectedProducts,
      productOpeningConfigs: openingConfigs,
      hotels: hotelsForPlanning,
      inventory: availableInventory,
      config: initialStrategyConfig,
      startDate,
      endDate,
    });

    const openablePlanIds = nextResult.openingPlans
      .filter((plan) => plan.status === "可开团")
      .map((plan) => plan.planId);
    console.info("mock opening payloads", nextResult.payloads);
    setResult(nextResult);
    setSelectedPlanIds(openablePlanIds);
    setActiveTab("plans");
  };

  const handleTogglePlan = (planId: string, selected: boolean) => {
    setSelectedPlanIds((currentIds) =>
      selected ? [...new Set([...currentIds, planId])] : currentIds.filter((id) => id !== planId),
    );
  };

  const handleSelectAllOpenable = () => {
    setSelectedPlanIds(
      result?.openingPlans.filter((plan) => plan.status === "可开团").map((plan) => plan.planId) ??
        [],
    );
  };

  const handleConfirmOpenings = () => {
    if (!result) return;
    const plansToOpen = result.openingPlans.filter((plan) => selectedPlanIds.includes(plan.planId));
    const batchId = createExecutionBatchId();
    const executedAt = new Date().toISOString();
    const executionRecords = plansToOpen.map((plan, index) =>
      createMockExecutionRecord(plan, index, batchId, executedAt),
    );

    console.info("mock execute opening api result", executionRecords);
    setExecutionHistory((currentRecords) => [...executionRecords, ...currentRecords]);
    setLatestBatchId(batchId);
    setSelectedPlanIds([]);
    setActiveTab("executions");
  };

  const handleExportExecutionBatch = (batchId: string) => {
    const batchRecords = executionHistory.filter((record) => record.batchId === batchId);
    if (batchRecords.length === 0) return;

    const csv = toExecutionCsv(batchRecords, salesTarget, historicalSuccessRate);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `songtsam-opening-${batchId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateProductOpeningConfig = (nextConfig: ProductOpeningConfig) => {
    setOpeningConfigs((currentConfigs) =>
      currentConfigs.map((openingConfig) =>
        openingConfig.productCode === nextConfig.productCode &&
        openingConfig.itineraryCode === nextConfig.itineraryCode
          ? nextConfig
          : openingConfig,
      ),
    );
    resetGeneratedState();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 10,
          colorBgLayout: "#f5f8ff",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
        components: {
          Card: { borderRadiusLG: 14 },
          Button: { borderRadius: 8 },
          Select: { borderRadius: 8 },
          Input: { borderRadius: 8 },
        },
      }}
    >
      <Layout className="songtsam-shell">
        <Header className="songtsam-header">
          <div className="songtsam-header-main">
            <div>
              <Space size={8} className="songtsam-month">
                <CalendarOutlined />
                <Text>
                  {startDate} 至 {endDate}
                </Text>
              </Space>
              <Title level={3} className="songtsam-title">
                松赞基本盘自动开团 Demo
              </Title>
            </div>
            <Space wrap>
              <Tag icon={<FileDoneOutlined />} color="blue">
                {generatedSummary}
              </Tag>
              <Tag icon={<ApartmentOutlined />} color="geekblue">
                {getDataSourceLabel(productDataSource)}
              </Tag>
              <Tag icon={<ApartmentOutlined />} color="cyan">
                {getHotelDataSourceLabel(hotelDataSource, availableHotels.length)}
              </Tag>
              <Tag icon={<TableOutlined />} color="purple">
                {getInventoryDataSourceLabel(
                  inventoryDataSource,
                  availableInventory.length,
                  inventoryHotelCodes.length,
                )}
              </Tag>
            </Space>
          </div>

          <Segmented
            value={activeTab}
            onChange={(value) => setActiveTab(value as TabKey)}
            options={tabs.map((tab) => ({
              value: tab.value,
              label: (
                <Space size={6}>
                  {tab.icon}
                  {tab.label}
                </Space>
              ),
            }))}
          />
        </Header>

        <Content className="songtsam-content">
          {activeTab === "home" ? (
            <AutoOpeningPage
              startDate={startDate}
              endDate={endDate}
              productOptions={allProductOptions}
              draftProductCode={draftProductCode}
              draftItineraryKey={draftItineraryKey}
              draftItineraryOptions={draftItineraryOptions}
              selectedProducts={selectedProducts}
              productOpeningConfigs={openingConfigs}
              config={initialStrategyConfig}
              result={result}
              selectionError={selectionError}
              onDateRangeChange={handleDateRangeChange}
              onSelectDraftProduct={handleSelectDraftProduct}
              onSelectDraftItinerary={handleSelectDraftItinerary}
              onAddDraftItinerary={handleAddDraftItinerary}
              onRemoveAddedItinerary={handleRemoveAddedItinerary}
              onClearAddedItineraries={handleClearAddedItineraries}
              onUpdateProductOpeningConfig={handleUpdateProductOpeningConfig}
              onGenerate={handleGenerate}
            />
          ) : null}

          {activeTab === "plans" ? (
            <OpeningPlanPage
              plans={result?.openingPlans ?? []}
              selectedPlanIds={selectedPlanIds}
              onTogglePlan={handleTogglePlan}
              onSelectAllOpenable={handleSelectAllOpenable}
              onConfirmOpenings={handleConfirmOpenings}
            />
          ) : null}
          {activeTab === "executions" ? (
            <ExecutionResultPage
              records={executionHistory}
              latestBatchId={latestBatchId}
              salesTarget={salesTarget}
              historicalSuccessRate={historicalSuccessRate}
              onSalesTargetChange={setSalesTarget}
              onHistoricalSuccessRateChange={setHistoricalSuccessRate}
              onExportBatch={handleExportExecutionBatch}
            />
          ) : null}
          {activeTab === "inventory" ? <InventoryPage rows={inventoryRows} /> : null}
          {activeTab === "payload" ? <PayloadPage payloads={result?.payloads ?? []} /> : null}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

function getProductItineraryKey(product: Product): string {
  return `${product.productCode}|${product.itineraryCode}`;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildProductOptions(productItineraries: Product[]): ProductOption[] {
  const optionByProductCode = new Map<string, ProductOption>();

  productItineraries.forEach((product) => {
    const current = optionByProductCode.get(product.productCode);
    optionByProductCode.set(product.productCode, {
      productCode: product.productCode,
      productName: product.productName,
      businessType: product.businessType,
      itineraryCount: (current?.itineraryCount ?? 0) + 1,
    });
  });

  return [...optionByProductCode.values()].sort((a, b) =>
    `${a.productCode}-${a.productName}`.localeCompare(`${b.productCode}-${b.productName}`, "zh-CN"),
  );
}

function resolveInventoryHotelCodes(products: Product[], hotels: Hotel[]): string[] {
  const codes = new Set<string>();
  const hotelsByCode = new Map(hotels.map((hotel) => [normalizeHotelKeyword(hotel.hotelCode), hotel]));
  const hotelsByName = new Map<string, Hotel>();

  hotels.forEach((hotel) => {
    hotelsByName.set(normalizeHotelKeyword(hotel.hotelName), hotel);
    hotelsByName.set(normalizeHotelKeyword(hotel.hotelShortName), hotel);
  });

  products.forEach((product) => {
    product.dailyItinerary.forEach((day) => {
      if (!day.hotelCode && !day.hotelName && !day.hotelShortName) return;

      const matchedHotel =
        hotelsByCode.get(normalizeHotelKeyword(day.hotelCode)) ??
        hotelsByName.get(normalizeHotelKeyword(day.hotelName)) ??
        hotelsByName.get(normalizeHotelKeyword(day.hotelShortName)) ??
        findHotelByLooseName(hotels, day.hotelName || day.hotelShortName);

      if (matchedHotel) {
        codes.add(matchedHotel.hotelCode);
      }
    });
  });

  return [...codes].sort();
}

function findHotelByLooseName(hotels: Hotel[], keyword: string): Hotel | undefined {
  const normalizedKeyword = normalizeHotelKeyword(keyword);
  if (!normalizedKeyword) return undefined;

  return hotels.find((hotel) => {
    const hotelName = normalizeHotelKeyword(hotel.hotelName);
    const hotelShortName = normalizeHotelKeyword(hotel.hotelShortName);
    return (
      includesEither(hotelName, normalizedKeyword) ||
      includesEither(hotelShortName, normalizedKeyword)
    );
  });
}

function normalizeHotelKeyword(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function includesEither(left: string, right: string) {
  return Boolean(left && right) && (left.includes(right) || right.includes(left));
}

function getDataSourceLabel(dataSource: "loading" | "api" | "empty" | "error") {
  if (dataSource === "api") return "产品行程接口 / 配置化开团规则";
  if (dataSource === "loading") return "产品行程接口加载中";
  if (dataSource === "empty") return "产品行程接口未返回数据 / 配置化开团规则";
  return "产品行程接口异常 / 配置化开团规则";
}

function getHotelDataSourceLabel(
  dataSource: "loading" | "api" | "empty" | "error",
  hotelCount: number,
) {
  if (dataSource === "api") return `酒店信息接口 / ${hotelCount} 家酒店`;
  if (dataSource === "loading") return "酒店信息接口加载中";
  if (dataSource === "empty") return "酒店信息接口未返回数据";
  return "酒店信息接口异常";
}

function getInventoryDataSourceLabel(
  dataSource: "loading" | "api" | "empty" | "error",
  inventoryCount: number,
  hotelCount: number,
) {
  if (dataSource === "api") return `库存接口 / ${inventoryCount} 条库存`;
  if (dataSource === "loading") return "库存接口加载中";
  if (hotelCount === 0) return "选择行程后查询库存";
  if (dataSource === "empty") return "库存接口未返回数据";
  return "库存接口异常";
}

function createExecutionBatchId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  return `BATCH-${stamp}`;
}

function createMockExecutionRecord(
  plan: OpeningPlan,
  index: number,
  batchId: string,
  executedAt: string,
): OpeningExecutionRecord {
  const payload = generateOpeningPayload(plan);
  const failed = shouldMockOpeningFail(plan, index);

  return {
    executionId: `${batchId}-${plan.planId}`,
    batchId,
    executedAt,
    planId: plan.planId,
    productCode: plan.productCode,
    productName: plan.productName,
    itineraryCode: plan.itineraryCode,
    itineraryName: plan.itineraryName,
    businessType: plan.businessType,
    departureDate: plan.departureDate,
    channels: plan.channels,
    groupSize: plan.groupSize,
    roomCount: plan.roomCount,
    priceConfig: plan.priceConfig,
    roomSummary: summarizePlanRooms(plan),
    status: failed ? "开团失败" : "开团成功",
    groupPeriodNo: failed ? undefined : createGroupPeriodNo(plan, index),
    failureReason: failed
      ? "mock 开团接口返回库存状态已变化，请重新生成计划后再确认。"
      : undefined,
    payload,
  };
}

function shouldMockOpeningFail(plan: OpeningPlan, index: number) {
  const dayOfMonth = Number(plan.departureDate.slice(8, 10));
  return dayOfMonth % 10 === 0 || (index + 1) % 7 === 0;
}

function createGroupPeriodNo(plan: OpeningPlan, index: number) {
  return `TQ-${plan.departureDate.replace(/-/g, "")}-${plan.productCode}-${String(index + 1).padStart(3, "0")}`;
}

function summarizePlanRooms(plan: OpeningPlan) {
  const roomSummaryByType = new Map<string, { name: string; quantity: number }>();

  plan.resourceUsage.forEach((usage) => {
    const existing = roomSummaryByType.get(usage.roomTypeCode);
    roomSummaryByType.set(usage.roomTypeCode, {
      name: usage.roomTypeName,
      quantity: Math.max(existing?.quantity ?? 0, usage.quantity),
    });
  });

  const summaries = [...roomSummaryByType.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .map((summary) => `${summary.name} ${summary.quantity} 间`);

  return summaries.length > 0 ? summaries.join("、") : `${plan.roomCount} 间`;
}

function toExecutionCsv(
  records: OpeningExecutionRecord[],
  salesTarget: number | null,
  historicalSuccessRate: number | null,
) {
  const salesSummary = summarizeExecutionSales(records, salesTarget, historicalSuccessRate);
  const headers = [
    "执行批次",
    "执行时间",
    "执行状态",
    "团期号",
    "失败原因",
    "出发日期",
    "业务类型",
    "渠道",
    "价格类型",
    "价格配置",
    "产品代码",
    "产品名称",
    "行程代码",
    "行程名称",
    "最大人数库存",
    "房间数",
    "团期销售价值",
    "本次团期总销售价值",
    "总销售目标",
    "目标占比",
    "历史成团率",
    "预估销售额",
    "价格待填写团期",
    "房型房数",
  ];
  const rows = records.map((record) => {
    const recordSalesValue =
      record.status === "开团成功" ? calculateExecutionRecordSalesValue(record) : null;

    return [
      record.batchId,
      record.executedAt,
      record.status,
      record.groupPeriodNo ?? "",
      record.failureReason ?? "",
      record.departureDate,
      record.businessType,
      record.channels.join("、"),
      record.priceConfig?.priceType ?? "",
      summarizePriceConfig(record.priceConfig),
      record.productCode,
      record.productName,
      record.itineraryCode,
      record.itineraryName,
      String(record.groupSize),
      String(record.roomCount),
      record.status === "开团成功" ? formatCsvAmount(recordSalesValue) : "不计入",
      formatCsvAmount(salesSummary.totalSalesValue),
      formatCsvAmount(salesTarget),
      formatCsvRatio(salesSummary.targetRatio),
      historicalSuccessRate === null ? "" : `${historicalSuccessRate}%`,
      formatCsvAmount(salesSummary.estimatedSalesValue),
      String(salesSummary.missingPriceCount),
      record.roomSummary,
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function summarizePriceConfig(priceConfig: OpeningExecutionRecord["priceConfig"]) {
  if (!priceConfig) return "";

  if (priceConfig.priceType === "人") {
    const guarantee =
      priceConfig.guaranteeAmount !== undefined
        ? `，保底${formatCsvAmount(priceConfig.guaranteeAmount)}`
        : "";
    return `成人价${formatCsvAmount(priceConfig.adultPrice)}，单间差${formatCsvAmount(priceConfig.singleRoomSupplement)}${guarantee}`;
  }

  if (priceConfig.priceType === "家庭") {
    const familyPrices = priceConfig.familyPrices
      .map(
        (item) =>
          `${item.familyCode}:大童${formatCsvAmount(item.bigChildPrice)}/中童${formatCsvAmount(item.middleChildPrice)}/幼童${formatCsvAmount(item.smallChildPrice)}`,
      )
      .join("；");
    return `单间差${formatCsvAmount(priceConfig.singleRoomSupplement)}；${familyPrices || "规格待配置"}`;
  }

  return `${formatCsvAmount(priceConfig.packagePeople)}人套，${formatCsvAmount(priceConfig.adultCount)}成人价${formatCsvAmount(priceConfig.packagePrice)}`;
}

function formatCsvAmount(value: number | null | undefined) {
  return value === null || value === undefined ? "待填写" : String(value);
}

function formatCsvRatio(value: number | null | undefined) {
  return value === null || value === undefined ? "" : `${(value * 100).toFixed(1)}%`;
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default App;
