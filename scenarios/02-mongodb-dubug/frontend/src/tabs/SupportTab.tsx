import { useState } from 'react';
import { App, Button, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { ActionBlock } from '../components/ActionBlock';
import { ResponseView } from '../components/ResponseView';
import { call, type ApiResult } from '../api';
import { INCIDENT_STATUSES, TICKET_DRAFT } from '../demo';
import type { Incident } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

type Props = {
  incidents: Incident[];
  reloadIncidents: () => void;
};

type TicketForm = { subject: string; body: string; additionalInfo?: string };
type IncidentForm = { incidentId: string; status: string };

// Поддержка: обращение с сайта и перевод внутреннего инцидента в работу.
export function SupportTab({ incidents, reloadIncidents }: Props) {
  const { message } = App.useApp();

  const [ticketForm] = Form.useForm<TicketForm>();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketResult, setTicketResult] = useState<ApiResult<unknown> | null>(null);
  const [ticketSummary, setTicketSummary] = useState<string | null>(null);

  const [incidentForm] = Form.useForm<IncidentForm>();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSending, setIncidentSending] = useState(false);
  const [incidentResult, setIncidentResult] = useState<ApiResult<unknown> | null>(null);

  const openTicket = () => {
    ticketForm.setFieldsValue(TICKET_DRAFT);
    setTicketOpen(true);
  };

  const sendTicket = async (values: TicketForm) => {
    setTicketSending(true);
    const result = await call('POST', '/api/tickets', values);
    setTicketSending(false);
    setTicketResult(result);
    setTicketOpen(false);
    setTicketSummary(
      values.additionalInfo?.trim()
        ? 'все поля формы заполнены'
        : 'дополнительная информация не заполнена',
    );

    if (result.ok) message.success('Обращение создано');
    else message.error(result.errorText ?? 'Обращение не создано');
  };

  const openIncident = () => {
    incidentForm.setFieldsValue({ incidentId: incidents[0]?._id, status: 'Active' });
    setIncidentOpen(true);
  };

  const sendIncident = async ({ incidentId, status }: IncidentForm) => {
    setIncidentSending(true);
    const result = await call('POST', `/api/incidents/${incidentId}/status`, { status });
    setIncidentSending(false);
    setIncidentResult(result);
    setIncidentOpen(false);

    if (result.ok) {
      message.success(`Инцидент переведен в ${status}`);
      reloadIncidents();
    } else {
      message.error(result.errorText ?? 'Статус не сохранился');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ActionBlock
        title="Обращение в поддержку"
        description="Форма с сайта: тема и текст обязательны, дополнительная информация — нет."
        controls={
          <>
            <Button type="primary" size="large" onClick={openTicket}>
              Заполнить обращение
            </Button>
            {ticketSummary ? <Text type="secondary">{ticketSummary}</Text> : null}
          </>
        }
      >
        <ResponseView
          result={ticketResult}
          loading={ticketSending}
          summary={ticketSummary}
        />
      </ActionBlock>

      <ActionBlock
        title="Инцидент в работу"
        description="Внутренний инцидент CRM: New → Active."
        controls={
          <Button
            type="primary"
            size="large"
            onClick={openIncident}
            disabled={!incidents.length}
          >
            Выбрать инцидент и статус
          </Button>
        }
      >
        <ResponseView
          result={incidentResult}
          loading={incidentSending}
        />
      </ActionBlock>

      <Modal
        title="Новое обращение"
        open={ticketOpen}
        okText="Отправить POST /api/tickets"
        cancelText="Отмена"
        confirmLoading={ticketSending}
        onCancel={() => setTicketOpen(false)}
        onOk={() => ticketForm.submit()}
        width={560}
        destroyOnClose
      >
        <Form
          form={ticketForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void sendTicket(values)}
          style={{ marginTop: 18 }}
        >
          <Form.Item
            name="subject"
            label="Тема"
            rules={[{ required: true, message: 'Тема обязательна' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="body"
            label="Текст обращения"
            rules={[{ required: true, message: 'Текст обязателен' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="additionalInfo"
            label="Дополнительная информация"
            extra="Необязательное поле."
          >
            <Input placeholder="Номер договора — можно оставить пустым" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Перевод инцидента"
        open={incidentOpen}
        okText="Отправить новый статус"
        cancelText="Отмена"
        confirmLoading={incidentSending}
        onCancel={() => setIncidentOpen(false)}
        onOk={() => incidentForm.submit()}
        width={560}
        destroyOnClose
      >
        <Form
          form={incidentForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void sendIncident(values)}
          style={{ marginTop: 18 }}
        >
          <Form.Item
            name="incidentId"
            label="Инцидент"
            rules={[{ required: true, message: 'Выберите инцидент' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={incidents.map((incident) => ({
                value: incident._id,
                label: `${incident.code} · ${incident.title} · ${incident.status}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Новый статус"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select
              options={INCIDENT_STATUSES.map((status) => ({
                value: status,
                label: status,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
