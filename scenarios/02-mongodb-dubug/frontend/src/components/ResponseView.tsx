import type { ReactNode } from 'react';
import { Spin, Tag, Typography } from 'antd';
import type { ApiResult } from '../api';
import { STAND_COLORS } from '../theme';

const { Text } = Typography;

type Props = {
  result: ApiResult<unknown> | null;
  loading?: boolean;
  /** Короткий человеческий комментарий: что именно отправили. */
  summary?: ReactNode;
  /** Чем заменить тело в выводе — например, урезанным списком заказов. */
  bodyOverride?: unknown;
  placeholder?: string;
};

// Сырой ответ API как есть: метод, адрес, HTTP-код, время и тело целиком.
// Ответ намеренно не интерпретируется — связь «ошибка → место в базе» участник
// строит сам.
export function ResponseView({ result, loading, summary, bodyOverride, placeholder }: Props) {
  if (loading && !result) {
    return (
      <div style={box(STAND_COLORS.muted)}>
        <div style={{ padding: '14px 12px' }}>
          <Spin size="small" /> <Text type="secondary">запрос выполняется…</Text>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ ...box(STAND_COLORS.border), padding: '12px' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {placeholder ?? 'Ответ API появится здесь.'}
        </Text>
      </div>
    );
  }

  const accent = result.ok ? STAND_COLORS.green : STAND_COLORS.red;
  const body = bodyOverride !== undefined ? bodyOverride : result.payload;
  const curl =
    result.method === 'GET'
      ? `curl -s ${location.origin}${result.url}`
      : `curl -s -X POST ${location.origin}${result.url}`;

  return (
    <div style={box(accent)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderBottom: `1px solid ${STAND_COLORS.border}`,
        }}
      >
        <Text className="stand-mono" style={{ fontSize: 12.5 }} copyable={{ text: curl }}>
          {result.method} {result.url}
        </Text>
        <Tag color={result.ok ? 'success' : 'error'} style={{ marginInlineEnd: 0 }}>
          {result.status || 'нет ответа'}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {result.ms} мс
        </Text>
        {loading ? <Spin size="small" /> : null}
      </div>

      {summary ? (
        <div style={{ padding: '8px 12px 0', fontSize: 13 }}>{summary}</div>
      ) : null}

      <pre className="stand-raw">{JSON.stringify(body, null, 2)}</pre>
    </div>
  );
}

const box = (accent: string) => ({
  border: `1px solid ${STAND_COLORS.border}`,
  borderLeft: `3px solid ${accent}`,
  borderRadius: 8,
  background: '#12141b',
  overflow: 'hidden' as const,
});
