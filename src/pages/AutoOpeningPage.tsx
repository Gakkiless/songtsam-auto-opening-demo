import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { CSSProperties, ReactNode } from "react";
import {
  formatWeekdays,
  getItineraryShortCode,
  resolveOpeningConfig,
} from "../engine/openingEngine";
import type {
  GenerateOpeningResult,
  Product,
  ProductOpeningConfig,
  StrategyConfig,
} from "../types/domain";

const { Text } = Typography;

interface ProductOption {
  productCode: string;
  productName: string;
  businessType: Product["businessType"];
  itineraryCount: number;
}

export function AutoOpeningPage({
  startDate,
  endDate,
  productOptions,
  draftProductCode,
  draftItineraryKey,
  draftItineraryOptions,
  selectedProducts,
  productOpeningConfigs,
  config,
  result,
  selectionError,
  onDateRangeChange,
  onSelectDraftProduct,
  onSelectDraftItinerary,
  onAddDraftItinerary,
  onRemoveAddedItinerary,
  onClearAddedItineraries,
  onGenerate,
}: {
  startDate: string;
  endDate: string;
  productOptions: ProductOption[];
  draftProductCode: string;
  draftItineraryKey: string;
  draftItineraryOptions: Product[];
  selectedProducts: Product[];
  productOpeningConfigs: ProductOpeningConfig[];
  config: StrategyConfig;
  result: GenerateOpeningResult | null;
  selectionError: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onSelectDraftProduct: (productCode: string) => void;
  onSelectDraftItinerary: (itineraryKey: string) => void;
  onAddDraftItinerary: () => void;
  onRemoveAddedItinerary: (itineraryKey: string) => void;
  onClearAddedItineraries: () => void;
  onGenerate: () => void;
}) {
  const openableCount = result?.openingPlans.filter((plan) => plan.status === "可开团").length ?? 0;
  const insufficientCount =
    result?.openingPlans.filter((plan) => plan.status === "资源不足").length ?? 0;
  const conflictCount = result?.openingPlans.filter((plan) => plan.status === "规则冲突").length ?? 0;

  const productSelectOptions = productOptions.map((product) => ({
    value: product.productCode,
    label: `${product.productCode} / ${product.productName} / ${product.businessType} / ${product.itineraryCount} 条行程`,
    searchText: `${product.productCode} ${product.productName} ${product.businessType}`.toLowerCase(),
  }));
  const itinerarySelectOptions = draftItineraryOptions.map((itinerary) => ({
    value: getProductItineraryKey(itinerary),
    label: `${itinerary.itineraryCode} / ${itinerary.itineraryName} / ${getItineraryShortCode(itinerary)}`,
    searchText:
      `${itinerary.productCode} ${itinerary.productName} ${itinerary.itineraryCode} ${itinerary.itineraryName} ${itinerary.businessType} ${getItineraryShortCode(itinerary)}`.toLowerCase(),
  }));

  return (
    <Space orientation="vertical" size={18} className="page-stack">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="开团条件" className="control-card">
            <Space orientation="vertical" size={14} className="full-width">
              <div>
                <Text strong>日期区间</Text>
                <Row gutter={10} className="control-input">
                  <Col span={12}>
                    <Input
                      aria-label="开始日期"
                      type="date"
                      value={startDate}
                      onChange={(event) => onDateRangeChange(event.target.value, endDate)}
                      prefix={<CalendarOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      aria-label="结束日期"
                      type="date"
                      value={endDate}
                      onChange={(event) => onDateRangeChange(startDate, event.target.value)}
                      prefix={<CalendarOutlined />}
                    />
                  </Col>
                </Row>
              </div>

              <div>
                <Text strong>产品</Text>
                <Select
                  aria-label="产品"
                  showSearch
                  value={draftProductCode}
                  onChange={onSelectDraftProduct}
                  options={productSelectOptions}
                  filterOption={(input, option) =>
                    String((option as { searchText?: string })?.searchText ?? "").includes(
                      input.trim().toLowerCase(),
                    )
                  }
                  suffixIcon={<SearchOutlined />}
                  placeholder="输入产品代码、产品名称或业务类型"
                  className="full-width control-input"
                />
              </div>

              <div>
                <Text strong>行程</Text>
                <Select
                  aria-label="行程"
                  showSearch
                  disabled={!draftProductCode}
                  value={draftItineraryKey}
                  onChange={onSelectDraftItinerary}
                  options={itinerarySelectOptions}
                  filterOption={(input, option) =>
                    String((option as { searchText?: string })?.searchText ?? "").includes(
                      input.trim().toLowerCase(),
                    )
                  }
                  suffixIcon={<SearchOutlined />}
                  placeholder={
                    draftProductCode
                      ? "输入行程代码、行程名称或酒店简称"
                      : "请先选择产品"
                  }
                  className="full-width control-input"
                />
                <Space size={8} wrap className="control-actions">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onAddDraftItinerary}
                    disabled={!draftProductCode || !draftItineraryKey}
                  >
                    添加到待开团清单
                  </Button>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={onClearAddedItineraries}
                    disabled={selectedProducts.length === 0}
                  >
                    清空清单
                  </Button>
                </Space>
              </div>

              <div className="added-itinerary-list">
                <Space align="center" className="full-width added-itinerary-header">
                  <Text strong>待开团清单</Text>
                  <Tag color="blue">{selectedProducts.length} 条</Tag>
                </Space>
                {selectedProducts.length > 0 ? (
                  <Space wrap size={[6, 8]}>
                    {selectedProducts.map((product) => (
                      <Tag
                        closable
                        key={getProductItineraryKey(product)}
                        onClose={(event) => {
                          event.preventDefault();
                          onRemoveAddedItinerary(getProductItineraryKey(product));
                        }}
                      >
                        {product.productCode} / {product.itineraryName}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">先选择产品和行程，再添加到清单。</Text>
                )}
              </div>

              {selectionError ? <Alert type="error" showIcon title={selectionError} /> : null}

              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={onGenerate}
                block
              >
                生成待确认计划
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Row gutter={[16, 16]}>
            <Col xs={12} xl={6}>
              <MetricCard title="当前行程" value={selectedProducts.length} suffix="条" />
            </Col>
            <Col xs={12} xl={6}>
              <MetricCard
                title="可开团"
                value={openableCount}
                contentStyle={{ color: "#1677ff" }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} xl={6}>
              <MetricCard
                title="资源不足"
                value={insufficientCount}
                contentStyle={insufficientCount > 0 ? { color: "#cf1322" } : undefined}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={12} xl={6}>
              <MetricCard
                title="规则冲突"
                value={conflictCount}
                prefix={<SettingOutlined />}
              />
            </Col>
          </Row>

          <Alert
            className="rule-alert"
            type="info"
            showIcon
            title="库存校验按公共池全量判断；高级房型会触发涨价，基本盘第一版只使用基础房型。"
          />
        </Col>
      </Row>

      {selectedProducts.length > 0 ? (
        <Row gutter={[16, 16]}>
          {selectedProducts.map((product) => {
            const resolvedOpeningConfig = resolveOpeningConfig(
              product,
              productOpeningConfigs,
              config.businessTypeOpeningRules,
            ).openingConfig;

            return (
              <Col xs={24} xl={12} key={getProductItineraryKey(product)}>
                <Card
                  title={
                    <Space wrap>
                      <span>{product.productName}</span>
                      <Tag color="blue">{product.businessType}</Tag>
                    </Space>
                  }
                >
                  <Descriptions column={{ xs: 1, md: 2 }} size="small" className="section-gap">
                    <Descriptions.Item label="产品">{product.productCode}</Descriptions.Item>
                    <Descriptions.Item label="行程">{product.itineraryCode}</Descriptions.Item>
                    <Descriptions.Item label="行程名称">{product.itineraryName}</Descriptions.Item>
                    <Descriptions.Item label="行程天数">{product.tripDays} 天</Descriptions.Item>
                    <Descriptions.Item label="酒店简称">
                      {getItineraryShortCode(product)}
                    </Descriptions.Item>
                    <Descriptions.Item label="默认规模">
                      {resolvedOpeningConfig
                        ? `${resolvedOpeningConfig.defaultGroupSize} 人 / ${resolvedOpeningConfig.defaultRoomCount} 间`
                        : "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="开团频次">
                      {resolvedOpeningConfig ? getFrequencyLabel(resolvedOpeningConfig) : "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="出发日限制">
                      {resolvedOpeningConfig?.allowedDepartureRule.description ?? "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="首选/次选发团日">
                      {resolvedOpeningConfig
                        ? formatPreferredWeekdays(
                            resolvedOpeningConfig.preferredWeekdays,
                            resolvedOpeningConfig.fallbackWeekdays,
                          )
                        : "不配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="参与基本盘">
                      {resolvedOpeningConfig?.enabled ? <Tag color="green">是</Tag> : <Tag>否</Tag>}
                    </Descriptions.Item>
                  </Descriptions>

                  <Table
                    rowKey={(record) => `${product.itineraryCode}-${record.dayIndex}`}
                    size="small"
                    pagination={false}
                    dataSource={product.dailyItinerary}
                    columns={[
                      {
                        title: "天数",
                        dataIndex: "dayIndex",
                        width: 70,
                        render: (dayIndex: number) => <Tag>D{dayIndex}</Tag>,
                      },
                      {
                        title: "酒店",
                        dataIndex: "hotelName",
                        render: (_: string, record) => (
                          <Space orientation="vertical" size={0}>
                            <Text>{record.hotelName}</Text>
                            <Text type="secondary">{record.hotelCode}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: "简称",
                        dataIndex: "hotelShortName",
                        width: 70,
                      },
                      {
                        title: "每日活动",
                        dataIndex: "activityName",
                      },
                    ]}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Card>
          <Empty description="请先把一个或多个行程添加到待开团清单" />
        </Card>
      )}
    </Space>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  prefix,
  contentStyle,
}: {
  title: string;
  value: number;
  suffix?: string;
  prefix?: ReactNode;
  contentStyle?: CSSProperties;
}) {
  return (
    <Card className="metric-card">
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        prefix={prefix}
        styles={contentStyle ? { content: contentStyle } : undefined}
      />
    </Card>
  );
}

function getProductItineraryKey(product: Product): string {
  return `${product.productCode}|${product.itineraryCode}`;
}

function getFrequencyLabel(config: {
  ruleLabel: string;
  frequencyType: string;
  intervalDays?: number;
}) {
  if (config.frequencyType === "intervalDays") {
    return `${config.ruleLabel} / 每 ${config.intervalDays ?? 1} 天`;
  }

  return config.ruleLabel;
}

function formatPreferredWeekdays(preferredWeekdays: number[], fallbackWeekdays: number[]) {
  const preferredLabel = preferredWeekdays.length > 0 ? formatWeekdays(preferredWeekdays) : "不配置";
  const fallbackLabel = fallbackWeekdays.length > 0 ? formatWeekdays(fallbackWeekdays) : "不配置";

  return `首选 ${preferredLabel} / 次选 ${fallbackLabel}`;
}
