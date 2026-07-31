// Готовые строки подключения к MongoDB стенда.
//
// Порт базы опубликован наружу (см. docker-compose.yml), поэтому к стенду может
// подключиться любой коллега из той же сети. Адрес хоста определяется по тому,
// как до стенда достучался браузер: открыли страницу по 192.168.1.50:8080 —
// значит и база живет на 192.168.1.50. Если нужно зафиксировать адрес вручную
// (проброс, VPN, другое имя), он задается переменной STAND_PUBLIC_HOST.

const LOOPBACK = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export type ConnectionInfo = {
  host: string;
  port: number;
  database: string;
  authSource: string;
  /** Адрес взят из запроса браузера, а не задан руками. */
  detected: boolean;
  /** true, если стенд открыт с той же машины: коллегам такую строку не передать. */
  loopback: boolean;
  user: string;
  uri: string;
  mongoshCommand: string;
  dockerCommand: string;
  appUser: string;
};

// Host заголовок приходит как "192.168.1.50:8080" или "[::1]:8080".
function hostFromHeader(header: string | undefined): string | null {
  const value = String(header ?? '').trim();
  if (!value) return null;
  if (value.startsWith('[')) return value.slice(0, value.indexOf(']') + 1) || null;
  return value.split(':')[0] || null;
}

export function buildConnectionInfo(hostHeader?: string): ConnectionInfo {
  const override = String(process.env.STAND_PUBLIC_HOST ?? '').trim();
  const detected = hostFromHeader(hostHeader);
  const host = override || detected || 'localhost';

  const port = Number(process.env.MONGO_PUBLIC_PORT ?? 27017);
  const database = process.env.MONGO_DB ?? 'crm';
  // Участник ходит в базу под engineer: readWrite + dbAdmin, этого хватает на
  // любую починку. Root-креды стенда наружу не отдаются.
  const user = 'engineer';
  const password = 'engineer_secret';

  return {
    host,
    port,
    database,
    authSource: database,
    detected: !override && Boolean(detected),
    loopback: LOOPBACK.has(host),
    user,
    uri: `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=${database}`,
    mongoshCommand: `mongosh "mongodb://${user}:${password}@${host}:${port}/${database}?authSource=${database}"`,
    dockerCommand:
      `docker compose exec mongo mongosh -u ${user} -p ${password} ` +
      `--authenticationDatabase ${database} ${database}`,
    appUser: process.env.MONGO_USER ?? 'crm_app',
  };
}
