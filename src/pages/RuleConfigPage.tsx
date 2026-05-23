import {
  Alert,
  Card,
  Col,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import type { ReactNode } from "react";
import { formatWeekdays, getItineraryShortCode } from "../engine/openingEngine";
import type {
  AllowedDepartureRule,
  BusinessFrequencyRule,
  OpeningRuleOverride,
  Product,
  ProductOpeningConfig,
  RoomLevel,
  StrategyConfig,
} from "../types/domain";

const { Text } = Typography;

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

const roomLevelOptions = [
  { label: "基础房型", value: "基础" },
  { label: "高级房型", value: "高级" },
];

export function RuleConfigPage({
  config,
  productOpeningConfigs,
  products,
  onUpdateProductOpeningConfig,
  onUpdateStrategyConfig,
}: {
  config: StrategyConfig;
  productOpeningConfigs: ProductOpeningConfig[];
  products: Product[];
  onUpdateProductOpeningConfig: (config: ProductOpeningConfig) => void;
  onUpdateStrategyConfig: (patch: Partial<StrategyConfig>) => void;
}) {
  return (
    <Space orientation="vertical" size={18} className="page-stack">
      <Alert
        type="info"
        showIcon
        title="这里就是 Demo 的配置入口"
        description="当前按产品行程配置基本盘规则。开团接口执行后，酒店资源状态由后端写入“预分配”；预占是客人下单支付后的状态，不在这里配置。"
      />

      <Card title="产品行程开团规则配置">
        <Row gutter={[16, 16]}>
          {productOpeningConfigs.map((openingConfig) => {
            const product = findProduct(products, openingConfig);
            const businessRule = product
              ? config.businessTypeOpeningRules.find(
                  (rule) => rule.businessType === product.businessType,
                )
              : undefined;

            return (
              <Col
                xs={24}
                xl={12}
                key={`${openingConfig.productCode}-${openingConfig.itineraryCode ?? "product"}`}
              >
                <ProductItineraryRuleCard
                  openingConfig={openingConfig}
                  product={product}
                  businessRule={businessRule}
                  onUpdateProductOpeningConfig={onUpdateProductOpeningConfig}
                />
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card title="房型策略配置">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={8} className="full-width">
              <Text strong>可自动使用房型等级</Text>
              <Select
                mode="multiple"
                value={config.roomLevelPriority}
                options={roomLevelOptions}
                onChange={(roomLevelPriority) =>
                  onUpdateStrategyConfig({ roomLevelPriority: roomLevelPriority as RoomLevel[] })
                }
                className="full-width"
              />
              <Text type="secondary">第一版建议只保留基础房型，高级房型会触发涨价。</Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={8}>
              <Text strong>是否允许自动使用高级房型</Text>
              <Switch
                checked={config.autoUseAdvancedRoom}
                checkedChildren="允许"
                unCheckedChildren="不允许"
                onChange={(autoUseAdvancedRoom) =>
                  onUpdateStrategyConfig({ autoUseAdvancedRoom })
                }
              />
              <Text type="secondary">当前业务口径为不自动使用高级房型，只标记资源不足。</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

function ProductItineraryRuleCard({
  openingConfig,
  product,
  businessRule,
  onUpdateProductOpeningConfig,
}: {
  openingConfig: ProductOpeningConfig;
  product?: Product;
  businessRule?: BusinessFrequencyRule;
  onUpdateProductOpeningConfig: (config: ProductOpeningConfig) => void;
}) {
  const openingRule = getOpeningRule(openingConfig, businessRule);

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
    <Card
      size="small"
      className="business-rule-card"
      title={
        <Space wrap>
          <Tag color="blue">{openingConfig.productCode}</Tag>
          {product ? <Text strong>{product.itineraryName}</Text> : <Text strong>未匹配行程</Text>}
        </Space>
      }
      extra={
        <Switch
          checked={openingConfig.enabled ?? true}
          checkedChildren="参与"
          unCheckedChildren="不参与"
          onChange={(enabled) => updateConfig({ enabled })}
        />
      }
    >
      <Space direction="vertical" size={14} className="full-width">
        <Space wrap size={[6, 6]}>
          {product ? <Tag>{product.productName}</Tag> : null}
          {product ? <Tag>{product.itineraryCode}</Tag> : null}
          {product ? <Tag color="geekblue">{product.businessType}</Tag> : null}
          {product ? <Tag>{getItineraryShortCode(product)}</Tag> : null}
        </Space>

        <Row gutter={[14, 14]}>
          <Col xs={24} md={12}>
            <RuleField label="默认人数">
              <InputNumber
                min={1}
                max={80}
                value={openingConfig.defaultGroupSize}
                onChange={(defaultGroupSize) =>
                  updateConfig({
                    defaultGroupSize: defaultGroupSize ?? openingConfig.defaultGroupSize,
                  })
                }
                className="full-width"
              />
            </RuleField>
          </Col>

          <Col xs={24} md={12}>
            <RuleField label="默认房间数">
              <InputNumber
                min={1}
                max={40}
                value={openingConfig.defaultRoomCount}
                onChange={(defaultRoomCount) =>
                  updateConfig({
                    defaultRoomCount: defaultRoomCount ?? openingConfig.defaultRoomCount,
                  })
                }
                className="full-width"
              />
            </RuleField>
          </Col>

          <Col xs={24} md={12}>
            <RuleField label="开团频次">
              <Select
                value={openingRule.frequencyType}
                options={frequencyOptions}
                className="full-width"
                onChange={(frequencyType) => updateRule(normalizeFrequencyRule(openingRule, frequencyType))}
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
                  onChange={(intervalDays) => updateRule({ intervalDays: intervalDays ?? 1 })}
                  className="full-width"
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

        <Space direction="vertical" size={6} className="full-width">
          <Text strong>房型偏好</Text>
          <Space wrap size={[4, 4]}>
            {openingConfig.roomTypePreferences.map((preference) => (
              <Tag
                key={`${openingConfig.productCode}-${openingConfig.itineraryCode}-${preference.hotelCode}-${preference.description}`}
              >
                {preference.hotelCode} / {preference.roomTypeCode ?? preference.roomClass}
              </Tag>
            ))}
          </Space>
        </Space>
      </Space>
    </Card>
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

function findProduct(products: Product[], openingConfig: ProductOpeningConfig) {
  return (
    products.find(
      (product) =>
        product.productCode === openingConfig.productCode &&
        product.itineraryCode === openingConfig.itineraryCode,
    ) ?? products.find((product) => product.productCode === openingConfig.productCode)
  );
}

function getOpeningRule(
  openingConfig: ProductOpeningConfig,
  businessRule?: BusinessFrequencyRule,
): OpeningRuleOverride {
  return {
    frequencyType: openingConfig.overrideRule?.frequencyType ?? businessRule?.frequencyType ?? "daily",
    weekdays: openingConfig.overrideRule?.weekdays ?? businessRule?.weekdays,
    intervalDays: openingConfig.overrideRule?.intervalDays ?? businessRule?.intervalDays,
    allowedDepartureRule:
      openingConfig.overrideRule?.allowedDepartureRule ??
      businessRule?.allowedDepartureRule ??
      buildAllowedDepartureRule("none"),
    preferredWeekdays:
      openingConfig.overrideRule?.preferredWeekdays ?? businessRule?.preferredWeekdays ?? [],
    fallbackWeekdays:
      openingConfig.overrideRule?.fallbackWeekdays ?? businessRule?.fallbackWeekdays ?? [],
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
