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
  onExportBatch,
}: {
  records: OpeningExecutionRecord[];
  latestBatchId: string;
  onExportBatch: (batchId: string) => void;
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
  const batches = buildExecutionBatches(records);

  const batchColumns: ColumnsType<OpeningExecutionBatch> = [
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
      title: "执行结果",
      dataIndex: "totalCount",
      width: 220,
      render: (_: number, batch) => (
        <Space wrap size={[4, 4]}>
          <Tag>{batch.totalCount} 个团期</Tag>
          <Tag color="success">成功 {batch.successCount}</Tag>
          <Tag color={batch.failedCount > 0 ? "error" : "default"}>失败 {batch.failedCount}</Tag>
        </Space>
      ),
    },
    {
      title: "出发日期范围",
      dataIndex: "dateRange",
      width: 210,
    },
    {
      title: "产品/行程数",
      dataIndex: "itineraryCount",
      width: 140,
      render: (value: number, batch) => `${batch.productCount} 个产品 / ${value} 条行程`,
    },
    {
      title: "操作",
      dataIndex: "batchId",
      width: 150,
      render: (batchId: string) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => onExportBatch(batchId)}>
          导出本次记录
        </Button>
      ),
    },
  ];

  const detailColumns: ColumnsType<OpeningExecutionRecord> = [
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
      title: "渠道",
      dataIndex: "channels",
      width: 180,
      render: (channels: OpeningExecutionRecord["channels"]) => (
        <Space wrap size={[4, 4]}>
          {channels.map((channel) => (
            <Tag key={channel}>{channel}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "价格配置",
      dataIndex: "priceConfig",
      width: 260,
      render: (priceConfig: OpeningExecutionRecord["priceConfig"]) => (
        <Text>{summarizeExecutionPriceConfig(priceConfig)}</Text>
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
      >
        <Space wrap size={16}>
          <Statistic title="本次执行团期" value={latestRecords.length} suffix="个" />
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
          <Statistic title="历史执行" value={batches.length} suffix="次" />
        </Space>
      </Card>

      <Card title="历史执行记录">
        <Table
          rowKey="batchId"
          size="middle"
          dataSource={batches}
          columns={batchColumns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1040 }}
          expandable={{
            defaultExpandedRowKeys: latestBatchId ? [latestBatchId] : [],
            expandedRowRender: (batch) => (
              <Table
                rowKey="executionId"
                size="small"
                dataSource={batch.records}
                columns={detailColumns}
                pagination={false}
                scroll={{ x: 1620 }}
              />
            ),
          }}
        />
      </Card>
    </Space>
  );
}

function summarizeExecutionPriceConfig(priceConfig: OpeningExecutionRecord["priceConfig"]) {
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

interface OpeningExecutionBatch {
  batchId: string;
  executedAt: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  dateRange: string;
  productCount: number;
  itineraryCount: number;
  records: OpeningExecutionRecord[];
}

function buildExecutionBatches(records: OpeningExecutionRecord[]): OpeningExecutionBatch[] {
  const recordsByBatch = new Map<string, OpeningExecutionRecord[]>();

  records.forEach((record) => {
    recordsByBatch.set(record.batchId, [...(recordsByBatch.get(record.batchId) ?? []), record]);
  });

  return [...recordsByBatch.entries()]
    .map(([batchId, batchRecords]) => {
      const sortedRecords = [...batchRecords].sort((a, b) =>
        a.departureDate.localeCompare(b.departureDate),
      );
      const departureDates = sortedRecords.map((record) => record.departureDate);
      const productCodes = new Set(sortedRecords.map((record) => record.productCode));
      const itineraryKeys = new Set(
        sortedRecords.map((record) => `${record.productCode}|${record.itineraryCode}`),
      );
      const successCount = sortedRecords.filter((record) => record.status === "开团成功").length;
      const failedCount = sortedRecords.length - successCount;

      return {
        batchId,
        executedAt: sortedRecords[0]?.executedAt ?? "",
        totalCount: sortedRecords.length,
        successCount,
        failedCount,
        dateRange:
          departureDates.length > 1
            ? `${departureDates[0]} 至 ${departureDates[departureDates.length - 1]}`
            : departureDates[0] ?? "-",
        productCount: productCodes.size,
        itineraryCount: itineraryKeys.size,
        records: sortedRecords,
      };
    })
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt));
}
