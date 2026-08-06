import { byId, el, get } from '../api';

type Review = { author: string; role: string; text: string; rating: number };

// Отзывы клиентов (REAL!). Приходят с публичного API.
export async function mountReviews(): Promise<void> {
  const node = byId<HTMLDivElement>('reviews');
  if (!node) return;

  const payload = await get<{ items: Review[] }>('/api/reviews');
  const items = payload?.items;
  node.innerHTML = '';

  if (!items || !items.length) {
    node.appendChild(el('p', 'loading', 'отзывы временно застенчивы'));
    return;
  }

  for (const item of items) {
    const wrap = el('div', 'review-item');
    wrap.appendChild(el('p', 'review-text', `«${item.text}»`));
    wrap.appendChild(
      el('p', 'review-author', `— ${item.author}, ${item.role} ${'⭐'.repeat(item.rating)}`),
    );
    node.appendChild(wrap);
  }
}
