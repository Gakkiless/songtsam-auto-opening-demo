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

export function AutoOpeningPage({
  startDate,
  endDate,
  productOptions,
  selectedProductKeys,
  selectedProducts,
  productOpeningConfigs,
  config,
  result,
  selectionError,
  onDateRangeChange,
  onSelectProductItineraries,
  onGenerate,
}: {
  startDate: string;
  endDate: string;
  productOptions: Product[];
  selectedProductKeys: string[];
  selectedProducts: Product[];
  productOpeningConfigs: ProductOpeningConfig[];
  config: StrategyConfig;
  result: GenerateOpeningResult | null;
  selectionError: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onSelectProductItineraries: (productKeys: string[]) => void;
  onGenerate: () => void;
}) {
  const openableCount = result?.openingPlans.filter((plan) => plan.status === "可开团").length ?? 0;
  const insufficientCount =
    result?.openingPlans.filter((plan) => plan.status === "资源不足").length ?? 0;
  const conflictCount = result?.openingPlans.filter((plan) => plan.status === "规则冲突").length ?? 0;

  const productSelectOptions = productOptions.map((product) => ({
    value: getProductItineraryKey(product),
    label: `${product.productCode} / ${product.productName} / ${product.itineraryCode} / ${product.itineraryName} / ${product.businessType}`,
    searchText:
      `${product.productCode} ${product.productName} ${product.itineraryCode} ${product.itineraryName} ${product.businessType} ${getItineraryShortCode(product)}`.toLowerCase(),
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
                <Text strong>产品 / 行程</Text>
                <Select
                  aria-label="产品行程"
                  mode="multiple"
                  showSearch
                  value={selectedProductKeys}
                  onChange={onSelectProductItineraries}
                  options={productSelectOptions}
                  filterOption={(input, option) =>
                    String((option as { searchText?: string })?.searchText ?? "").includes(
                      input.trim().toLowerCase(),
                    )
                  }
                  maxTagCount="responsive"
                  suffixIcon={<SearchOutlined />}
                  placeholder="输入产品代码、产品名称、行程代码或行程名称"
                  className="full-width control-input"
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
            const productConfig = getProductConfig(productOpeningConfigs, product.productCode);

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
                      {productConfig
                        ? `${productConfig.defaultGroupSize} 人 / ${productConfig.defaultRoomCount} 间`
                        : "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="开团频次">
                      {productConfig
                        ? getFrequencyLabel(config.businessFrequencyRules, productConfig.frequencyRuleId)
                        : "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="出发日限制">
                      {productConfig?.allowedDepartureRule.description ?? "未配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="首选/次选发团日">
                      {productConfig && productConfig.preferredWeekdays.length > 0
                        ? formatWeekdays(productConfig.preferredWeekdays)
                        : "不配置"}
                    </Descriptions.Item>
                    <Descriptions.Item label="参与基本盘">
                      {productConfig?.enabled ? <Tag color="green">是</Tag> : <Tag>否</Tag>}
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
          <Empty description="请选择一个或多个产品行程" />
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

function getProductConfig(configs: ProductOpeningConfig[], productCode: string) {
  return configs.find((openingConfig) => openingConfig.productCode === productCode) ?? null;
}

function getProductItineraryKey(product: Product): string {
  return `${product.productCode}|${product.itineraryCode}`;
}

function getFrequencyLabel(rules: BusinessFrequencyRule[], ruleId: string) {
  return rules.find((rule) => rule.ruleId === ruleId)?.label ?? `未找到频次规则 ${ruleId}`;
}
