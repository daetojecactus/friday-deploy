import { Empty, Tooltip, Typography } from 'antd';
import type { Probe, ProbeStatus } from '../types';
import { formatTime } from '../api';
import { STAND_COLORS } from '../theme';

const { Text } = Typography;

const DOT: Record<ProbeStatus, string> = {
  green: STAND_COLORS.green,
  red: STAND_COLORS.red,
  yellow: STAND_COLORS.amber,
  unknown: '#4b5163',
};

const HINT: Record<ProbeStatus, string> = {
  green: 'бизнес-операция выполняется',
  red: 'операция падает или возвращает заведомо не то',
  yellow: 'операции проходят, но метрика вышла за норму',
  unknown: 'проверка еще идет',
};

// Продакшен глазами бизнеса: семь возможностей и их цвет. Цвет ставит
// синтетический монитор, а не клики по кнопкам слева.
export function ProductionStatus({ probes }: { probes: Probe[] }) {
  if (!probes.length) {
    return <Empty description="мониторинг еще не отработал" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      {probes.map((probe) => (
        <Tooltip
          key={probe.key}
          title={
            <span>
              {HINT[probe.status]}
              {probe.checkedAt ? ` · проверено в ${formatTime(probe.checkedAt)}` : ''}
            </span>
          }
        >
          <div
            style={{
              background: '#1c202a',
              border: `1px solid ${STAND_COLORS.border}`,
              borderRadius: 10,
              padding: '11px 13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: DOT[probe.status],
                  flex: '0 0 auto',
                }}
              />
              <Text strong style={{ fontSize: 13.5 }}>
                {probe.label}
              </Text>
            </div>
            <Text
              type="secondary"
              style={{ display: 'block', marginTop: 5, fontSize: 12, minHeight: 17 }}
            >
              {probe.note ?? probe.about}
            </Text>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
