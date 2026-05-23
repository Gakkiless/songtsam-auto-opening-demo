import {
  Alert,
  Card,
  Col,
  Divider,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { formatWeekdays } from "../engine/openingEngine";
import type {
  AllowedDepartureRule,
  BusinessFrequencyRule,
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
  onUpdateBusinessRule,
  onUpdateProductOpeningConfig,
  onUpdateStrategyConfig,
}: {
  config: StrategyConfig;
  productOpeningConfigs: ProductOpeningConfig[];
  onUpdateBusinessRule: (rule: BusinessFrequencyRule) => void;
  onUpdateProductOpeningConfig: (config: ProductOpeningConfig) => void;
  onUpdateStrategyConfig: (patch: Partial<StrategyConfig>) => void;
}) {
  const productColumns: ColumnsType<ProductOpeningConfig> = [
    {
      title: "产品",
      dataIndex: "productCode",
      width: 110,
      fixed: "left",
      render: (productCode: string) => <Tag>{productCode}</Tag>,
    },
    {
      title: "参与基本盘",
      width: 120,
      render: (_, openingConfig) => (
        <Switch
          checked={openingConfig.enabled ?? true}
          checkedChildren="参与"
          unCheckedChildren="不参与"
          onChange={(enabled) =>
            onUpdateProductOpeningConfig({ ...openingConfig, enabled })
          }
        />
      ),
    },
    {
      title: "默认人数",
      width: 130,
      render: (_, openingConfig) => (
        <InputNumber
          min={1}
          max={80}
          value={openingConfig.defaultGroupSize}
          onChange={(defaultGroupSize) =>
            onUpdateProductOpeningConfig({
              ...openingConfig,
              defaultGroupSize: defaultGroupSize ?? openingConfig.defaultGroupSize,
            })
          }
        />
      ),
    },
    {
      title: "默认房间数",
      width: 130,
      render: (_, openingConfig) => (
        <InputNumber
          min={1}
          max={40}
          value={openingConfig.defaultRoomCount}
          onChange={(defaultRoomCount) =>
            onUpdateProductOpeningConfig({
              ...openingConfig,
              defaultRoomCount: defaultRoomCount ?? openingConfig.defaultRoomCount,
            })
          }
        />
      ),
    },
    {
      title: "特殊覆盖",
      width: 260,
      render: (_, openingConfig) =>
        openingConfig.overrideRule ? (
          <Space wrap size={[4, 4]}>
            {openingConfig.overrideRule.allowedDepartureRule ? (
              <Tag color="orange">{openingConfig.overrideRule.allowedDepartureRule.description}</Tag>
            ) : null}
            {openingConfig.overrideRule.preferredWeekdays ? (
              <Tag>首选 {formatWeekdays(openingConfig.overrideRule.preferredWeekdays)}</Tag>
            ) : null}
            {openingConfig.overrideRule.fallbackWeekdays ? (
              <Tag>次选 {formatWeekdays(openingConfig.overrideRule.fallbackWeekdays)}</Tag>
            ) : null}
          </Space>
        ) : (
          <Text type="secondary">使用业务类型默认规则</Text>
        ),
    },
    {
      title: "房型偏好",
      render: (_, openingConfig) => (
        <Space wrap size={[4, 4]}>
          {openingConfig.roomTypePreferences.map((preference) => (
            <Tag key={`${openingConfig.productCode}-${preference.hotelCode}-${preference.description}`}>
              {preference.hotelCode} / {preference.roomTypeCode ?? preference.roomClass}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={18} className="page-stack">
      <Alert
        type="info"
        showIcon
        title="这里就是 Demo 的配置入口"
        description="这些配置当前保存在前端本地状态里，点击生成开团计划时会立即按这里的配置计算；刷新页面会恢复 mock 默认值。真实系统落地时，这里应改为读取和保存策略配置接口。"
      />

      <Card title="业务类型开团规则配置">
        <Row gutter={[16, 16]}>
          {config.businessTypeOpeningRules.map((rule) => (
            <Col xs={24} xl={12} key={rule.businessType}>
              <BusinessRuleCard rule={rule} onUpdateBusinessRule={onUpdateBusinessRule} />
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="房型与库存策略配置">
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

      <Card title="产品默认配置与特殊覆盖">
        <Text type="secondary">
          这里配置产品是否参与、默认人数/房数、房型偏好；特殊覆盖用于覆盖业务类型默认规则。
        </Text>
        <Divider />
        <Table
          rowKey={(openingConfig) =>
            `${openingConfig.productCode}-${openingConfig.itineraryCode ?? "product"}`
          }
          size="middle"
          pagination={false}
          dataSource={productOpeningConfigs}
          columns={productColumns}
          scroll={{ x: 1080 }}
        />
      </Card>
    </Space>
  );
}

function BusinessRuleCard({
  rule,
  onUpdateBusinessRule,
}: {
  rule: BusinessFrequencyRule;
  onUpdateBusinessRule: (rule: BusinessFrequencyRule) => void;
}) {
  return (
    <Card
      size="small"
      className="business-rule-card"
      title={
        <Space wrap>
          <Tag color="blue">{rule.businessType}</Tag>
          <Text type="secondary">{rule.label}</Text>
        </Space>
      }
      extra={
        <Switch
          checked={rule.enabled}
          checkedChildren="开"
          unCheckedChildren="关"
          onChange={(enabled) => onUpdateBusinessRule({ ...rule, enabled })}
        />
      }
    >
      <Row gutter={[14, 14]}>
        <Col xs={24} md={12}>
          <RuleField label="开团频次">
            <Select
              value={rule.frequencyType}
              options={frequencyOptions}
              className="full-width"
              onChange={(frequencyType) =>
                onUpdateBusinessRule(normalizeFrequencyRule({ ...rule, frequencyType }))
              }
            />
          </RuleField>
        </Col>

        {rule.frequencyType === "intervalDays" ? (
          <Col xs={24} md={12}>
            <RuleField label="开团间隔">
              <InputNumber
                min={1}
                max={30}
                addonBefore="每"
                addonAfter="天"
                value={rule.intervalDays ?? 1}
                onChange={(intervalDays) =>
                  onUpdateBusinessRule({ ...rule, intervalDays: intervalDays ?? 1 })
                }
                className="full-width"
              />
            </RuleField>
          </Col>
        ) : null}

        {rule.frequencyType === "weekly" ? (
          <Col xs={24} md={12}>
            <RuleField label="每周发团日">
              <Select
                mode="multiple"
                value={rule.weekdays ?? []}
                options={weekdayOptions}
                placeholder="选择星期"
                className="full-width"
                onChange={(weekdays) => onUpdateBusinessRule({ ...rule, weekdays })}
              />
            </RuleField>
          </Col>
        ) : null}

        <Col xs={24} md={12}>
          <RuleField label="出发日限制">
            <Select
              value={rule.allowedDepartureRule.type}
              options={departureRuleOptions}
              className="full-width"
              onChange={(type) =>
                onUpdateBusinessRule({
                  ...rule,
                  allowedDepartureRule: buildAllowedDepartureRule(
                    type,
                    rule.allowedDepartureRule.weekdays,
                  ),
                })
              }
            />
          </RuleField>
        </Col>

        {rule.allowedDepartureRule.type === "weekdays" ? (
          <Col xs={24} md={12}>
            <RuleField label="允许星期">
              <Select
                mode="multiple"
                value={rule.allowedDepartureRule.weekdays ?? []}
                options={weekdayOptions}
                placeholder="选择允许星期"
                className="full-width"
                onChange={(weekdays) =>
                  onUpdateBusinessRule({
                    ...rule,
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
              value={rule.preferredWeekdays}
              options={weekdayOptions}
              placeholder="可不选"
              className="full-width"
              onChange={(preferredWeekdays) =>
                onUpdateBusinessRule({ ...rule, preferredWeekdays })
              }
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="次选出发日">
            <Select
              mode="multiple"
              value={rule.fallbackWeekdays}
              options={weekdayOptions}
              placeholder="可不选"
              className="full-width"
              onChange={(fallbackWeekdays) =>
                onUpdateBusinessRule({ ...rule, fallbackWeekdays })
              }
            />
          </RuleField>
        </Col>

        <Col xs={24} md={12}>
          <RuleField label="库存预占">
            <Switch
              checked={!rule.skipInventoryLock}
              checkedChildren="预占"
              unCheckedChildren="不预占"
              onChange={(shouldLock) =>
                onUpdateBusinessRule({ ...rule, skipInventoryLock: !shouldLock })
              }
            />
          </RuleField>
        </Col>
      </Row>
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

function normalizeFrequencyRule(rule: BusinessFrequencyRule): BusinessFrequencyRule {
  if (rule.frequencyType === "daily") {
    return {
      ...rule,
      intervalDays: undefined,
      weekdays: undefined,
    };
  }

  if (rule.frequencyType === "intervalDays") {
    return {
      ...rule,
      intervalDays: rule.intervalDays ?? 2,
      weekdays: undefined,
    };
  }

  return {
    ...rule,
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
