import { useEffect, useState } from 'react';
import { Space, Table, Tag, Typography } from 'antd';
import { ActionBlock } from '../components/ActionBlock';
import { ResponseView } from '../components/ResponseView';
import { call, formatTime, type ApiResult } from '../api';
import { ORDER_STATUS_COLOR } from '../demo';
import type { Order } from '../types';

const { Text } = Typography;

// Витрина сама перезапрашивает данные — как настоящий экран менеджера, который
// висит открытым весь день. Интервал совпадает с циклом мониторинга: починка в
// базе видна и на плашке, и в списке примерно в одну секунду.
const POLL_MS = 5000;

export function OrdersTab() {
  const [result, setResult] = useState<ApiResult<Order[]> | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const tick = async () => {
      const response = await call<Order[]>('GET', '/api/orders');
      if (!alive) return;

      setResult(response);
      setRefreshedAt(new Date().toISOString());
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };

    void tick();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const rows = result?.ok ? (result.data ?? []) : [];

  // В сыром ответе список подрезаем: две строки показывают форму документа,
  // а полсотни заказов сделали бы блок нечитаемым.
  const rawBody =
    result?.ok && rows.length > 2
      ? { ok: true, data: [...rows.slice(0, 2), `… и еще ${rows.length - 2}`] }
      : undefined;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ActionBlock
        title="Заказы в работе"
        description="Витрина открытых заказов: статусы Open и Pending, свежие сверху."
        controls={
          <Text type="secondary">
            {result?.ok ? `${rows.length} заказов` : 'нет данных'}
            {refreshedAt ? ` · обновлено в ${formatTime(refreshedAt)} · раз в 5 с` : ''}
          </Text>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {result?.ok ? (
            <Table<Order>
              size="small"
              rowKey="_id"
              dataSource={rows}
              pagination={rows.length > 10 ? { pageSize: 10, size: 'small' } : false}
              locale={{ emptyText: 'витрина пустая' }}
              columns={[
                { title: 'Заказ', dataIndex: 'orderNo' },
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  width: 120,
                  render: (status: string) => (
                    <Tag color={ORDER_STATUS_COLOR[status] ?? 'default'}>{status}</Tag>
                  ),
                },
              ]}
            />
          ) : null}

          <ResponseView result={result} bodyOverride={rawBody} />
        </Space>
      </ActionBlock>
    </Space>
  );
}
