import { WarningOutlined } from "@ant-design/icons";
import { Card, Empty, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatPercent } from "../engine/openingEngine";
import type { InventoryViewRow } from "../types/domain";

const { Text } = Typography;

export function InventoryPage({ rows }: { rows: InventoryViewRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <Empty description="生成开团计划后，这里会按日期、酒店和房型展示占用情况。" />
      </Card>
    );
  }

  const columns: ColumnsType<InventoryViewRow> = [
    {
      title: "日期",
      dataIndex: "date",
      width: 120,
      fixed: "left",
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "酒店",
      dataIndex: "hotelName",
      width: 210,
      render: (_: string, row) => (
        <Space orientation="vertical" size={0}>
          <Text>{row.hotelName}</Text>
          <Text type="secondary">
            {row.hotelCode} / {row.hotelShortName}
          </Text>
        </Space>
      ),
    },
    {
      title: "房型",
      dataIndex: "roomTypeName",
      width: 220,
      render: (_: string, row) => (
        <Space orientation="vertical" size={0}>
          <Text>{row.roomTypeName}</Text>
          <Space size={4}>
            <Tag>{row.roomClass}</Tag>
            {row.isAdvancedRoom ? <Tag color="gold">高级</Tag> : <Tag color="blue">基础</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: "公共池",
      dataIndex: "publicPool",
      width: 90,
      align: "right",
    },
    {
      title: "预保留",
      dataIndex: "preReserved",
      width: 90,
      align: "right",
    },
    {
      title: "预分配",
      dataIndex: "preAllocated",
      width: 90,
      align: "right",
    },
    {
      title: "预占",
      dataIndex: "preOccupied",
      width: 90,
      align: "right",
    },
    {
      title: "实占",
      dataIndex: "actualOccupied",
      width: 90,
      align: "right",
    },
    {
      title: "本次计划占用",
      dataIndex: "plannedRooms",
      width: 130,
      align: "right",
      render: (value: number) => <Text strong>{value}</Text>,
    },
    {
      title: "可用库存",
      dataIndex: "availableLimit",
      width: 100,
      align: "right",
    },
    {
      title: "占用率",
      dataIndex: "occupancyRate",
      width: 150,
      render: (value: number) => (
        <Space orientation="vertical" size={0} className="full-width">
          <Progress
            percent={Math.round(value * 100)}
            size="small"
            status={value > 1 ? "exception" : "active"}
          />
          <Text type="secondary">{formatPercent(value)}</Text>
        </Space>
      ),
    },
    {
      title: "是否超限",
      dataIndex: "overLimit",
      width: 110,
      render: (overLimit: boolean) =>
        overLimit ? (
          <Tag icon={<WarningOutlined />} color="error">
            超限
          </Tag>
        ) : (
          <Tag color="success">未超限</Tag>
        ),
    },
  ];

  return (
    <Card
      title="酒店资源占用表"
      extra={<Text type="secondary">按公共池、预保留、预分配、预占、实占和本次计划占用计算</Text>}
    >
      <Table
        rowKey={(row) => `${row.date}-${row.hotelCode}-${row.roomTypeCode}`}
        size="middle"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        scroll={{ x: 1500 }}
      />
    </Card>
  );
}
