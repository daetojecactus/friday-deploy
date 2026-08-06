import { byId, el, get } from '../api';

type Plan = { name: string; price: string; note: string };

// Таблица тарифов. Все тарифы бесплатные, но таблица нужна: без таблицы
// тарифов лендинг выглядит несерьёзно.
export async function mountPricing(): Promise<void> {
  const node = byId<HTMLDivElement>('pricing');
  if (!node) return;

  const plans = (await get<{ plans: Plan[] }>('/api/pricing'))?.plans;
  node.innerHTML = '';

  if (!plans || !plans.length) {
    node.appendChild(el('p', 'loading', 'тарифы считаются'));
    return;
  }

  for (const plan of plans) {
    const row = el('div', 'pricing-row');
    row.appendChild(el('span', undefined, plan.name));
    const price = el('b', undefined, plan.price);
    row.appendChild(price);
    row.appendChild(el('span', undefined, plan.note));
    node.appendChild(row);
  }
}
