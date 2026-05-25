import { useMemo, useState } from "react";
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
import {
  hotels,
  inventory,
  productOpeningConfigs as initialProductOpeningConfigs,
  products,
  strategyConfig as initialStrategyConfig,
} from "./config/data";
import { generateOpeningPayload, generateOpeningPlans } from "./engine/openingEngine";
import { AutoOpeningPage } from "./pages/AutoOpeningPage";
import { ExecutionResultPage } from "./pages/ExecutionResultPage";
import { InventoryPage } from "./pages/InventoryPage";
import { OpeningPlanPage } from "./pages/OpeningPlanPage";
import { PayloadPage } from "./pages/PayloadPage";
import type {
  GenerateOpeningResult,
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
  const [draftProductCode, setDraftProductCode] = useState("P001");
  const [draftItineraryKey, setDraftItineraryKey] = useState("P001|IT-XMMLB-7D");
  const [addedItineraryKeys, setAddedItineraryKeys] = useState(["P001|IT-XMMLB-7D"]);
  const [selectionError, setSelectionError] = useState("");
  const [result, setResult] = useState<GenerateOpeningResult | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [executionHistory, setExecutionHistory] = useState<OpeningExecutionRecord[]>([]);
  const [latestBatchId, setLatestBatchId] = useState("");
  const [openingConfigs, setOpeningConfigs] = useState<ProductOpeningConfig[]>(() =>
    cloneValue(initialProductOpeningConfigs),
  );

  const allProductOptions = useMemo(() => buildProductOptions(products), []);

  const draftItineraryOptions = useMemo(
    () => products.filter((product) => product.productCode === draftProductCode),
    [draftProductCode],
  );

  const selectedProducts = useMemo(() => {
    const selectedKeySet = new Set(addedItineraryKeys);
    return products.filter((product) => selectedKeySet.has(getProductItineraryKey(product)));
  }, [addedItineraryKeys]);

  const generatedSummary = useMemo(() => {
    if (!result) return "未生成";
    const openable = result.openingPlans.filter((plan) => plan.status === "可开团").length;
    const blocked = result.openingPlans.length - openable;
    return `${openable} 待确认 / ${blocked} 需处理`;
  }, [result]);

  const resetGeneratedState = () => {
    setResult(null);
    setSelectedPlanIds([]);
  };

  const handleDateRangeChange = (nextStartDate: string, nextEndDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSelectionError("");
    resetGeneratedState();
  };

  const handleSelectDraftProduct = (productCode: string) => {
    const nextItinerary = products.find((product) => product.productCode === productCode);
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

    setSelectionError("");
    const nextResult = generateOpeningPlans({
      products: selectedProducts,
      productOpeningConfigs: openingConfigs,
      hotels,
      inventory,
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

    const csv = toExecutionCsv(batchRecords);
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
                产品行程 Mock / 配置化开团规则
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
              onExportBatch={handleExportExecutionBatch}
            />
          ) : null}
          {activeTab === "inventory" ? <InventoryPage rows={result?.inventoryRows ?? []} /> : null}
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

function toExecutionCsv(records: OpeningExecutionRecord[]) {
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
    "房型房数",
  ];
  const rows = records.map((record) => [
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
    record.roomSummary,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function summarizePriceConfig(priceConfig: OpeningExecutionRecord["priceConfig"]) {
  if (!priceConfig) return "";

  if (priceConfig.priceType === "人") {
    const guarantee = priceConfig.guaranteeAmount ? `，保底${priceConfig.guaranteeAmount}` : "";
    return `成人价${priceConfig.adultPrice}，单间差${priceConfig.singleRoomSupplement}${guarantee}`;
  }

  if (priceConfig.priceType === "家庭") {
    const familyPrices = priceConfig.familyPrices
      .map(
        (item) =>
          `${item.familyCode}:大童${item.bigChildPrice}/中童${item.middleChildPrice}/幼童${item.smallChildPrice}`,
      )
      .join("；");
    return `单间差${priceConfig.singleRoomSupplement}；${familyPrices}`;
  }

  return `${priceConfig.packagePeople}人套，${priceConfig.adultCount}成人价${priceConfig.packagePrice}`;
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default App;
