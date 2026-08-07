// Адреса стенда собираются из заголовка Host, а не из хардкода: IP машины
// заранее неизвестен. Открыли стенд по http://192.168.1.50:8080 — контур сам
// стал http://192.168.1.50:7070. Тот же приём, что buildConnectionInfo в 02.

const DEFAULT_CORP_PORT = '7070';

function env(key: string): string {
  return (process.env[key] ?? '').trim();
}

// Хост контура без схемы: `10.216.214.139:7070`. Нужен там, где по формату
// ожидается host:port, а не полный URL, — заголовки и служебные поля JSON.
export function corpHost(host?: string): string {
  return corpOrigin(host).replace(/^https?:\/\//, '');
}

// Хост, по которому открыта страница: заголовок Host без порта.
function hostnameOf(host: string | undefined): string {
  const raw = env('STAND_PUBLIC_HOST') || host || 'localhost';
  // IPv6 в квадратных скобках оставляем как есть, у остального отрезаем порт.
  if (raw.startsWith('[')) return raw.slice(0, raw.indexOf(']') + 1);
  return raw.split(':')[0];
}

// Полный ориджин внутреннего контура. Пустой CORP_ORIGIN в .env — обычный
// случай: адрес собирается на лету.
export function corpOrigin(host?: string): string {
  const fixed = env('CORP_ORIGIN');
  if (fixed) return fixed.replace(/\/+$/, '');

  const port = env('CORP_PUBLIC_PORT') || DEFAULT_CORP_PORT;
  return `http://${hostnameOf(host)}:${port}`;
}

// Полный ориджин публичного лендинга: нужен корпу, чтобы вернуть браузер
// обратно последним редиректом.
export function publicOrigin(host?: string): string {
  const port = env('STAND_PUBLIC_PORT') || '8080';
  return `http://${hostnameOf(host)}:${port}`;
}
