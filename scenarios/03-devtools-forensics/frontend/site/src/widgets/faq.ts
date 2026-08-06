import { byId, el } from '../api';
import { FAQ } from '../content';
import { t } from '../i18n';

// Блок «частые вопросы». Раскрывается по клику: сворачиваемые ответы отдел
// маркетинга назвал «вовлечением».
export function mountFaq(): void {
  const node = byId<HTMLDivElement>('faq');
  if (!node) return;

  const title = byId<HTMLHeadingElement>('faq-title');
  if (title) title.textContent = t('faq.title');

  node.innerHTML = '';

  FAQ.forEach((item, index) => {
    const wrap = el('div', 'faq-item');
    const question = el('button', 'faq-question', `▸ ${item.q}`);
    const answer = el('p', 'faq-answer', item.a);
    answer.style.display = index === 0 ? 'block' : 'none';

    question.addEventListener('click', () => {
      const open = answer.style.display === 'block';
      answer.style.display = open ? 'none' : 'block';
      question.textContent = `${open ? '▸' : '▾'} ${item.q}`;
      window.dataLayer?.push({ event: 'faq_toggle', question: item.q, open: !open });
    });

    wrap.appendChild(question);
    wrap.appendChild(answer);
    node.appendChild(wrap);
  });
}
