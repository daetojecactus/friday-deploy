import { byId } from '../api';
import { CORP } from '../corp';

// Виджет состояния очереди отчётов. Сама ручка лежит уже вторую неделю, поэтому
// виджет прячется, а обработчик ошибки аккуратно пишет в консоль, что именно не
// ответило, — вместе с полным адресом.
export async function mountQueueStatus(): Promise<void> {
  const node = byId<HTMLDivElement>('queue-status');
  if (!node) return;

  const endpoint = CORP + '/report/queue-health-5a8d';

  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as { depth: number; lag: string };
    node.textContent = `очередь: ${data.depth} задач, задержка ${data.lag}`;
    node.style.display = 'block';
  } catch (error) {
    console.warn(
      '[rdb] виджет очереди отключён: витрина состояния не отвечает',
      endpoint,
      String(error),
    );
    node.style.display = 'none';
  }
}
