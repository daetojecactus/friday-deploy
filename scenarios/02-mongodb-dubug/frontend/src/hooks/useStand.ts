import { useCallback, useEffect, useRef, useState } from 'react';
import { call } from '../api';
import type { FeedMessage, Probe, ProbeStatus, StandStatus } from '../types';

const POLL_MS = 3000;
const FEED_LIMIT = 200;

type Options = {
  /** Индикатор снова позеленел: инцидент починен. */
  onRecovered?: (probe: Probe) => void;
  /** Позеленели все семь. */
  onAllGreen?: () => void;
};

// Опрос состояния стенда: индикаторы, лента чата и фаза установки одним
// запросом раз в три секунды. Лента приезжает инкрементально — по курсору
// since, поэтому сообщения не задваиваются.
export function useStand(options: Options) {
  const [status, setStatus] = useState<StandStatus | null>(null);
  const [messages, setMessages] = useState<FeedMessage[]>([]);

  const sinceRef = useRef(0);
  const statusesRef = useRef<Record<string, ProbeStatus>>({});
  const allGreenRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Вызывается после пересборки стенда: лента на бэкенде начинается заново.
  const resetFeed = useCallback(() => {
    sinceRef.current = 0;
    statusesRef.current = {};
    allGreenRef.current = false;
    setMessages([]);
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const tick = async () => {
      const result = await call<StandStatus>(
        'GET',
        `/api/stand/status?since=${sinceRef.current}`,
      );

      if (!alive) return;

      if (result.ok && result.data) {
        const data = result.data;
        sinceRef.current = data.lastMessageId;
        setStatus(data);

        if (data.messages.length) {
          setMessages((previous) => [...previous, ...data.messages].slice(-FEED_LIMIT));
        }

        // Переходы индикаторов считаем здесь же: 🔴/🟡 -> 🟢 значит, что
        // синтетическая проба снова выполнила бизнес-операцию.
        const previous = statusesRef.current;
        const known = Object.keys(previous).length > 0;
        const next: Record<string, ProbeStatus> = {};

        for (const probe of data.probes) {
          next[probe.key] = probe.status;
          const was = previous[probe.key];
          if (probe.status === 'green' && (was === 'red' || was === 'yellow')) {
            optionsRef.current.onRecovered?.(probe);
          }
        }

        statusesRef.current = next;

        const allGreen =
          data.probes.length > 0 && data.probes.every((probe) => probe.status === 'green');
        if (allGreen && !allGreenRef.current && known) optionsRef.current.onAllGreen?.();
        allGreenRef.current = allGreen;
      }

      timer = window.setTimeout(() => void tick(), POLL_MS);
    };

    void tick();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return { status, messages, resetFeed };
}
