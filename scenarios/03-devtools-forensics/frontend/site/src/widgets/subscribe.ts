import { byId } from '../api';
import { ROLE_LABELS } from '../content';

// Форма заявки. Отправляется обычным сабмитом — куда именно, написано в
// атрибуте action, а не здесь.
export function mountSubscribe(): void {
  const form = byId<HTMLFormElement>('subscribe');
  if (!form) return;

  form.addEventListener('submit', () => {
    const role = (form.elements.namedItem('role') as HTMLSelectElement | null)?.value ?? 'dev';
    const label = ROLE_LABELS[role] ?? role;
    // Аналитику пишем в dataLayer, как учили в 2014-м.
    window.dataLayer?.push({ event: 'subscribe_submit', role, label });
  });
}
