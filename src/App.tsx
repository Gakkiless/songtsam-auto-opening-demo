import { useMemo, useState } from "react";
import {
  ApartmentOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { ConfigProvider, Layout, Segmented, Space, Tag, Typography, theme } from "antd";
import {
  hotels,
  inventory,
  productOpeningConfigs,
  products,
  strategyConfig,
} from "./config/data";
import { generateOpeningPayload, generateOpeningPlans } from "./engine/openingEngine";
import { AutoOpeningPage } from "./pages/AutoOpeningPage";
import { InventoryPage } from "./pages/InventoryPage";
import { OpeningPlanPage } from "./pages/OpeningPlanPage";
import { PayloadPage } from "./pages/PayloadPage";
import type { GenerateOpeningResult, OpeningPayload, Product } from "./types/domain";

type TabKey = "home" | "plans" | "inventory" | "payload";

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const tabs = [
  { value: "home" as const, label: "自动开团", icon: <DashboardOutlined /> },
  { value: "plans" as const, label: "待确认计划", icon: <FileDoneOutlined /> },
  { value: "inventory" as const, label: "酒店资源占用表", icon: <TableOutlined /> },
  { value: "payload" as const, label: "Payload 预览", icon: <FileTextOutlined /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [selectedProductKeys, setSelectedProductKeys] = useState(["P001|IT-XMMLB-7D"]);
  const [selectionError, setSelectionError] = useState("");
  const [result, setResult] = useState<GenerateOpeningResult | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [executedPayloads, setExecutedPayloads] = useState<OpeningPayload[]>([]);
  const [executionMessage, setExecutionMessage] = useState("");

  const allProductOptions = useMemo(() => products, []);

  const selectedProducts = useMemo(() => {
    const selectedKeySet = new Set(selectedProductKeys);
    return products.filter((product) => selectedKeySet.has(getProductItineraryKey(product)));
  }, [selectedProductKeys]);

  const generatedSummary = useMemo(() => {
    if (!result) return "未生成";
    const openable = result.openingPlans.filter((plan) => plan.status === "可开团").length;
    const blocked = result.openingPlans.length - openable;
    return `${openable} 待确认 / ${blocked} 需处理`;
  }, [result]);

  const resetGeneratedState = () => {
    setResult(null);
    setSelectedPlanIds([]);
    setExecutedPayloads([]);
    setExecutionMessage("");
  };

  const handleDateRangeChange = (nextStartDate: string, nextEndDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSelectionError("");
    resetGeneratedState();
  };

  const handleSelectProductItineraries = (productKeys: string[]) => {
    setSelectedProductKeys(productKeys);
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
      productOpeningConfigs,
      hotels,
      inventory,
      config: strategyConfig,
      startDate,
      endDate,
    });

    const openablePlanIds = nextResult.openingPlans
      .filter((plan) => plan.status === "可开团")
      .map((plan) => plan.planId);
    console.info("mock opening payloads", nextResult.payloads);
    setResult(nextResult);
    setSelectedPlanIds(openablePlanIds);
    setExecutedPayloads([]);
    setExecutionMessage("");
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
    const payloadsToExecute = plansToOpen.map((plan) => generateOpeningPayload(plan));

    console.info("mock execute opening api", payloadsToExecute);
    setExecutedPayloads(payloadsToExecute);
    setExecutionMessage(
      `已模拟执行 ${payloadsToExecute.length} 条开团接口；真实系统会在这里重新校验库存并提交开团。`,
    );
    setActiveTab("payload");
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
              selectedProductKeys={selectedProductKeys}
              selectedProducts={selectedProducts}
              productOpeningConfigs={productOpeningConfigs}
              config={strategyConfig}
              result={result}
              selectionError={selectionError}
              onDateRangeChange={handleDateRangeChange}
              onSelectProductItineraries={handleSelectProductItineraries}
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
          {activeTab === "inventory" ? <InventoryPage rows={result?.inventoryRows ?? []} /> : null}
          {activeTab === "payload" ? (
            <PayloadPage
              payloads={result?.payloads ?? []}
              executedPayloads={executedPayloads}
              executionMessage={executionMessage}
            />
          ) : null}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

function getProductItineraryKey(product: Product): string {
  return `${product.productCode}|${product.itineraryCode}`;
}

export default App;
