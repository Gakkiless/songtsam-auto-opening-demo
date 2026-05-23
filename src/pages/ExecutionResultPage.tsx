import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OpeningExecutionRecord, OpeningExecutionStatus } from "../types/domain";

const { Text } = Typography;

export function ExecutionResultPage({
  records,
  latestBatchId,
  onExport,
}: {
  records: OpeningExecutionRecord[];
  latestBatchId: string;
  onExport: () => void;
}) {
  if (records.length === 0) {
    return (
      <Card>
        <Empty description="确认执行开团接口后，这里会展示成功、失败和历史开团记录。" />
      </Card>
    );
  }

  const latestRecords = latestBatchId
    ? records.filter((record) => record.batchId === latestBatchId)
    : [];
  const successCount = latestRecords.filter((record) => record.status === "开团成功").length;
  const failedCount = latestRecords.filter((record) => record.status === "开团失败").length;
  const sortedRecords = [...records].sort((a, b) =>
    `${b.executedAt}-${b.departureDate}`.localeCompare(`${a.executedAt}-${a.departureDate}`),
  );

  const columns: ColumnsType<OpeningExecutionRecord> = [
    {
      title: "执行时间",
      dataIndex: "executedAt",
      width: 170,
      fixed: "left",
      render: (value: string) => <Text>{formatDateTime(value)}</Text>,
    },
    {
      title: "执行批次",
      dataIndex: "batchId",
      width: 150,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "出发日期",
      dataIndex: "departureDate",
      width: 120,
      sorter: (a, b) => a.departureDate.localeCompare(b.departureDate),
    },
    {
      title: "产品/行程",
      dataIndex: "productName",
      width: 260,
      render: (_: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.productName}</Text>
          <Text type="secondary">
            {record.productCode} / {record.itineraryName}
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
      title: "房型房数",
      dataIndex: "roomSummary",
      width: 240,
      render: (value: string) => <Text>{value || "-"}</Text>,
    },
    {
      title: "执行状态",
      dataIndex: "status",
      width: 120,
      render: (status: OpeningExecutionStatus) => <ExecutionStatusTag status={status} />,
    },
    {
      title: "团期号",
      dataIndex: "groupPeriodNo",
      width: 180,
      render: (value?: string) => (value ? <Text code>{value}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: "失败原因",
      dataIndex: "failureReason",
      minWidth: 300,
      render: (value?: string) => <Text type="secondary">{value || "-"}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Card
        title={
          <Space>
            <HistoryOutlined />
            开团执行结果
          </Space>
        }
        extra={
          <Button icon={<DownloadOutlined />} onClick={onExport}>
            导出历史记录
          </Button>
        }
      >
        <Space wrap size={16}>
          <Statistic title="本次执行" value={latestRecords.length} suffix="条" />
          <Statistic
            title="开团成功"
            value={successCount}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#1677ff" }}
          />
          <Statistic
            title="开团失败"
            value={failedCount}
            prefix={<CloseCircleOutlined />}
            valueStyle={failedCount > 0 ? { color: "#cf1322" } : undefined}
          />
          <Statistic title="历史记录" value={records.length} suffix="条" />
        </Space>
      </Card>

      <Card title="历史开团记录">
        <Table
          rowKey="executionId"
          size="middle"
          dataSource={sortedRecords}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1660 }}
        />
      </Card>
    </Space>
  );
}

function ExecutionStatusTag({ status }: { status: OpeningExecutionStatus }) {
  return status === "开团成功" ? (
    <Tag icon={<CheckCircleOutlined />} color="success">
      开团成功
    </Tag>
  ) : (
    <Tag icon={<CloseCircleOutlined />} color="error">
      开团失败
    </Tag>
  );
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 19);
}
