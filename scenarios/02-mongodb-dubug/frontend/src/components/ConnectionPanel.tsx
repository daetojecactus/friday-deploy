import { Space, Typography } from 'antd';
import type { Connection } from '../types';

const { Paragraph, Text } = Typography;

const line = { margin: 0, wordBreak: 'break-all' as const, fontSize: 13 };

// Строка подключения к базе стенда. Адрес — тот, по которому открыта страница,
// поэтому строку можно скопировать и отдать коллеге в той же сети.
export function ConnectionPanel({ connection }: { connection: Connection | null }) {
  if (!connection) return <Text type="secondary">адрес базы загружается…</Text>;

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Paragraph copyable={{ text: connection.uri }} className="stand-mono" style={line}>
        {connection.uri}
      </Paragraph>

      <Paragraph copyable={{ text: connection.dockerCommand }} className="stand-mono" style={line}>
        {connection.dockerCommand}
      </Paragraph>

      <Text type="secondary" style={{ fontSize: 12.5 }}>
        {connection.loopback
          ? 'Открыто как localhost. Зайдите по адресу машины в сети — адрес в строке подставится сам.'
          : `Порт ${connection.port} открыт наружу: строку можно отдать коллеге в той же сети.`}
      </Text>
    </Space>
  );
}
