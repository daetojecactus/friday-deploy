import { byId, el } from '../api';
import { TEMPLATE_LABELS, pick } from '../content';
import { t } from '../i18n';

// «Так выглядит твой отчёт» — демонстрация трёх шаблонов бота прямо на
// лендинге. Данные выдуманные, но структура настоящая: Standard группирует по
// проектам, QA — по типу активности, SA оборачивает строки в ссылки.

type Entry = { project: string; kind: string; text: string; ref: string };

const ENTRIES: Entry[] = [
  { project: 'billing-api', kind: 'Разработка', text: 'реализовал перерасчёт скидок', ref: 'BIL-412' },
  { project: 'billing-api', kind: 'Ревью', text: 'проверил миграцию тарифов', ref: 'MR!318' },
  { project: 'web-portal', kind: 'Разработка', text: 'починил вёрстку личного кабинета', ref: 'WEB-77' },
  { project: 'web-portal', kind: 'Баги', text: 'воспроизвёл падение на Safari', ref: 'WEB-81' },
  { project: 'reports-core', kind: 'Тесты', text: 'закрыл автотестами сборку отчёта', ref: 'REP-19' },
  { project: 'reports-core', kind: 'Разработка', text: 'ускорил выгрузку в три раза', ref: 'REP-24' },
  { project: 'infra', kind: 'Ревью', text: 'согласовал пайплайн деплоя', ref: 'MR!322' },
];

function renderStandard(entries: Entry[]): string {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.project) ?? [];
    list.push(entry);
    groups.set(entry.project, list);
  }

  const lines: string[] = ['Отчёт за сегодня', ''];
  for (const [project, list] of groups) {
    lines.push(`📁 ${project}`);
    for (const entry of list) lines.push(`   • ${entry.text}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderQa(entries: Entry[]): string {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.kind) ?? [];
    list.push(entry);
    groups.set(entry.kind, list);
  }

  const lines: string[] = ['Отчёт за сегодня (QA)', ''];
  for (const [kind, list] of groups) {
    lines.push(`🔸 ${kind} (${list.length})`);
    for (const entry of list) lines.push(`   • [${entry.ref}] ${entry.text}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderSa(entries: Entry[]): string {
  const lines: string[] = ['Отчёт за сегодня (SA)', ''];
  for (const entry of entries) {
    lines.push(`   • ${entry.text} → ${entry.ref}`);
  }
  return lines.join('\n');
}

const RENDERERS: Record<string, (entries: Entry[]) => string> = {
  standard: renderStandard,
  qa: renderQa,
  sa: renderSa,
};

export function mountDemo(): void {
  const node = byId<HTMLDivElement>('demo');
  if (!node) return;

  const title = byId<HTMLHeadingElement>('demo-title');
  if (title) title.textContent = t('demo.title');

  node.innerHTML = '';

  const controls = el('div', 'demo-controls');
  const label = el('span', undefined, t('demo.template'));
  const select = el('select', 'demo-select');

  for (const [value, text] of Object.entries(TEMPLATE_LABELS)) {
    const option = el('option', undefined, text);
    option.value = value;
    select.appendChild(option);
  }

  const output = el('pre', 'demo-output');
  const shuffle = el('button', 'demo-shuffle', t('demo.regenerate'));

  let seed = 0;

  const draw = () => {
    const render = RENDERERS[select.value] ?? renderStandard;
    // «Перегенерация» — это просто другой срез тех же данных: на лендинге
    // важна не правда, а движение.
    const size = 4 + (Math.abs(seed) % 3);
    const entries = Array.from({ length: size }, (_, index) => pick(ENTRIES, seed + index));
    output.textContent = render(entries);
  };

  select.addEventListener('change', () => {
    window.dataLayer?.push({ event: 'demo_template', template: select.value });
    draw();
  });

  shuffle.addEventListener('click', () => {
    seed += 1;
    draw();
  });

  controls.appendChild(label);
  controls.appendChild(select);
  controls.appendChild(shuffle);
  node.appendChild(controls);
  node.appendChild(output);

  draw();
}
