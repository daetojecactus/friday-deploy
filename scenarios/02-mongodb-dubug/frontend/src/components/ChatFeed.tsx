import { useEffect, useRef } from 'react';
import { Empty, Typography } from 'antd';
import type { FeedKind, FeedMessage } from '../types';
import { formatTime } from '../api';
import { STAND_COLORS } from '../theme';

const { Text } = Typography;

// Благодарности и финал подсвечены зеленым, эскалации — желтым, регресс —
// красным: по цвету видно, что происходит с продакшеном, даже не читая текст.
const TEXT_COLOR: Partial<Record<FeedKind, string>> = {
  thanks: '#9fd9bd',
  finale: '#9fd9bd',
  escalation: '#e6c069',
  regress: '#e39c96',
};

// Рабочий чат #incidents. Скролл живет внутри ленты: страница не двигается.
export function ChatFeed({ messages }: { messages: FeedMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Доскроллено до низа — держим низ. Если человек читает старое, не дергаем.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && pinnedRef.current) node.scrollTop = node.scrollHeight;
  }, [messages]);

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
            key={message.id}
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
    </div>
  );
}
