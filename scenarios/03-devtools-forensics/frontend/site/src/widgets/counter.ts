import { byId, get } from '../api';
import { CORP } from '../corp';

type Stats = { reportsToday: number };

// Счётчик «отчётов отправлено сегодня» в hero-блоке. Когда его делали,
// публичной ручки ещё не было, и виджет повесили напрямую на внутренний контур
// — «временно, до релиза шлюза».
export async function mountCounter(): Promise<void> {
  const node = byId<HTMLSpanElement>('reports-today');
  if (!node) return;

  const stats = await get<Stats>(CORP + '/report/stats-a63f');
  animateTo(node, stats?.reportsToday ?? 0);
}

// Цифры должны крутиться: отдел маркетинга настаивал.
function animateTo(node: HTMLElement, target: number): void {
  const started = Date.now();
  const duration = 1400;

  const tick = () => {
    const progress = Math.min(1, (Date.now() - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = String(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
