import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Empty, InputNumber, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import {
  calculateExecutionRecordSalesValue,
  formatCurrency,
  formatPercent,
  summarizeExecutionSales,
} from "../engine/salesProjection";
import type { OpeningExecutionRecord, OpeningExecutionStatus } from "../types/domain";

const { Text } = Typography;

export function ExecutionResultPage({
  records,
  latestBatchId,
  salesTarget,
  historicalSuccessRate,
  onSalesTargetChange,
  onHistoricalSuccessRateChange,
  onExportBatch,
}: {
  records: OpeningExecutionRecord[];
  latestBatchId: string;
  salesTarget: number | null;
  historicalSuccessRate: number | null;
  onSalesTargetChange: (value: number | null) => void;
  onHistoricalSuccessRateChange: (value: number | null) => void;
  onExportBatch: (batchId: string) => void;
}) {
  const latestRecords = useMemo(
    () => (latestBatchId ? records.filter((record) => record.batchId === latestBatchId) : []),
    [latestBatchId, records],
  );
  const successCount = latestRecords.filter((record) => record.status === "开团成功").length;
  const failedCount = latestRecords.filter((record) => record.status === "开团失败").length;
  const latestSalesSummary = useMemo(
    () => summarizeExecutionSales(latestRecords, salesTarget, historicalSuccessRate),
    [latestRecords, salesTarget, historicalSuccessRate],
  );
  const batches = useMemo(
    () => buildExecutionBatches(records, salesTarget, historicalSuccessRate),
    [records, salesTarget, historicalSuccessRate],
  );

  if (records.length === 0) {
    return (
      <Card>
        <Empty description="确认执行开团接口后，这里会展示成功、失败和历史开团记录。" />
      </Card>
    );
  }

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
      title: "团期总销售价值",
      dataIndex: "totalSalesValue",
      width: 160,
      align: "right",
      render: (value: number, batch) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatCurrency(value)}</Text>
          {batch.missingPriceCount > 0 ? (
            <Text type="secondary">{batch.missingPriceCount} 个团期价格待填写</Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "目标占比",
      dataIndex: "targetRatio",
      width: 120,
      align: "right",
      render: (value: number | null) => (value === null ? <Text type="secondary">待填写目标</Text> : formatPercent(value)),
    },
    {
      title: "预估销售额",
      dataIndex: "estimatedSalesValue",
      width: 150,
      align: "right",
      render: (value: number | null) =>
        value === null ? <Text type="secondary">待填写成团率</Text> : formatCurrency(value),
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
      render: (priceConfig: OpeningExecutionRecord["priceConfig"]) => {
        const summary = summarizeExecutionPriceConfig(priceConfig);
        return <Text className={summary.includes("接口未返回") ? "missing-value" : undefined}>{summary}</Text>;
      },
    },
    {
      title: "最大人数库存",
      dataIndex: "groupSize",
      width: 120,
      align: "right",
    },
    {
      title: "团期销售价值",
      dataIndex: "salesValue",
      width: 140,
      align: "right",
      render: (_: unknown, record) => {
        if (record.status !== "开团成功") return <Text type="secondary">不计入</Text>;
        const value = calculateExecutionRecordSalesValue(record);
        return value === null ? <Text type="secondary">价格待填写</Text> : formatCurrency(value);
      },
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

      <Card title="销售测算">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={8}>
            <Text strong>总销售目标</Text>
            <InputNumber
              min={0}
              addonBefore="¥"
              value={salesTarget ?? undefined}
              placeholder="请填写"
              className="full-width control-input"
              onChange={(value) => onSalesTargetChange(value)}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong>历史成团率</Text>
            <InputNumber
              min={0}
              max={100}
              addonAfter="%"
              value={historicalSuccessRate ?? undefined}
              placeholder="请填写"
              className="full-width control-input"
              onChange={(value) => onHistoricalSuccessRateChange(value)}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">
              测算口径：只统计开团成功的团期；人价按最大人数库存，家庭价按规格均价乘房间数，套价按可售套数。
            </Text>
          </Col>
        </Row>

        <Space wrap size={16} style={{ marginTop: 16 }}>
          <Statistic title="本次团期总销售价值" value={latestSalesSummary.totalSalesValue} formatter={(value) => formatCurrency(Number(value))} />
          <Statistic
            title="占总销售目标"
            value={latestSalesSummary.targetRatio === null ? "待填写目标" : formatPercent(latestSalesSummary.targetRatio)}
          />
          <Statistic
            title="预估销售额"
            value={
              latestSalesSummary.estimatedSalesValue === null
                ? "待填写成团率"
                : formatCurrency(latestSalesSummary.estimatedSalesValue)
            }
          />
          <Statistic title="价格待填写团期" value={latestSalesSummary.missingPriceCount} suffix="个" />
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
    const guarantee =
      priceConfig.guaranteeAmount !== undefined
        ? ` / 保底 ${formatExecutionAmount(priceConfig.guaranteeAmount)}`
        : "";
    return `人 / 成人 ${formatExecutionAmount(priceConfig.adultPrice)} / 单间差 ${formatExecutionAmount(priceConfig.singleRoomSupplement)}${guarantee}`;
  }

  if (priceConfig.priceType === "家庭") {
    const specCount =
      priceConfig.familyPrices.length > 0 ? `${priceConfig.familyPrices.length} 组规格` : "规格待配置";
    return `家庭 / ${specCount} / 单间差 ${formatExecutionAmount(priceConfig.singleRoomSupplement)}`;
  }

  return `套 / ${priceConfig.packagePeople ?? "待填写"} 人 / ${formatExecutionAmount(priceConfig.packagePrice)}`;
}

function formatExecutionAmount(value: number | null | undefined) {
  return value === null || value === undefined ? "待填写" : `¥${value}`;
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
  totalSalesValue: number;
  targetRatio: number | null;
  estimatedSalesValue: number | null;
  missingPriceCount: number;
  records: OpeningExecutionRecord[];
}

function buildExecutionBatches(
  records: OpeningExecutionRecord[],
  salesTarget: number | null,
  historicalSuccessRate: number | null,
): OpeningExecutionBatch[] {
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
      const salesSummary = summarizeExecutionSales(sortedRecords, salesTarget, historicalSuccessRate);

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
        totalSalesValue: salesSummary.totalSalesValue,
        targetRatio: salesSummary.targetRatio,
        estimatedSalesValue: salesSummary.estimatedSalesValue,
        missingPriceCount: salesSummary.missingPriceCount,
        records: sortedRecords,
      };
    })
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt));
}
