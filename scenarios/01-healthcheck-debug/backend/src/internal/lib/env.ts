import * as fs from 'fs';

// Служебный доступ к переменным окружения. Значения читаются заново при каждом
// обращении: process.env + перечитывание смонтированного .env. Благодаря этому
// правки в .env применяются на лету (за пару секунд), без пересборки контейнера.
// Значения из файла имеют приоритет, чтобы живые правки побеждали.
//
// Это плумбинг стенда — участникам сюда заглядывать не нужно. В эндпоинтах
// переменные читаются как env('POSTGRES_HOST') и т.п.

const ENV_PATH = process.env.ENV_FILE ?? '/app/host/.env';

function parseEnvFile(path: string): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      values[key] = trimmed.slice(separatorIndex + 1).trim();
    }
  } catch {
    /* файла нет — используем только process.env */
  }
  return values;
}

// Все переменные, которые использует стенд (типизация в одном месте).
export type EnvKey =
  | 'PORT'
  | 'POSTGRES_HOST'
  | 'POSTGRES_PORT'
  | 'POSTGRES_USER'
  | 'POSTGRES_PASSWORD'
  | 'POSTGRES_DB'
  | 'REDIS_HOST'
  | 'REDIS_PORT'
  | 'REDIS_PASSWORD'
  | 'VENDOR_API_TOKEN'
  | 'VENDOR_API_URL'
  | 'API_URL'
  | 'REDIS_RATE_LIMIT_MAX'
  | 'REDIS_RATE_LIMIT_WINDOW_SEC';

export function env(name: EnvKey): string | undefined {
  const fromFile = parseEnvFile(ENV_PATH)[name];
  return fromFile !== undefined ? fromFile : process.env[name];
}
