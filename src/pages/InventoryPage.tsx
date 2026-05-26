import { WarningOutlined } from "@ant-design/icons";
import { Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { formatPercent } from "../engine/openingEngine";
import type { InventoryViewRow, RoomClass } from "../types/domain";

const { Text } = Typography;

interface InventoryDateMetric {
  totalRooms: number;
  publicPool: number;
  preReserved: number;
  preAllocated: number;
  preOccupied: number;
  actualOccupied: number;
  offlineOccupied: number;
  maintenance: number;
  plannedRooms: number;
  availableLimit: number;
  occupancyRate: number;
  overLimit: boolean;
}

interface InventoryTableRow {
  key: string;
  rowType: "hotelTotal" | "roomType";
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  roomTypeCode?: string;
  roomTypeName: string;
  roomClass?: RoomClass;
  isAdvancedRoom?: boolean;
  dateMetrics: Partial<Record<string, InventoryDateMetric>>;
  children?: InventoryTableRow[];
}

type MetricKey = keyof InventoryDateMetric;

const metricColumns: Array<{
  key: MetricKey;
  title: string;
  width: number;
  render?: (metric: InventoryDateMetric) => ReactNode;
}> = [
  { key: "totalRooms", title: "总数", width: 72 },
  { key: "publicPool", title: "公共池", width: 82 },
  { key: "preReserved", title: "预保留", width: 82 },
  { key: "preAllocated", title: "预分配", width: 82 },
  { key: "preOccupied", title: "预占", width: 72 },
  { key: "actualOccupied", title: "实占", width: 72 },
  { key: "offlineOccupied", title: "线下占用", width: 96 },
  { key: "maintenance", title: "维修", width: 72 },
  {
    key: "plannedRooms",
    title: "本次计划",
    width: 92,
    render: (metric) => <Text strong>{metric.plannedRooms}</Text>,
  },
  { key: "availableLimit", title: "可用", width: 72 },
  {
    key: "occupancyRate",
    title: "占用率",
    width: 86,
    render: (metric) => (
      <Text type={metric.overLimit ? "danger" : "secondary"}>
        {formatPercent(metric.occupancyRate)}
      </Text>
    ),
  },
  {
    key: "overLimit",
    title: "是否超限",
    width: 96,
    render: (metric) =>
      metric.overLimit ? (
        <Tag icon={<WarningOutlined />} color="error">
          超限
        </Tag>
      ) : (
        <Tag color="success">未超限</Tag>
      ),
  },
];

export function InventoryPage({ rows }: { rows: InventoryViewRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <Empty description="酒店房型库存接口未返回数据；接入库存接口后无需生成开团计划也会展示资源占用情况。" />
      </Card>
    );
  }

  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const tableRows = buildInventoryTableRows(rows, dates);
  const columns: ColumnsType<InventoryTableRow> = [
    {
      title: "酒店",
      dataIndex: "hotelName",
      width: 240,
      fixed: "left",
      render: (_: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong={row.rowType === "hotelTotal"}>{row.hotelName}</Text>
          <Text type="secondary">
            {row.hotelCode}
            {row.hotelShortName ? ` / ${row.hotelShortName}` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "房型",
      dataIndex: "roomTypeName",
      width: 260,
      fixed: "left",
      render: (_: string, row) =>
        row.rowType === "hotelTotal" ? (
          <Text strong>总计</Text>
        ) : (
          <Space direction="vertical" size={0}>
            <Text>{row.roomTypeName}</Text>
            <Space size={4}>
              {row.roomClass ? <Tag>{row.roomClass}</Tag> : null}
              {row.isAdvancedRoom ? <Tag color="gold">高级</Tag> : <Tag color="blue">基础</Tag>}
            </Space>
          </Space>
        ),
    },
    ...dates.map((date) => ({
      title: formatDateHeader(date),
      align: "center" as const,
      children: metricColumns.map((column) => ({
        title: column.title,
        dataIndex: ["dateMetrics", date, column.key],
        width: column.width,
        align: "right" as const,
        render: (_: unknown, row: InventoryTableRow) => {
          const metric = row.dateMetrics[date];
          if (!metric) return <Text type="secondary">-</Text>;
          return column.render ? column.render(metric) : metric[column.key];
        },
      })),
    })),
  ];

  return (
    <Card
      title="酒店资源占用表"
      extra={<Text type="secondary">按日期横向展示；点击酒店总计行展开房型明细</Text>}
    >
      <Table
        rowKey={(row) => row.key}
        size="middle"
        dataSource={tableRows}
        columns={columns}
        expandable={{
          defaultExpandAllRows: false,
          expandRowByClick: true,
          rowExpandable: (row) => Boolean(row.children?.length),
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowClassName={(row) => (row.rowType === "hotelTotal" ? "inventory-total-row" : "")}
        scroll={{ x: 500 + dates.length * 976 }}
      />
    </Card>
  );
}

function buildInventoryTableRows(rows: InventoryViewRow[], dates: string[]): InventoryTableRow[] {
  const hotelGroups = new Map<string, InventoryViewRow[]>();

  rows.forEach((row) => {
    const hotelRows = hotelGroups.get(row.hotelCode) ?? [];
    hotelRows.push(row);
    hotelGroups.set(row.hotelCode, hotelRows);
  });

  return [...hotelGroups.values()]
    .map((hotelRows) => {
      const firstHotelRow = hotelRows[0];
      const children = buildRoomTypeRows(hotelRows, dates);

      return {
        key: `hotel-${firstHotelRow.hotelCode}`,
        rowType: "hotelTotal" as const,
        hotelCode: firstHotelRow.hotelCode,
        hotelName: firstHotelRow.hotelName,
        hotelShortName: firstHotelRow.hotelShortName,
        roomTypeName: "总计",
        dateMetrics: buildDateMetrics(hotelRows, dates),
        children,
      };
    })
    .sort((a, b) => a.hotelName.localeCompare(b.hotelName, "zh-CN"));
}

function buildRoomTypeRows(rows: InventoryViewRow[], dates: string[]): InventoryTableRow[] {
  const roomTypeGroups = new Map<string, InventoryViewRow[]>();

  rows.forEach((row) => {
    const groupKey = row.roomTypeCode || row.roomTypeName;
    const roomTypeRows = roomTypeGroups.get(groupKey) ?? [];
    roomTypeRows.push(row);
    roomTypeGroups.set(groupKey, roomTypeRows);
  });

  return [...roomTypeGroups.values()]
    .map((roomTypeRows) => {
      const firstRoomTypeRow = roomTypeRows[0];

      return {
        key: `room-${firstRoomTypeRow.hotelCode}-${firstRoomTypeRow.roomTypeCode}`,
        rowType: "roomType" as const,
        hotelCode: firstRoomTypeRow.hotelCode,
        hotelName: firstRoomTypeRow.hotelName,
        hotelShortName: firstRoomTypeRow.hotelShortName,
        roomTypeCode: firstRoomTypeRow.roomTypeCode,
        roomTypeName: firstRoomTypeRow.roomTypeName,
        roomClass: firstRoomTypeRow.roomClass,
        isAdvancedRoom: firstRoomTypeRow.isAdvancedRoom,
        dateMetrics: buildDateMetrics(roomTypeRows, dates),
      };
    })
    .sort((a, b) => a.roomTypeName.localeCompare(b.roomTypeName, "zh-CN"));
}

function buildDateMetrics(
  rows: InventoryViewRow[],
  dates: string[],
): Partial<Record<string, InventoryDateMetric>> {
  return Object.fromEntries(
    dates
      .map((date) => {
        const rowsForDate = rows.filter((row) => row.date === date);
        return rowsForDate.length > 0 ? [date, summarizeDateMetrics(rowsForDate)] : null;
      })
      .filter((entry): entry is [string, InventoryDateMetric] => Boolean(entry)),
  );
}

function summarizeDateMetrics(rows: InventoryViewRow[]): InventoryDateMetric {
  const publicPool = sumBy(rows, (row) => row.publicPool);
  const preReserved = sumBy(rows, (row) => row.preReserved);
  const preAllocated = sumBy(rows, (row) => row.preAllocated);
  const preOccupied = sumBy(rows, (row) => row.preOccupied);
  const actualOccupied = sumBy(rows, (row) => row.actualOccupied);
  const offlineOccupied = sumBy(rows, (row) => row.offlineOccupied);
  const maintenance = sumBy(rows, (row) => row.maintenance);
  const plannedRooms = sumBy(rows, (row) => row.plannedRooms);
  const availableLimit = sumBy(rows, (row) => row.availableLimit);
  const occupiedRooms =
    preReserved +
    preAllocated +
    preOccupied +
    actualOccupied +
    offlineOccupied +
    maintenance +
    plannedRooms;
  const totalRooms = sumBy(rows, (row) => row.totalRooms);

  return {
    totalRooms,
    publicPool,
    preReserved,
    preAllocated,
    preOccupied,
    actualOccupied,
    offlineOccupied,
    maintenance,
    plannedRooms,
    availableLimit,
    occupancyRate: totalRooms === 0 ? 0 : occupiedRooms / totalRooms,
    overLimit: rows.some((row) => row.overLimit),
  };
}

function sumBy(rows: InventoryViewRow[], getValue: (row: InventoryViewRow) => number): number {
  return rows.reduce((sum, row) => sum + getValue(row), 0);
}

function formatDateHeader(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][parsedDate.getDay()];
  return `${date.slice(5)}(${weekday})`;
}
