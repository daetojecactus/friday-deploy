// Нормализация ответа ведущего: полный URL, путь из колонки Name и строка с
// кавычками из JSON должны сходиться к одному канону — иначе ведущий спорит с
// формой ввода вместо того, чтобы вести урок.

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//;
const TRASH = /[`'"«»\s\\<>(),;]/g;

export function normalize(raw: unknown): string {
  let value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(TRASH, '')
    .replace(SCHEME, '');

  // Query и hash отрезаются вместе: `?utm=…#anchor` к утечке отношения не имеет.
  value = value.split('?')[0].split('#')[0];

  // Хост отрезается только если он действительно похож на хост: первый сегмент
  // с точкой или портом. Иначе `report/stats-a63f`, набранный без ведущего
  // слэша, потерял бы первый сегмент и перестал совпадать.
  if (!value.startsWith('/') && value.includes('/')) {
    const [head, ...rest] = value.split('/');
    if (head.includes('.') || head.includes(':')) value = rest.join('/');
  }

  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

// Похоже на голое имя хоста: точки есть, путь отсутствует. Нужно, чтобы
// отличить «назвали адрес контура целиком» от «назвали конкретную ручку».
export function looksLikeBareHost(value: string): boolean {
  return value.length > 0 && !value.includes('/') && value.includes('.');
}
