import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Input, Modal, Progress, Space, Tag, Typography } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { useHostState } from './hooks/useHostState';
import { LeakTable } from './components/LeakTable';
import { ChatFeed } from './components/ChatFeed';
import { call, formatClock } from './api';
import type { AnswerResult, LeakRow } from './types';
import { STAND_COLORS } from './theme';

const { Title, Text, Paragraph } = Typography;

// Дашборд ведущего: слева поле ввода и таблица утечек, справа прогресс и чат.
//
// Ведущий вводит то, что диктует Капитан, в единственное поле — без выбора
// категории. Система сама определяет, какая это из утечек.
export function Dashboard() {
  const { message, notification } = App.useApp();
  const { state, messages, refresh, resetCursor } = useHostState();

  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState('00:00');

  const progress = state?.progress;

  useEffect(() => {
    if (!progress) return;
    const tick = () => setClock(formatClock(progress.startedAt, progress.finishedAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [progress]);

  const submit = useCallback(async () => {
    const value = answer.trim();
    if (!value) return;

    setBusy(true);
    const result = await call<AnswerResult>('POST', '/api/answer', { value });
    setBusy(false);

    if (!result.ok || !result.data) {
      message.error(result.errorText ?? 'не удалось проверить ответ');
      return;
    }

    const outcome = result.data;

    if (outcome.kind === 'match') {
      setAnswer('');
      notification.success({
        message: `Найдено: №${outcome.leak.id} · ${outcome.leak.category}`,
        description: 'Разбор и цена вопроса — в чате. Зачитайте вслух.',
        placement: 'bottomRight',
        duration: 6,
      });
      await refresh();
      return;
    }

    if (outcome.kind === 'already') {
      message.info(`Это утечка №${outcome.id}, она уже засчитана`);
      setAnswer('');
      return;
    }

    if (outcome.kind === 'too-broad') {
      message.warning('Направление верное, но это слишком общо — нужен полный адрес');
      return;
    }

    if (outcome.kind === 'bare-host') {
      message.warning('Это хост, а не точка утечки — назовите конкретный адрес');
      return;
    }

    message.error('Не совпало');
  }, [answer, message, notification, refresh]);

  // Подсказка — это переписка, а не всплывающее окно: команда пишет в чат, что
  // встала, ИБ отвечает направлением. Ведущему остаётся зачитать.
  const giveHint = useCallback(
    async (row: LeakRow) => {
      setBusy(true);
      const result = await call<{ level: number }>('POST', '/api/hint', { id: row.id });
      setBusy(false);

      if (!result.ok) {
        message.error(result.errorText ?? 'не удалось выдать подсказку');
        return;
      }

      message.success(`Подсказка ${result.data?.level} по утечке №${row.id} ушла в чат`);
      await refresh();
    },
    [message, refresh],
  );

  const reveal = useCallback(
    async (row: LeakRow) => {
      setBusy(true);
      const result = await call<{ marker: string; cause: string }>('POST', '/api/reveal', {
        id: row.id,
      });
      setBusy(false);

      if (!result.ok || !result.data) {
        message.error(result.errorText ?? 'не удалось раскрыть ответ');
        return;
      }

      Modal.warning({
        title: `Ответ по утечке №${row.id}`,
        content: (
          <div style={{ marginTop: 12 }}>
            <Paragraph className="stand-mono" copyable>
              {result.data.marker}
            </Paragraph>
            <Paragraph type="secondary">{result.data.cause}</Paragraph>
          </div>
        ),
        okText: 'Закрыть',
      });

      await refresh();
    },
    [message, refresh],
  );

  const resetGame = useCallback(() => {
    Modal.confirm({
      title: 'Сбросить игру?',
      content: 'Прогресс, подсказки и чат будут стёрты. Это нельзя отменить.',
      okText: 'Сбросить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        const result = await call('POST', '/api/reset');
        if (!result.ok) {
          message.error(result.errorText ?? 'не удалось сбросить игру');
          return;
        }
        resetCursor();
        await refresh();
        message.success('Игра сброшена');
      },
    });
  }, [message, refresh, resetCursor]);

  const closed = (progress?.found ?? 0) + (progress?.revealed ?? 0);
  const total = progress?.total ?? 0;
  const percent = total ? Math.round((closed / total) * 100) : 0;

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
            ReportDailyBot · охота за утечками
          </Title>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Команда ищет в браузере. Ведущий вводит найденное сюда.
          </Text>
        </div>

        <Space size={10} wrap>
          <Tag color={progress?.finishedAt ? 'success' : 'processing'}>
            {progress?.finishedAt ? 'игра завершена' : 'игра идёт'}
          </Tag>
          <Text className="stand-mono" type="secondary" style={{ fontSize: 13 }}>
            {clock}
          </Text>
          <Button size="small" danger onClick={resetGame}>
            Сбросить игру
          </Button>
        </Space>
      </header>

      <div className="stand-body">
        <Card className="stand-card-fill" title="Охота за утечками" size="small">
          <Space.Compact style={{ width: '100%', marginBottom: 14 }}>
            <Input
              size="large"
              allowClear
              className="stand-mono"
              placeholder="вставьте найденный адрес"
              prefix={<AimOutlined style={{ color: STAND_COLORS.muted }} />}
              value={answer}
              disabled={busy}
              onChange={(event) => setAnswer(event.target.value)}
              onPressEnter={() => void submit()}
            />
            <Button size="large" type="primary" loading={busy} onClick={() => void submit()}>
              Проверить
            </Button>
          </Space.Compact>

          <LeakTable
            rows={state?.leaks ?? []}
            onHint={(row) => void giveHint(row)}
            onReveal={(row) => void reveal(row)}
            busy={busy}
          />
        </Card>

        <div className="stand-column">
          <Card size="small" title="Прогресс">
            <Progress
              percent={percent}
              status={progress?.finishedAt ? 'success' : 'active'}
              format={() => `${closed} / ${total}`}
            />
            <Space size={16} wrap style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                найдено: {progress?.found ?? 0}
              </Text>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                с подсказкой: {progress?.withHint ?? 0}
              </Text>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                раскрыто: {progress?.revealed ?? 0}
              </Text>
            </Space>
          </Card>

          <Card className="stand-card-fill" size="small" title="#security · чат ИБ">
            <ChatFeed messages={messages} typing={state?.typing} />
          </Card>
        </div>
      </div>
    </div>
  );
}
