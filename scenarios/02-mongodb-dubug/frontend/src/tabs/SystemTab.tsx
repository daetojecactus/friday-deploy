import { useState } from 'react';
import { App, Button, Form, Input, Modal, Space, Table, Typography } from 'antd';
import { ActionBlock } from '../components/ActionBlock';
import { ResponseView } from '../components/ResponseView';
import { ConnectionPanel } from '../components/ConnectionPanel';
import { call, formatBytes, type ApiResult } from '../api';
import type { Connection, StorageReport } from '../types';

const { Text } = Typography;

const RESET_WORD = 'ПЕРЕСОБРАТЬ';

type Props = {
  connection: Connection | null;
  /** Стенд установлен: пока идет установка, пересобирать нечего. */
  ready: boolean;
  onReset: () => Promise<void>;
};

type CollectionRow = StorageReport['collections'][number];

// Системная вкладка: доступ к базе, размеры хранилища, пересборка стенда.
export function SystemTab({ connection, ready, onReset }: Props) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult<StorageReport> | null>(null);

  const [resetForm] = Form.useForm<{ confirmation: string }>();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    const response = await call<StorageReport>('GET', '/api/storage/report');
    setLoading(false);
    setResult(response);
    if (!response.ok) message.error(response.errorText ?? 'Отчет не собрался');
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await onReset();
      setResetOpen(false);
      resetForm.resetFields();
    } finally {
      setResetting(false);
    }
  };

  const report = result?.ok ? result.data : null;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ActionBlock
        title="Доступ к MongoDB"
        description="Строка для mongosh, Compass и DataGrip."
        controls={null}
      >
        <ConnectionPanel connection={connection} />
      </ActionBlock>

      <ActionBlock
        title="Отчет по хранилищу"
        description="Сколько места занимают данные и индексы."
        controls={
          <>
            <Button type="primary" size="large" loading={loading} onClick={() => void loadReport()}>
              Собрать отчет
            </Button>
            {report ? (
              <Text type="secondary">
                данные {formatBytes(report.dataSize)} · индексы {formatBytes(report.indexSize)} ·
                кэш {report.cacheSizeMb} МБ
              </Text>
            ) : null}
          </>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {report ? (
            <Table<CollectionRow>
              size="small"
              rowKey="collection"
              dataSource={report.collections}
              pagination={false}
              columns={[
                { title: 'Коллекция', dataIndex: 'collection' },
                {
                  title: 'Данные',
                  dataIndex: 'dataSize',
                  width: 120,
                  align: 'right',
                  render: (value: number) => formatBytes(value),
                },
                {
                  title: 'Индексы',
                  dataIndex: 'totalIndexSize',
                  width: 120,
                  align: 'right',
                  render: (value: number) => formatBytes(value),
                },
              ]}
            />
          ) : null}

          <ResponseView result={result} loading={loading} />
        </Space>
      </ActionBlock>

      <ActionBlock
        title="Пересборка стенда"
        description="Вернуть базу в исходное сломанное состояние. Починки будут потеряны."
        controls={
          <>
            <Button danger size="large" disabled={!ready} onClick={() => setResetOpen(true)}>
              Пересобрать стенд
            </Button>
            {!ready ? <Text type="secondary">стенд еще устанавливается</Text> : null}
          </>
        }
      />

      <Modal
        title="Пересобрать стенд?"
        open={resetOpen}
        okText="Пересобрать"
        okButtonProps={{ danger: true }}
        cancelText="Отмена"
        confirmLoading={resetting}
        onCancel={() => setResetOpen(false)}
        onOk={() => resetForm.submit()}
        width={480}
        destroyOnClose
      >
        <Form
          form={resetForm}
          layout="vertical"
          requiredMark={false}
          onFinish={() => void confirmReset()}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="confirmation"
            label={
              <span>
                База будет создана заново вместе с поломками. Введите <Text code>{RESET_WORD}</Text>
              </span>
            }
            rules={[
              {
                validator: (_, value: string) =>
                  String(value ?? '').trim().toUpperCase() === RESET_WORD
                    ? Promise.resolve()
                    : Promise.reject(new Error(`Введите ${RESET_WORD}`)),
              },
            ]}
          >
            <Input placeholder={RESET_WORD} autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
