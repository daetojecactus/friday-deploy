import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Card,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useStand } from './hooks/useStand';
import { ChatFeed } from './components/ChatFeed';
import { ProductionStatus } from './components/ProductionStatus';
import { ClientsTab } from './tabs/ClientsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { AccessTab } from './tabs/AccessTab';
import { SupportTab } from './tabs/SupportTab';
import { SystemTab } from './tabs/SystemTab';
import { call, formatTime } from './api';
import type { Connection, Customer, Incident } from './types';
import { STAND_COLORS } from './theme';

const { Title, Text } = Typography;

// Дежурная консоль CRM «Ориентир».
//
// Слева — симулятор действий пользователя (настоящие HTTP-запросы к боевому
// API), справа — продакшен глазами бизнеса: индикаторы синтетического
// мониторинга и рабочий чат. Вся рабочая область живет в одном экране.
export function Console() {
  const { message, notification } = App.useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);

  const loadCustomers = useCallback(async () => {
    const result = await call<Customer[]>('GET', '/api/customers');
    if (result.ok && result.data) setCustomers(result.data);
  }, []);

  const loadIncidents = useCallback(async () => {
    const result = await call<Incident[]>('GET', '/api/incidents');
    if (result.ok && result.data) setIncidents(result.data);
  }, []);

  // Индикатор позеленел — значит, синтетическая проба снова выполнила
  // бизнес-операцию. Показываем это отдельно от чата: в чате благодарит
  // коллега, здесь отчитывается мониторинг.
  const { status, messages, resetFeed } = useStand({
    onRecovered: (probe) =>
      notification.success({
        message: `Починено: ${probe.label}`,
        description: probe.note ?? probe.about,
        placement: 'bottomRight',
        duration: 6,
      }),
    onAllGreen: () =>
      notification.success({
        message: 'Продакшен полностью восстановлен',
        description: 'Все семь бизнес-операций проходят, мониторинг зеленый.',
        placement: 'bottomRight',
        duration: 12,
      }),
  });

  const install = status?.install;
  const ready = install?.phase === 'ready';

  useEffect(() => {
    void call<Connection>('GET', '/api/stand/connection').then((result) => {
      if (result.ok && result.data) setConnection(result.data);
    });
  }, []);

  // Справочники грузим, как только стенд установлен: до этого базы еще нет.
  useEffect(() => {
    if (!ready || customers.length) return;
    void loadCustomers();
    void loadIncidents();
  }, [ready, customers.length, loadCustomers, loadIncidents]);

  const handleReset = useCallback(async () => {
    const result = await call('POST', '/api/stand/reset');
    resetFeed();

    if (result.ok) {
      message.success('Стенд пересобран: данные и поломки на месте');
      await Promise.all([loadCustomers(), loadIncidents()]);
    } else {
      message.error(result.errorText ?? 'Пересобрать стенд не удалось');
    }
  }, [loadCustomers, loadIncidents, message, resetFeed]);

  return (
    <div className="stand-shell">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '12px 18px',
          background: STAND_COLORS.card,
          borderBottom: `1px solid ${STAND_COLORS.border}`,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 16, letterSpacing: 0.3 }}>
            CRM «Ориентир» · дежурная консоль
          </Title>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Приложение исправно. Разбираться нужно с базой.
          </Text>
        </div>

        <Space size={10} wrap>
          {connection ? (
            <Text
              className="stand-mono"
              type="secondary"
              style={{ fontSize: 12 }}
              copyable={{ text: connection.uri }}
            >
              {connection.host}:{connection.port}
            </Text>
          ) : null}
          <Tag color={ready ? 'success' : 'processing'}>
            {ready ? 'стенд установлен' : 'идет установка'}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {status?.lastCycleAt
              ? `мониторинг: ${formatTime(status.lastCycleAt)} · раз в ${(status.cycleMs ?? 5000) / 1000} с`
              : 'мониторинг ждет стенд'}
          </Text>
        </Space>
      </header>

      {install && install.phase !== 'ready' ? (
        <div style={{ padding: '12px 16px 0' }}>
          <Alert
            type={install.phase === 'failed' ? 'error' : 'warning'}
            showIcon
            icon={install.phase === 'failed' ? undefined : <Spin size="small" />}
            message={
              install.phase === 'failed'
                ? `Стенд не установился: ${install.error}`
                : `Идет установка стенда: ${install.step ?? 'подключаемся к MongoDB'}…`
            }
          />
        </div>
      ) : null}

      <div className="stand-body">
        <Card
          className="stand-card-fill"
          title="Симулятор действий пользователя"
          size="small"
        >
          <Tabs
            className="stand-tabs"
            size="large"
            items={[
              {
                key: 'clients',
                label: 'Клиенты',
                icon: <TeamOutlined />,
                children: (
                  <div className="stand-scroll">
                    <ClientsTab customers={customers} reloadCustomers={() => void loadCustomers()} />
                  </div>
                ),
              },
              {
                key: 'orders',
                label: 'Заказы',
                icon: <ShoppingOutlined />,
                children: (
                  <div className="stand-scroll">
                    <OrdersTab />
                  </div>
                ),
              },
              {
                key: 'access',
                label: 'Доступ',
                icon: <ApiOutlined />,
                children: (
                  <div className="stand-scroll">
                    <AccessTab customers={customers} />
                  </div>
                ),
              },
              {
                key: 'support',
                label: 'Поддержка',
                icon: <CustomerServiceOutlined />,
                children: (
                  <div className="stand-scroll">
                    <SupportTab
                      incidents={incidents}
                      reloadIncidents={() => void loadIncidents()}
                    />
                  </div>
                ),
              },
              {
                key: 'system',
                label: 'Система',
                icon: <DatabaseOutlined />,
                children: (
                  <div className="stand-scroll">
                    <SystemTab connection={connection} ready={ready} onReset={handleReset} />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        <div className="stand-column">
          <Card title="Production status" size="small">
            <ProductionStatus probes={status?.probes ?? []} />
          </Card>

          <Card
            className="stand-card-fill"
            title="#incidents · рабочий чат"
            size="small"
          >
            <ChatFeed messages={messages} />
          </Card>
        </div>
      </div>
    </div>
  );
}
