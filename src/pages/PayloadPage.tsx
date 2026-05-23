import { ApiOutlined, FileTextOutlined } from "@ant-design/icons";
import { Alert, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import type { OpeningPayload } from "../types/domain";

const { Text, Paragraph } = Typography;

export function PayloadPage({
  payloads,
}: {
  payloads: OpeningPayload[];
}) {
  if (payloads.length === 0) {
    return (
      <Card>
        <Empty description="只有状态为可开团的计划会生成 mock 开团接口 payload。" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          Payload 预览
        </Space>
      }
      extra={<Text type="secondary">生成计划后先预览，产品运营确认后再模拟执行开团接口</Text>}
    >
      <Space direction="vertical" size={16} className="full-width">
        <Alert
          type="info"
          showIcon
          title="这里只展示可开团计划的 mock 请求参数；确认执行后的成功、失败和团期号请在“开团结果”页查看。"
        />

        <Row gutter={[16, 16]}>
          {payloads.map((payload) => (
            <Col
              xs={24}
              xl={12}
              key={`${payload.productCode}-${payload.itineraryCode}-${payload.departureDate}`}
            >
              <Card
                size="small"
                title={
                  <Space wrap>
                    <Tag color="blue">{payload.businessType}</Tag>
                    <Text code>{payload.productCode}</Text>
                    <Text type="secondary">{payload.departureDate}</Text>
                  </Space>
                }
                extra={<ApiOutlined />}
              >
                <Paragraph className="payload-pre">
                  <pre>{JSON.stringify(payload, null, 2)}</pre>
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}
