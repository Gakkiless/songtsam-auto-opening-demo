import {
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
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  formatWeekdays,
  getItineraryShortCode,
  resolveOpeningConfig,
} from "../engine/openingEngine";
import type {
  AllowedDepartureRule,
  GenerateOpeningResult,
  OpeningChannel,
  OpeningRuleOverride,
  PriceConfig,
  Product,
  ProductOpeningConfig,
  StrategyConfig,
} from "../types/domain";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const weekdayOptions = [
  { label: "周日", value: 0 },
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
];

const frequencyOptions = [
  { label: "每日开团", value: "daily" },
  { label: "每 N 天", value: "intervalDays" },
  { label: "每周指定星期", value: "weekly" },
];

const departureRuleOptions = [
  { label: "不限出发日", value: "none" },
  { label: "只能单数日", value: "oddDays" },
  { label: "只能双数日", value: "evenDays" },
  { label: "指定星期", value: "weekdays" },
];

const channelOptions: { label: OpeningChannel; value: OpeningChannel }[] = [
  { label: "WECHAT", value: "WECHAT" },
  { label: "CRS", value: "CRS" },
  { label: "小红书", value: "小红书" },
  { label: "招商银行", value: "招商银行" },
];

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
  onUpdateProductOpeningConfig,
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
  onUpdateProductOpeningConfig: (config: ProductOpeningConfig) => void;
  onGenerate: () => void;
}) {
  const [configModalKey, setConfigModalKey] = useState<string | null>(null);
  const openableCount = result?.openingPlans.filter((plan) => plan.status === "可开团").length ?? 0;
  const insufficientCount =
    result?.openingPlans.filter((plan) => plan.status === "资源不足").length ?? 0;
  const conflictCount = result?.openingPlans.filter((plan) => plan.status === "规则冲突").length ?? 0;

  const productSelectOptions = productOptions.map((product) => ({
    value: product.productCode,
    label: `${product.productCode} / ${product.productName}`,
    searchText: `${product.productCode} ${product.productName} ${product.businessType}`.toLowerCase(),
  }));
  const itinerarySelectOptions = draftItineraryOptions.map((itinerary) => ({
    value: getProductItineraryKey(itinerary),
    label: `${itinerary.itineraryCode} / ${itinerary.itineraryName} / ${itinerary.businessType}`,
    searchText:
      `${itinerary.productCode} ${itinerary.productName} ${itinerary.itineraryCode} ${itinerary.itineraryName} ${itinerary.businessType} ${getItineraryShortCode(itinerary)}`.toLowerCase(),
  }));
  const configModalProduct = selectedProducts.find(
    (product) => getProductItineraryKey(product) === configModalKey,
  );
  const configModalOpeningConfig = configModalProduct
    ? getProductOpeningConfig(productOpeningConfigs, configModalProduct)
    : undefined;
  const configModalResolvedOpeningConfig = configModalProduct
    ? resolveOpeningConfig(
        configModalProduct,
        productOpeningConfigs,
        config.businessTypeOpeningRules,
      ).openingConfig
    : null;

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="开团条件" className="control-card">
            <Space direction="vertical" size={14} className="full-width">
              <div>
                <Text strong>日期区间</Text>
                <RangePicker
                  allowClear={false}
                  aria-label="日期区间"
                  className="full-width control-input"
                  format="YYYY-MM-DD"
                  inputReadOnly
                  value={[dayjs(startDate), dayjs(endDate)]}
                  onChange={(_, dateStrings) => {
                    const [nextStartDate, nextEndDate] = dateStrings;
                    if (nextStartDate && nextEndDate) {
                      onDateRangeChange(nextStartDate, nextEndDate);
                    }
                  }}
                />
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
                  placeholder="输入产品代码或产品名称"
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
                      ? "输入行程代码、行程名称或业务类型"
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
                        {product.productName} / {product.itineraryName} / {product.businessType}
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
            const openingConfig = getProductOpeningConfig(productOpeningConfigs, product);
            const resolvedOpeningConfig = resolveOpeningConfig(
              product,
              productOpeningConfigs,
              config.businessTypeOpeningRules,
            ).openingConfig;

            return (
              <Col xs={24} xl={12} key={getProductItineraryKey(product)}>
                <Card
                  title={
                    <Space wrap className="itinerary-card-title">
                      <span>{product.productName}</span>
                      <Button
                        aria-label={`配置${product.itineraryName}开团规则`}
                        type="primary"
                        ghost
                        size="small"
                        icon={<SettingOutlined />}
                        className="config-action-button"
                        disabled={!openingConfig}
                        onClick={() => setConfigModalKey(getProductItineraryKey(product))}
                      >
                        开团配置
                      </Button>
                      <Tag color="blue">{product.businessType}</Tag>
                    </Space>
                  }
                >
                  <Descriptions
                    column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
                    size="small"
                    className="section-gap"
                  >
                    <Descriptions.Item label="产品">
                      {product.productCode} / {product.productName}
                    </Descriptions.Item>
                    <Descriptions.Item label="行程名称">{product.itineraryName}</Descriptions.Item>
                    <Descriptions.Item label="行程天数">{formatTripDuration(product)}</Descriptions.Item>
                    <Descriptions.Item label="行程酒店">
                      {getItineraryShortCode(product)}
                    </Descriptions.Item>
                  </Descriptions>

                  {openingConfig ? (
                    <OpeningConfigSummary resolvedOpeningConfig={resolvedOpeningConfig} />
                  ) : null}

                  {!openingConfig ? (
                    <Alert type="error" showIcon title="未找到该产品行程的开团配置。" />
                  ) : null}

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
                          <Space direction="vertical" size={0}>
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

      <Modal
        title={
          configModalProduct
            ? `${configModalProduct.productName} / ${configModalProduct.itineraryName}`
            : "本行程开团配置"
        }
        open={Boolean(configModalProduct && configModalOpeningConfig)}
        footer={null}
        width={760}
        onCancel={() => setConfigModalKey(null)}
      >
        {configModalOpeningConfig ? (
          <InlineItineraryConfig
            businessType={configModalProduct?.businessType ?? "主题团"}
            openingConfig={configModalOpeningConfig}
            resolvedOpeningConfig={configModalResolvedOpeningConfig}
            onUpdateProductOpeningConfig={onUpdateProductOpeningConfig}
          />
        ) : null}
      </Modal>
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

function formatTripDuration(product: Product): string {
  return `${product.tripDays} 天 ${product.dailyItinerary.length} 晚`;
}

function getProductOpeningConfig(configs: ProductOpeningConfig[], product: Product) {
  return (
    configs.find(
      (openingConfig) =>
        openingConfig.productCode === product.productCode &&
        openingConfig.itineraryCode === product.itineraryCode,
    ) ?? configs.find((openingConfig) => openingConfig.productCode === product.productCode)
  );
}

function OpeningConfigSummary({
  resolvedOpeningConfig,
}: {
  resolvedOpeningConfig: ReturnType<typeof resolveOpeningConfig>["openingConfig"];
}) {
  if (!resolvedOpeningConfig) {
    return (
      <div className="itinerary-config-summary">
        <Text type="secondary">未找到可用开团配置</Text>
      </div>
    );
  }

  return (
    <div className="itinerary-config-summary">
      <Space wrap size={[6, 8]}>
        <Tag color="blue">最大人数 {resolvedOpeningConfig.defaultGroupSize}</Tag>
        <Tag color="blue">房间 {resolvedOpeningConfig.defaultRoomCount} 间</Tag>
        <Tag>渠道 {formatChannels(resolvedOpeningConfig.channels)}</Tag>
        <Tag>价格 {formatPriceConfig(resolvedOpeningConfig.priceConfig)}</Tag>
        <Tag>{getFrequencyLabel(resolvedOpeningConfig)}</Tag>
        <Tag>{resolvedOpeningConfig.allowedDepartureRule.description}</Tag>
        <Tag>
          {formatPreferredWeekdays(
            resolvedOpeningConfig.preferredWeekdays,
            resolvedOpeningConfig.fallbackWeekdays,
          )}
        </Tag>
      </Space>
    </div>
  );
}

function InlineItineraryConfig({
  businessType,
  openingConfig,
  resolvedOpeningConfig,
  onUpdateProductOpeningConfig,
}: {
  businessType: Product["businessType"];
  openingConfig: ProductOpeningConfig;
  resolvedOpeningConfig: ReturnType<typeof resolveOpeningConfig>["openingConfig"];
  onUpdateProductOpeningConfig: (config: ProductOpeningConfig) => void;
}) {
  const openingRule = getOpeningRule(openingConfig);

  const updateConfig = (patch: Partial<ProductOpeningConfig>) => {
    onUpdateProductOpeningConfig({
      ...openingConfig,
      ...patch,
    });
  };

  const updateRule = (patch: Partial<OpeningRuleOverride>) => {
    onUpdateProductOpeningConfig({
      ...openingConfig,
      overrideRule: {
        ...openingRule,
        ...patch,
      },
    });
  };

  return (
    <div className="inline-itinerary-config">
      <div className="inline-config-header">
        <Text strong>本行程开团配置</Text>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <RuleField label="渠道">
            <Select
              mode="multiple"
              value={openingConfig.channels}
              options={channelOptions}
              placeholder="选择渠道"
              className="full-width"
              onChange={(channels) => updateConfig({ channels })}
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="默认人数">
            <InputNumber
              min={1}
              max={80}
              value={openingConfig.defaultGroupSize}
              className="full-width"
              onChange={(defaultGroupSize) =>
                updateConfig({
                  defaultGroupSize: defaultGroupSize ?? openingConfig.defaultGroupSize,
                })
              }
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="默认房间数">
            <InputNumber
              min={1}
              max={40}
              value={openingConfig.defaultRoomCount}
              className="full-width"
              onChange={(defaultRoomCount) =>
                updateConfig({
                  defaultRoomCount: defaultRoomCount ?? openingConfig.defaultRoomCount,
                })
              }
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="开团频次">
            <Select
              value={openingRule.frequencyType}
              options={frequencyOptions}
              className="full-width"
              onChange={(frequencyType: NonNullable<OpeningRuleOverride["frequencyType"]>) =>
                updateRule(normalizeFrequencyRule(openingRule, frequencyType))
              }
            />
          </RuleField>
        </Col>

        {openingRule.frequencyType === "intervalDays" ? (
          <Col xs={24} md={12}>
            <RuleField label="开团间隔">
              <InputNumber
                min={1}
                max={30}
                addonBefore="每"
                addonAfter="天"
                value={openingRule.intervalDays ?? 1}
                className="full-width"
                onChange={(intervalDays) => updateRule({ intervalDays: intervalDays ?? 1 })}
              />
            </RuleField>
          </Col>
        ) : null}

        {openingRule.frequencyType === "weekly" ? (
          <Col xs={24} md={12}>
            <RuleField label="每周发团日">
              <Select
                mode="multiple"
                value={openingRule.weekdays ?? []}
                options={weekdayOptions}
                placeholder="选择星期"
                className="full-width"
                onChange={(weekdays) => updateRule({ weekdays })}
              />
            </RuleField>
          </Col>
        ) : null}

        <Col xs={24} md={12}>
          <RuleField label="出发日限制">
            <Select
              value={openingRule.allowedDepartureRule?.type ?? "none"}
              options={departureRuleOptions}
              className="full-width"
              onChange={(type) =>
                updateRule({
                  allowedDepartureRule: buildAllowedDepartureRule(
                    type,
                    openingRule.allowedDepartureRule?.weekdays,
                  ),
                })
              }
            />
          </RuleField>
        </Col>

        {openingRule.allowedDepartureRule?.type === "weekdays" ? (
          <Col xs={24} md={12}>
            <RuleField label="允许星期">
              <Select
                mode="multiple"
                value={openingRule.allowedDepartureRule.weekdays ?? []}
                options={weekdayOptions}
                placeholder="选择允许星期"
                className="full-width"
                onChange={(weekdays) =>
                  updateRule({
                    allowedDepartureRule: buildAllowedDepartureRule("weekdays", weekdays),
                  })
                }
              />
            </RuleField>
          </Col>
        ) : null}

        <Col xs={24} md={12}>
          <RuleField label="首选出发日">
            <Select
              mode="multiple"
              value={openingRule.preferredWeekdays ?? []}
              options={weekdayOptions}
              placeholder="可不选"
              className="full-width"
              onChange={(preferredWeekdays) => updateRule({ preferredWeekdays })}
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="次选出发日">
            <Select
              mode="multiple"
              value={openingRule.fallbackWeekdays ?? []}
              options={weekdayOptions}
              placeholder="可不选"
              className="full-width"
              onChange={(fallbackWeekdays) => updateRule({ fallbackWeekdays })}
            />
          </RuleField>
        </Col>
      </Row>

      <Text type="secondary">
        当前规则：{resolvedOpeningConfig ? getFrequencyLabel(resolvedOpeningConfig) : "未配置"} /{" "}
        {resolvedOpeningConfig?.allowedDepartureRule.description ?? "未配置"} /{" "}
        {resolvedOpeningConfig
          ? formatPreferredWeekdays(
              resolvedOpeningConfig.preferredWeekdays,
              resolvedOpeningConfig.fallbackWeekdays,
            )
          : "不配置"}
      </Text>

      <Divider plain>
        价格配置
      </Divider>

      <PriceConfigFields
        businessType={businessType}
        priceConfig={openingConfig.priceConfig}
        onChange={(priceConfig) => updateConfig({ priceConfig })}
      />
    </div>
  );
}

function PriceConfigFields({
  businessType,
  priceConfig,
  onChange,
}: {
  businessType: Product["businessType"];
  priceConfig: PriceConfig;
  onChange: (priceConfig: PriceConfig) => void;
}) {
  return (
    <Space direction="vertical" size={12} className="full-width price-config-block">
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <RuleField label="价格类型">
            <Tag color="blue">{priceConfig.priceType}</Tag>
            <Text type="secondary">由产品行程接口返回，不在前端选择。</Text>
          </RuleField>
        </Col>
      </Row>

      {priceConfig.priceType === "人" ? (
        <PerPersonPriceFields
          businessType={businessType}
          priceConfig={priceConfig}
          onChange={onChange}
        />
      ) : null}

      {priceConfig.priceType === "家庭" ? (
        <FamilyPriceFields priceConfig={priceConfig} onChange={onChange} />
      ) : null}

      {priceConfig.priceType === "套" ? (
        <PackagePriceFields priceConfig={priceConfig} onChange={onChange} />
      ) : null}
    </Space>
  );
}

function PerPersonPriceFields({
  businessType,
  priceConfig,
  onChange,
}: {
  businessType: Product["businessType"];
  priceConfig: Extract<PriceConfig, { priceType: "人" }>;
  onChange: (priceConfig: PriceConfig) => void;
}) {
  const canConfigureGuarantee = businessType === "自由行" || businessType === "私享管家";

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12}>
        <RuleField label="成人价">
          <InputNumber
            min={0}
            addonBefore="¥"
            value={priceConfig.adultPrice}
            className="full-width"
            onChange={(adultPrice) =>
              onChange({ ...priceConfig, adultPrice: adultPrice ?? priceConfig.adultPrice })
            }
          />
        </RuleField>
      </Col>

      <Col xs={24} md={12}>
        <RuleField label="单间差">
          <InputNumber
            min={0}
            addonBefore="¥"
            value={priceConfig.singleRoomSupplement}
            className="full-width"
            onChange={(singleRoomSupplement) =>
              onChange({
                ...priceConfig,
                singleRoomSupplement:
                  singleRoomSupplement ?? priceConfig.singleRoomSupplement,
              })
            }
          />
        </RuleField>
      </Col>

      <Col xs={24} md={8}>
        <RuleField label="大童价">
          <InputNumber disabled value={priceConfig.adultPrice} addonBefore="¥" className="full-width" />
        </RuleField>
      </Col>
      <Col xs={24} md={8}>
        <RuleField label="中童价">
          <InputNumber disabled value={priceConfig.adultPrice} addonBefore="¥" className="full-width" />
        </RuleField>
      </Col>
      <Col xs={24} md={8}>
        <RuleField label="幼童价">
          <InputNumber disabled value={priceConfig.adultPrice} addonBefore="¥" className="full-width" />
        </RuleField>
      </Col>

      {canConfigureGuarantee ? (
        <Col xs={24} md={12}>
          <RuleField label="保底金额">
            <InputNumber
              min={0}
              addonBefore="¥"
              value={priceConfig.guaranteeAmount ?? 0}
              className="full-width"
              onChange={(guaranteeAmount) =>
                onChange({
                  ...priceConfig,
                  guaranteeAmount: guaranteeAmount ?? priceConfig.guaranteeAmount ?? 0,
                })
              }
            />
          </RuleField>
        </Col>
      ) : null}

      <Col xs={24}>
        <Text type="secondary">大童、中童、幼童价格第一版跟随成人价，暂不单独修改。</Text>
      </Col>
    </Row>
  );
}

function FamilyPriceFields({
  priceConfig,
  onChange,
}: {
  priceConfig: Extract<PriceConfig, { priceType: "家庭" }>;
  onChange: (priceConfig: PriceConfig) => void;
}) {
  const familyPriceRows = priceConfig.familyPrices.flatMap((item) => [
    {
      familyCode: item.familyCode,
      adultCount: item.adultCount,
      childLabel: "大童" as const,
      priceField: "bigChildPrice" as const,
      price: item.bigChildPrice,
    },
    {
      familyCode: item.familyCode,
      adultCount: item.adultCount,
      childLabel: "中童" as const,
      priceField: "middleChildPrice" as const,
      price: item.middleChildPrice,
    },
    {
      familyCode: item.familyCode,
      adultCount: item.adultCount,
      childLabel: "幼童" as const,
      priceField: "smallChildPrice" as const,
      price: item.smallChildPrice,
    },
  ]);

  const updateFamilyPrice = (
    familyCode: string,
    patch: Partial<Extract<PriceConfig, { priceType: "家庭" }>["familyPrices"][number]>,
  ) => {
    onChange({
      ...priceConfig,
      familyPrices: priceConfig.familyPrices.map((item) =>
        item.familyCode === familyCode ? { ...item, ...patch } : item,
      ),
    });
  };

  return (
    <Space direction="vertical" size={12} className="full-width">
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <RuleField label="单间差">
            <InputNumber
              min={0}
              addonBefore="¥"
              value={priceConfig.singleRoomSupplement}
              className="full-width"
              onChange={(singleRoomSupplement) =>
                onChange({
                  ...priceConfig,
                  singleRoomSupplement:
                    singleRoomSupplement ?? priceConfig.singleRoomSupplement,
                })
              }
            />
          </RuleField>
        </Col>
      </Row>

      <Table
        rowKey={(record) => `${record.familyCode}-${record.childLabel}`}
        size="small"
        pagination={false}
        dataSource={familyPriceRows}
        columns={[
          {
            title: "规格",
            dataIndex: "adultCount",
            width: 160,
            render: (_: number, record) => (
              <Tag>{formatFamilyChildSpec(record.adultCount, record.childLabel)}</Tag>
            ),
          },
          {
            title: "价格",
            dataIndex: "price",
            render: (value: number, record) => (
              <InputNumber
                min={0}
                addonBefore="¥"
                value={value}
                className="full-width"
                onChange={(price) =>
                  updateFamilyPrice(record.familyCode, {
                    [record.priceField]: price ?? value,
                  })
                }
              />
            ),
          },
        ]}
      />

      <Text type="secondary">
        家庭枚举项由价格类型接口返回，当前只允许维护每组枚举价的金额。
      </Text>
    </Space>
  );
}

function PackagePriceFields({
  priceConfig,
  onChange,
}: {
  priceConfig: Extract<PriceConfig, { priceType: "套" }>;
  onChange: (priceConfig: PriceConfig) => void;
}) {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={8}>
        <RuleField label="每套人数">
          <InputNumber
            min={1}
            value={priceConfig.packagePeople}
            addonAfter="人"
            className="full-width"
            onChange={(packagePeople) =>
              onChange({ ...priceConfig, packagePeople: packagePeople ?? priceConfig.packagePeople })
            }
          />
        </RuleField>
      </Col>
      <Col xs={24} md={8}>
        <RuleField label="成人数">
          <InputNumber
            min={1}
            value={priceConfig.adultCount}
            addonAfter="成人"
            className="full-width"
            onChange={(adultCount) =>
              onChange({ ...priceConfig, adultCount: adultCount ?? priceConfig.adultCount })
            }
          />
        </RuleField>
      </Col>
      <Col xs={24} md={8}>
        <RuleField label="套价">
          <InputNumber
            min={0}
            addonBefore="¥"
            value={priceConfig.packagePrice}
            className="full-width"
            onChange={(packagePrice) =>
              onChange({ ...priceConfig, packagePrice: packagePrice ?? priceConfig.packagePrice })
            }
          />
        </RuleField>
      </Col>
    </Row>
  );
}

function RuleField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Space direction="vertical" size={6} className="full-width">
      <Text strong>{label}</Text>
      {children}
    </Space>
  );
}

function getOpeningRule(openingConfig: ProductOpeningConfig): OpeningRuleOverride {
  return {
    frequencyType: openingConfig.overrideRule?.frequencyType ?? "daily",
    weekdays: openingConfig.overrideRule?.weekdays,
    intervalDays: openingConfig.overrideRule?.intervalDays,
    allowedDepartureRule:
      openingConfig.overrideRule?.allowedDepartureRule ?? buildAllowedDepartureRule("none"),
    preferredWeekdays: openingConfig.overrideRule?.preferredWeekdays ?? [],
    fallbackWeekdays: openingConfig.overrideRule?.fallbackWeekdays ?? [],
  };
}

function normalizeFrequencyRule(
  rule: OpeningRuleOverride,
  frequencyType: NonNullable<OpeningRuleOverride["frequencyType"]>,
): OpeningRuleOverride {
  if (frequencyType === "daily") {
    return {
      ...rule,
      frequencyType,
      intervalDays: undefined,
      weekdays: undefined,
    };
  }

  if (frequencyType === "intervalDays") {
    return {
      ...rule,
      frequencyType,
      intervalDays: rule.intervalDays ?? 2,
      weekdays: undefined,
    };
  }

  return {
    ...rule,
    frequencyType,
    weekdays: rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [6],
    intervalDays: undefined,
  };
}

function buildAllowedDepartureRule(
  type: AllowedDepartureRule["type"],
  weekdays: number[] = [6],
): AllowedDepartureRule {
  if (type === "none") {
    return { type, description: "不限出发日" };
  }

  if (type === "oddDays") {
    return { type, description: "只能单数日出发" };
  }

  if (type === "evenDays") {
    return { type, description: "只能双数日出发" };
  }

  const nextWeekdays = weekdays.length > 0 ? weekdays : [6];

  return {
    type,
    weekdays: nextWeekdays,
    description: `只能${formatWeekdays(nextWeekdays)}出发`,
  };
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

function formatChannels(channels: OpeningChannel[]) {
  return channels.length > 0 ? channels.join("、") : "未配置";
}

function formatFamilyChildSpec(adultCount: number, childLabel: "大童" | "中童" | "幼童") {
  return `${adultCount}成人1${childLabel}`;
}

function formatPriceConfig(priceConfig: PriceConfig | null) {
  if (!priceConfig) return "未配置";

  if (priceConfig.priceType === "人") {
    const guarantee = priceConfig.guaranteeAmount ? ` / 保底 ¥${priceConfig.guaranteeAmount}` : "";
    return `人 / 成人 ¥${priceConfig.adultPrice}${guarantee}`;
  }

  if (priceConfig.priceType === "家庭") {
    return `家庭 / ${priceConfig.familyPrices.length} 组枚举价`;
  }

  return `套 / ${priceConfig.packagePeople} 人 ¥${priceConfig.packagePrice}`;
}
