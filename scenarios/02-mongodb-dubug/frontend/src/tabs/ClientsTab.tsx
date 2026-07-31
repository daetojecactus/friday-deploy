import { useState } from 'react';
import {
  App,
  AutoComplete,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { ActionBlock } from '../components/ActionBlock';
import { ResponseView } from '../components/ResponseView';
import { call, type ApiResult } from '../api';
import { draftCustomer } from '../demo';
import type { Customer } from '../types';

const { Text } = Typography;

type Props = {
  customers: Customer[];
  reloadCustomers: () => void;
};

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
};

type Profile = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number | string;
  city?: string;
  plan?: string;
  birthYear?: number;
  ordersCount?: number;
  ordersTotal?: number;
};

// Клиенты CRM: регистрация нового и карточка существующего.
export function ClientsTab({ customers, reloadCustomers }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<RegisterForm>();

  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [registerResult, setRegisterResult] = useState<ApiResult<Customer> | null>(null);
  const [sent, setSent] = useState<RegisterForm | null>(null);

  const [selected, setSelected] = useState<string | undefined>();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileResult, setProfileResult] = useState<ApiResult<Profile> | null>(null);

  const openModal = () => {
    form.setFieldsValue(draftCustomer(customers));
    setModalOpen(true);
  };

  const submitRegistration = async (values: RegisterForm) => {
    setSending(true);
    const result = await call<Customer>('POST', '/api/customers', values);
    setSending(false);
    setRegisterResult(result);
    setSent(values);
    setModalOpen(false);

    if (result.ok) {
      message.success(`Клиент ${values.firstName} ${values.lastName} сохранен`);
      reloadCustomers();
    } else {
      message.error(result.errorText ?? 'Клиент не сохранен');
    }
  };

  const openProfile = async () => {
    if (!selected) return;
    setLoadingProfile(true);
    const result = await call<Profile>('GET', `/api/customers/${selected}`);
    setLoadingProfile(false);
    setProfileResult(result);
    if (!result.ok) message.error(result.errorText ?? 'Карточка не открылась');
  };

  const profile = profileResult?.ok ? profileResult.data : null;
  const options = customers.map((customer) => ({
    value: customer._id,
    label: `${customer.firstName} ${customer.lastName} · ${customer.email}`,
  }));

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ActionBlock
        title="Регистрация клиента"
        description="Новый клиент: имя из существующего пула, почта уникальная."
        controls={
          <>
            <Button type="primary" size="large" onClick={openModal} disabled={!customers.length}>
              Заполнить карточку клиента
            </Button>
            {sent ? (
              <Text type="secondary">
                последняя отправка: {sent.firstName} {sent.lastName}
              </Text>
            ) : null}
          </>
        }
      >
        <ResponseView
          result={registerResult}
          loading={sending}
          summary={
            sent ? (
              <span>
                отправлено: <b>{`${sent.firstName} ${sent.lastName}`}</b>, {sent.email}
              </span>
            ) : null
          }
        />
      </ActionBlock>

      <ActionBlock
        title="Карточка клиента"
        description="Профиль клиента: возраст, год рождения, сумма покупок."
        controls={
          <>
            <Select
              showSearch
              size="large"
              style={{ minWidth: 340 }}
              placeholder="Выберите клиента"
              optionFilterProp="label"
              options={options}
              value={selected}
              onChange={setSelected}
            />
            <Button
              size="large"
              loading={loadingProfile}
              disabled={!selected}
              onClick={() => void openProfile()}
            >
              Открыть карточку
            </Button>
          </>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {profile ? (
            <Descriptions
              size="small"
              bordered
              column={2}
              items={[
                { key: 'name', label: 'Клиент', children: `${profile.firstName} ${profile.lastName}` },
                { key: 'email', label: 'Почта', children: profile.email },
                { key: 'age', label: 'Возраст', children: String(profile.age) },
                { key: 'birth', label: 'Год рождения', children: String(profile.birthYear ?? '—') },
                { key: 'orders', label: 'Заказов', children: String(profile.ordersCount ?? 0) },
                {
                  key: 'total',
                  label: 'Сумма покупок',
                  children: `${(profile.ordersTotal ?? 0).toLocaleString('ru-RU')} ₽`,
                },
                { key: 'city', label: 'Город', children: profile.city ?? '—' },
                {
                  key: 'plan',
                  label: 'Тариф',
                  children: <Tag>{profile.plan ?? '—'}</Tag>,
                },
              ]}
            />
          ) : null}

          <ResponseView
            result={profileResult}
            loading={loadingProfile}
          />
        </Space>
      </ActionBlock>

      <Modal
        title="Новый клиент"
        open={modalOpen}
        okText="Отправить POST /api/customers"
        cancelText="Отмена"
        confirmLoading={sending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={520}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void submitRegistration(values)}
          style={{ marginTop: 18 }}
        >
          <Form.Item
            name="firstName"
            label="Имя"
            rules={[{ required: true, message: 'Имя обязательно' }]}
          >
            <AutoComplete
              options={[...new Set(customers.map((customer) => customer.firstName))].map(
                (name) => ({ value: name }),
              )}
              filterOption={(input, option) =>
                String(option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder="Имя"
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true, message: 'Фамилия обязательна' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Почта"
            rules={[
              { required: true, message: 'Почта обязательна' },
              { type: 'email', message: 'Похоже, это не адрес почты' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="age" label="Возраст">
            <InputNumber min={18} max={99} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
