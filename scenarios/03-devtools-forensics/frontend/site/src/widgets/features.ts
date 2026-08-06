import { byId, el } from '../api';
import { FEATURES } from '../content';
import { t } from '../i18n';

// Сетка преимуществ. Первые три карточки лежат в разметке (чтобы страница
// что-то показывала до загрузки скрипта), остальные дорисовываются отсюда.
export function mountFeatures(): void {
  const node = byId<HTMLDivElement>('extra-benefits');
  if (!node) return;

  const title = byId<HTMLHeadingElement>('benefits-title');
  if (title) title.textContent = t('benefits.title');

  node.innerHTML = '';

  for (const feature of FEATURES.slice(3)) {
    const card = el('div', 'card card-extra');
    const icon = el('img');
    icon.src = `/assets/img/${feature.icon}.svg`;
    icon.width = 80;
    icon.alt = feature.title;

    card.appendChild(icon);
    card.appendChild(el('h3', undefined, feature.title));
    card.appendChild(el('p', undefined, feature.text));
    node.appendChild(card);
  }
}
