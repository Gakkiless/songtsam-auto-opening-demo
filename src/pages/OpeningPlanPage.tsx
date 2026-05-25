import { CheckCircleOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OpeningPlan, OpeningPlanStatus, ResolvedResourceUsage } from "../types/domain";

const { Text } = Typography;

export function OpeningPlanPage({
  plans,
  selectedPlanIds,
  onTogglePlan,
  onSelectAllOpenable,
  onConfirmOpenings,
}: {
  plans: OpeningPlan[];
  selectedPlanIds: string[];
  onTogglePlan: (planId: string, selected: boolean) => void;
  onSelectAllOpenable: () => void;
  onConfirmOpenings: () => void;
}) {
  const sortedPlans = [...plans].sort((a, b) =>
    `${a.departureDate}-${a.productName}`.localeCompare(`${b.departureDate}-${b.productName}`, "zh-CN"),
  );
  const openableCount = plans.filter((plan) => plan.status === "可开团").length;
  const selectedOpenableCount = selectedPlanIds.length;

  if (plans.length === 0) {
    return (
      <Card>
        <Empty description="选择产品和行程后，点击生成待确认计划。" />
      </Card>
    );
  }

  const columns: ColumnsType<OpeningPlan> = [
    {
      title: "出发日期",
      dataIndex: "departureDate",
      width: 120,
      fixed: "left",
      sorter: (a, b) => a.departureDate.localeCompare(b.departureDate),
    },
    {
      title: "业务类型",
      dataIndex: "businessType",
      width: 110,
      render: (value: OpeningPlan["businessType"]) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "产品/行程",
      dataIndex: "productName",
      width: 260,
      render: (_: string, plan) => (
        <Space direction="vertical" size={0}>
          <Text strong>{plan.productName}</Text>
          <Text type="secondary">
            {plan.productCode} / {plan.itineraryName}
          </Text>
        </Space>
      ),
    },
    {
      title: "最大人数库存",
      dataIndex: "groupSize",
      width: 120,
      align: "right",
    },
    {
      title: "占用房间数",
      dataIndex: "resourceUsage",
      width: 260,
      render: (_: ResolvedResourceUsage[], plan) => <RoomTypeSummary plan={plan} />,
    },
    {
      title: "价格配置",
      dataIndex: "priceConfig",
      width: 250,
      render: (priceConfig: OpeningPlan["priceConfig"]) => (
        <Text>{summarizePlanPriceConfig(priceConfig)}</Text>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (status: OpeningPlanStatus) => <StatusTag status={status} />,
    },
    {
      title: "原因说明",
      dataIndex: "reason",
      minWidth: 360,
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
  ];

  return (
    <Card
      title="待确认开团计划"
      extra={
        <Space wrap>
          <Button icon={<CheckCircleOutlined />} onClick={onSelectAllOpenable}>
            全选可开团 {openableCount}
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={selectedOpenableCount === 0}
            onClick={onConfirmOpenings}
          >
            确认并执行 mock 开团接口
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="planId"
        size="middle"
        dataSource={sortedPlans}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 1630 }}
        rowSelection={{
          selectedRowKeys: selectedPlanIds,
          getCheckboxProps: (record) => ({ disabled: record.status !== "可开团" }),
          onSelect: (record, selected) => onTogglePlan(record.planId, selected),
          onSelectAll: (_selected, _selectedRows, changeRows) => {
            changeRows.forEach((plan) => {
              if (plan.status === "可开团") {
                onTogglePlan(plan.planId, !selectedPlanIds.includes(plan.planId));
              }
            });
          },
        }}
      />
    </Card>
  );
}

function summarizePlanPriceConfig(priceConfig: OpeningPlan["priceConfig"]) {
  if (!priceConfig) return "-";

  if (priceConfig.priceType === "人") {
    const guarantee = priceConfig.guaranteeAmount ? ` / 保底 ¥${priceConfig.guaranteeAmount}` : "";
    return `人 / 成人 ¥${priceConfig.adultPrice} / 单间差 ¥${priceConfig.singleRoomSupplement}${guarantee}`;
  }

  if (priceConfig.priceType === "家庭") {
    return `家庭 / ${priceConfig.familyPrices.length} 组枚举价 / 单间差 ¥${priceConfig.singleRoomSupplement}`;
  }

  return `套 / ${priceConfig.packagePeople} 人 / ¥${priceConfig.packagePrice}`;
}

function RoomTypeSummary({ plan }: { plan: OpeningPlan }) {
  const summaries = summarizeRoomTypes(plan.resourceUsage);

  if (summaries.length === 0) {
    return plan.roomCount > 0 ? (
      <Text type="secondary">{plan.roomCount} 间</Text>
    ) : (
      <Text type="secondary">-</Text>
    );
  }

  return (
    <Space wrap size={[4, 4]} className="room-summary-list">
      {summaries.map((summary) => (
        <Tag
          key={summary.roomTypeCode}
          color={summary.roomLevel === "高级" ? "gold" : "blue"}
        >
          {summary.roomTypeName} {summary.quantity} 间
        </Tag>
      ))}
    </Space>
  );
}

function summarizeRoomTypes(resourceUsage: ResolvedResourceUsage[]) {
  const summaryByRoomType = new Map<
    string,
    {
      roomTypeCode: string;
      roomTypeName: string;
      roomLevel: ResolvedResourceUsage["roomLevel"];
      quantity: number;
    }
  >();

  resourceUsage.forEach((usage) => {
    const existing = summaryByRoomType.get(usage.roomTypeCode);
    summaryByRoomType.set(usage.roomTypeCode, {
      roomTypeCode: usage.roomTypeCode,
      roomTypeName: usage.roomTypeName,
      roomLevel: usage.roomLevel,
      quantity: Math.max(existing?.quantity ?? 0, usage.quantity),
    });
  });

  return [...summaryByRoomType.values()].sort((a, b) =>
    a.roomTypeName.localeCompare(b.roomTypeName, "zh-CN"),
  );
}

function StatusTag({ status }: { status: OpeningPlanStatus }) {
  const colorMap: Record<OpeningPlanStatus, string> = {
    可开团: "success",
    资源不足: "error",
    规则冲突: "warning",
  };

  return <Tag color={colorMap[status]}>{status}</Tag>;
}
