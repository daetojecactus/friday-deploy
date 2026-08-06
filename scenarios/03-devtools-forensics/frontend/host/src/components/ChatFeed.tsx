import { useEffect, useRef } from 'react';
import { Empty, Typography } from 'antd';
import type { FeedKind, FeedMessage } from '../types';
import { formatTime } from '../api';
import { STAND_COLORS } from '../theme';

const { Text } = Typography;

// По цвету видно, что происходит, даже не читая текст: разбор — зелёный, цена
// вопроса — красный, вопрос команды — приглушённый, ответ ИБ — жёлтый.
const TEXT_COLOR: Partial<Record<FeedKind, string>> = {
  found: '#9fd9bd',
  finale: '#9fd9bd',
  milestone: '#9fd9bd',
  danger: '#e39c96',
  ask: '#8a90a2',
  nudge: '#8a90a2',
  hint: '#e6c069',
  reveal: '#e6c069',
};

type Props = { messages: FeedMessage[]; typing?: string | null };

// Чат #security. Скролл живёт внутри ленты: страница не двигается.
export function ChatFeed({ messages, typing }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Доскроллено до низа — держим низ. Если ведущий отлистал вверх, не дёргаем.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && pinnedRef.current) node.scrollTop = node.scrollHeight;
  }, [messages, typing]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    pinnedRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 60;
  };

  return (
    <div ref={scrollRef} className="stand-scroll" onScroll={onScroll}>
      {messages.length === 0 ? (
        <Empty description="в чате пока тихо" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        messages.map((message) => (
          <div
            key={message.seq}
            className="stand-chat-message"
            style={{ display: 'flex', gap: 10, padding: '11px 2px' }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#262b38',
                display: 'grid',
                placeItems: 'center',
                fontSize: 15,
                flex: '0 0 auto',
              }}
            >
              {message.emoji}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, marginBottom: 3 }}>
                <Text strong>{message.author}</Text>
                <Text type="secondary">
                  {' '}
                  · {message.role} · {formatTime(message.at)}
                </Text>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: TEXT_COLOR[message.kind] ?? STAND_COLORS.text,
                }}
              >
                {message.text}
              </div>
            </div>
          </div>
        ))
      )}

      {typing ? (
        <div style={{ padding: '10px 2px 4px', fontSize: 12.5 }}>
          <Text type="secondary">
            {typing} печатает<span className="chat-dots" />
          </Text>
        </div>
      ) : null}
    </div>
  );
}
