import { useCallback, useEffect, useRef, useState } from 'react';
import { call } from '../api';
import type { FeedMessage, HostState } from '../types';

// Опрос частый намеренно: паузы между репликами — около секунды, и при редком
// поллинге задержка опроса была бы заметнее самой паузы.
const POLL_MS = 600;
const FEED_LIMIT = 300;

// Опрос состояния игры: прогресс, таблица утечек и лента одним запросом.
// Лента приезжает инкрементально по курсору since, поэтому сообщения не
// задваиваются.
export function useHostState() {
  const [state, setState] = useState<HostState | null>(null);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const sinceRef = useRef(0);

  const refresh = useCallback(async () => {
    const result = await call<HostState>('GET', `/api/state?since=${sinceRef.current}`);
    if (!result.ok || !result.data) return;

    sinceRef.current = result.data.lastMessageSeq;
    setState(result.data);

    if (result.data.messages.length) {
      const arrived = result.data.messages;
      setMessages((previous) => [...previous, ...arrived].slice(-FEED_LIMIT));
    }
  }, []);

  // После сброса игры лента на бэкенде начинается заново.
  const resetCursor = useCallback(() => {
    sinceRef.current = 0;
    setMessages([]);
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const tick = async () => {
      await refresh();
      if (!alive) return;
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };

    void tick();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [refresh]);

  return { state, messages, refresh, resetCursor };
}
