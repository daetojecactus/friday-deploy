import type { ReactNode } from 'react';
import { Space, Typography } from 'antd';
import { STAND_COLORS } from '../theme';

const { Title, Text } = Typography;

type Props = {
  title: string;
  description: ReactNode;
  /** Кнопки и поля, которыми запускается сценарий. */
  controls: ReactNode;
  /** Результат: сырой ответ API, таблица, статистика. */
  children?: ReactNode;
};

// Один бизнес-сценарий на вкладке: что это, чем запускается, что ответило.
// Блоки крупные и с воздухом — на экране их не больше двух-трех.
export function ActionBlock({ title, description, controls, children }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${STAND_COLORS.border}`,
        borderRadius: 12,
        background: '#1a1e27',
        padding: 18,
      }}
    >
      <Title level={5} style={{ margin: 0, fontSize: 16 }}>
        {title}
      </Title>
      <Text type="secondary" style={{ display: 'block', margin: '6px 0 14px', fontSize: 13 }}>
        {description}
      </Text>

      <Space size={10} wrap style={{ marginBottom: children ? 14 : 0 }}>
        {controls}
      </Space>

      {children}
    </section>
  );
}
