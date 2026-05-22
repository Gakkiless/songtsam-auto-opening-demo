import { ApiOutlined, FileTextOutlined } from "@ant-design/icons";
import { Alert, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import type { OpeningPayload } from "../types/domain";

const { Text, Paragraph } = Typography;

export function PayloadPage({
  payloads,
  executedPayloads,
  executionMessage,
}: {
  payloads: OpeningPayload[];
  executedPayloads: OpeningPayload[];
  executionMessage: string;
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
      <Space orientation="vertical" size={16} className="full-width">
        {executionMessage ? <Alert type="success" showIcon title={executionMessage} /> : null}
        {executedPayloads.length > 0 ? (
          <Alert
            type="info"
            showIcon
            title={`已执行 mock 开团接口 ${executedPayloads.length} 条`}
            description={
              <>
                浏览器控制台输出 key 为 <Text code>mock execute opening api</Text>。
              </>
            }
          />
        ) : null}

        <Row gutter={[16, 16]}>
          {payloads.map((payload) => (
            <Col xs={24} xl={12} key={`${payload.productCode}-${payload.departureDate}-${payload.groupNo}`}>
              <Card
                size="small"
                title={
                  <Space wrap>
                    <Tag color="blue">{payload.businessType}</Tag>
                    <Text code>{payload.groupNo}</Text>
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
