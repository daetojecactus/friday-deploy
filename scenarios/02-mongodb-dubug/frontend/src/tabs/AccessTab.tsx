import { useEffect, useState } from 'react';
import { App, Button, Form, Modal, Select, Space, Tag, Typography } from 'antd';
import { ActionBlock } from '../components/ActionBlock';
import { ResponseView } from '../components/ResponseView';
import { call, type ApiResult } from '../api';
import type { Customer, Session } from '../types';

const { Text } = Typography;

type Props = { customers: Customer[] };

type MeResponse = {
  token: string;
  loggedInAt: string;
  sessionAgeSec: number;
  customer: { firstName: string; lastName: string; plan?: string } | null;
};

// Вход в личный кабинет и работа под выданной сессией.
export function AccessTab({ customers }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ customerId: string }>();

  const [modalOpen, setModalOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginResult, setLoginResult] = useState<ApiResult<Session> | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [loginAt, setLoginAt] = useState<number | null>(null);
  const [ageSec, setAgeSec] = useState(0);

  const [checking, setChecking] = useState(false);
  const [meResult, setMeResult] = useState<ApiResult<MeResponse> | null>(null);

  // Возраст сессии тикает на странице: с ним понятнее, через сколько именно
  // кабинет отвечает «session expired».
  useEffect(() => {
    if (!loginAt) return;
    const timer = window.setInterval(
      () => setAgeSec(Math.round((Date.now() - loginAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loginAt]);

  const openModal = () => {
    form.setFieldsValue({ customerId: customers[0]?._id });
    setModalOpen(true);
  };

  const login = async ({ customerId }: { customerId: string }) => {
    setLoggingIn(true);
    const result = await call<Session>('POST', '/api/auth/login', { customerId });
    setLoggingIn(false);
    setLoginResult(result);
    setModalOpen(false);
    setMeResult(null);

    if (result.ok && result.data) {
      setToken(result.data.token);
      setLoginAt(Date.now());
      setAgeSec(0);
      message.success(`Вошли как ${result.data.customer}`);
    } else {
      setToken(null);
      setLoginAt(null);
      message.error(result.errorText ?? 'Войти не удалось');
    }
  };

  const requestUnderSession = async () => {
    if (!token) return;
    setChecking(true);
    const result = await call<MeResponse>('GET', `/api/auth/me?token=${token}`);
    setChecking(false);
    setMeResult(result);
    if (result.ok) message.success('Кабинет ответил: сессия жива');
    else message.error(result.errorText ?? 'Кабинет не пустил');
  };

  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.firstName} ${customer.lastName} · ${customer.email}`,
  }));

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ActionBlock
        title="Вход в личный кабинет"
        description="Логин выдает токен сессии."
        controls={
          <>
            <Button type="primary" size="large" onClick={openModal} disabled={!customers.length}>
              Войти в кабинет
            </Button>
            {token ? (
              <Tag color="processing" className="stand-mono">
                токен {token.slice(0, 8)}… · возраст {ageSec} с
              </Tag>
            ) : (
              <Text type="secondary">сессии нет</Text>
            )}
          </>
        }
      >
        <ResponseView
          result={loginResult}
          loading={loggingIn}
        />
      </ActionBlock>

      <ActionBlock
        title="Запрос под сессией"
        description="Кабинет проверяет, жива ли сессия."
        controls={
          <Button
            size="large"
            loading={checking}
            disabled={!token}
            onClick={() => void requestUnderSession()}
          >
            Выполнить GET /api/auth/me
          </Button>
        }
      >
        <ResponseView
          result={meResult}
          loading={checking}
          summary={token ? <span>сессии {ageSec} с от роду</span> : null}
        />
      </ActionBlock>

      <Modal
        title="Вход в личный кабинет"
        open={modalOpen}
        okText="Отправить POST /api/auth/login"
        cancelText="Отмена"
        confirmLoading={loggingIn}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={520}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void login(values)}
          style={{ marginTop: 18 }}
        >
          <Form.Item
            name="customerId"
            label="От чьего имени входим"
            rules={[{ required: true, message: 'Выберите клиента' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={customerOptions}
              placeholder="Выберите клиента"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
