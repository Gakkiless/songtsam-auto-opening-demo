import {
  CalendarOutlined,
  CheckCircleOutlined,
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
import { formatWeekdays, getItineraryShortCode } from "../engine/openingEngine";
import type {
  BusinessFrequencyRule,
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
  month,
  productOptions,
  itineraryOptions,
  selectedProductCode,
  selectedItineraryCode,
  selectedProduct,
  selectedProductConfig,
  config,
  result,
  selectionError,
  onMonthChange,
  onSelectProduct,
  onSelectItinerary,
  onGenerate,
}: {
  month: string;
  productOptions: ProductOption[];
  itineraryOptions: Product[];
  selectedProductCode: string;
  selectedItineraryCode: string;
  selectedProduct: Product | null;
  selectedProductConfig: ProductOpeningConfig | null;
  config: StrategyConfig;
  result: GenerateOpeningResult | null;
  selectionError: string;
  onMonthChange: (month: string) => void;
  onSelectProduct: (productCode: string) => void;
  onSelectItinerary: (itineraryCode: string) => void;
  onGenerate: () => void;
}) {
  const openableCount = result?.openingPlans.filter((plan) => plan.status === "可开团").length ?? 0;
  const insufficientCount =
    result?.openingPlans.filter((plan) => plan.status === "资源不足").length ?? 0;
  const conflictCount = result?.openingPlans.filter((plan) => plan.status === "规则冲突").length ?? 0;

  const productSelectOptions = productOptions.map((option) => ({
    value: option.productCode,
    label: `${option.productCode} / ${option.productName} / ${option.businessType} / ${option.itineraryCount} 条行程`,
    searchText: `${option.productCode} ${option.productName} ${option.businessType}`.toLowerCase(),
  }));

  return (
    <Space orientation="vertical" size={18} className="page-stack">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="开团条件" className="control-card">
            <Space orientation="vertical" size={14} className="full-width">
              <div>
                <Text strong>月份</Text>
                <Input
                  type="month"
                  value={month}
                  onChange={(event) => onMonthChange(event.target.value)}
                  prefix={<CalendarOutlined />}
                  className="control-input"
                />
              </div>

              <div>
                <Text strong>产品</Text>
                <Select
                  aria-label="产品"
                  showSearch
                  value={selectedProductCode}
                  onChange={onSelectProduct}
                  options={productSelectOptions}
                  filterOption={(input, option) =>
                    String(option?.searchText ?? "").includes(input.trim().toLowerCase())
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
                  value={selectedItineraryCode}
                  onChange={onSelectItinerary}
                  placeholder="选择该产品下的行程"
                  className="full-width control-input"
                  options={itineraryOptions.map((product) => ({
                    value: product.itineraryCode,
                    label: `${product.itineraryCode} / ${product.itineraryName} / ${getItineraryShortCode(product)}`,
                  }))}
                />
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
              <MetricCard title="当前行程" value={selectedProduct ? 1 : 0} suffix="条" />
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
            title={`公共池最多使用 ${Math.round(config.baseRoomMaxUsageRatio * 100)}%，高级房型会触发涨价，第一版只标记不足。`}
          />
        </Col>
      </Row>

      {selectedProduct ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card
              title={
                <Space wrap>
                  <span>{selectedProduct.productName}</span>
                  <Tag color="blue">{selectedProduct.businessType}</Tag>
                </Space>
              }
            >
              <Descriptions column={{ xs: 1, md: 3 }} size="small" className="section-gap">
                <Descriptions.Item label="产品">{selectedProduct.productCode}</Descriptions.Item>
                <Descriptions.Item label="行程">{selectedProduct.itineraryCode}</Descriptions.Item>
                <Descriptions.Item label="行程名称">{selectedProduct.itineraryName}</Descriptions.Item>
                <Descriptions.Item label="行程天数">{selectedProduct.tripDays} 天</Descriptions.Item>
                <Descriptions.Item label="酒店简称">
                  {getItineraryShortCode(selectedProduct)}
                </Descriptions.Item>
                <Descriptions.Item label="默认规模">
                  {selectedProductConfig
                    ? `${selectedProductConfig.defaultGroupSize} 人 / ${selectedProductConfig.defaultRoomCount} 间`
                    : "未配置"}
                </Descriptions.Item>
              </Descriptions>

              <Table
                rowKey={(record) => `${selectedProduct.itineraryCode}-${record.dayIndex}`}
                size="small"
                pagination={false}
                dataSource={selectedProduct.dailyItinerary}
                columns={[
                  {
                    title: "天数",
                    dataIndex: "dayIndex",
                    width: 80,
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
                    width: 90,
                  },
                  {
                    title: "每日活动",
                    dataIndex: "activityName",
                  },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card title="本产品开团配置">
              {selectedProductConfig ? (
                <Space orientation="vertical" size={14} className="full-width">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="是否参与基本盘">
                      {selectedProductConfig.enabled ? <Tag color="green">是</Tag> : <Tag>否</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="开团频次">
                      {getFrequencyLabel(
                        config.businessFrequencyRules,
                        selectedProductConfig.frequencyRuleId,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="出发日限制">
                      {selectedProductConfig.allowedDepartureRule.description}
                    </Descriptions.Item>
                    <Descriptions.Item label="首选/次选发团日">
                      {selectedProductConfig.preferredWeekdays.length > 0
                        ? formatWeekdays(selectedProductConfig.preferredWeekdays)
                        : "不配置"}
                    </Descriptions.Item>
                  </Descriptions>

                  <div className="preference-list">
                    <Text strong>房型偏好</Text>
                    {selectedProductConfig.roomTypePreferences.map((preference) => (
                      <div
                        className="preference-item"
                        key={`${preference.hotelCode}-${preference.roomTypeCode ?? preference.roomClass}`}
                      >
                        <Text strong>{preference.hotelCode}</Text>
                        <Text type="secondary">
                          {preference.roomTypeCode ?? preference.roomClass} / {preference.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                </Space>
              ) : (
                <Alert type="error" showIcon title="未找到该产品的基本盘开团配置。" />
              )}
            </Card>
          </Col>
        </Row>
      ) : (
        <Card>
          <Empty description="请选择产品和行程" />
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

function getFrequencyLabel(rules: BusinessFrequencyRule[], ruleId: string) {
  return rules.find((rule) => rule.ruleId === ruleId)?.label ?? `未找到频次规则 ${ruleId}`;
}
