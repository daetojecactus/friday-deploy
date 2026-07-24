// Служебные типы и хелперы формирования результата проверки.
// Вынесено из checks.controller, чтобы основной файл содержал только логику 10
// чеков, а структура ответа и имена проверок жили в одном месте.
// Участникам сюда заглядывать не нужно.

export type CheckStatus = 'green' | 'red';

export type CheckResult = {
  name: string;
  status: CheckStatus;
  error: string | null;
};

// Имена проверок (совпадают с карточками дашборда). Держим в одном месте, чтобы
// не плодить магические строки в каждом эндпоинте.
export const CHECK_NAMES = {
  DB_CONNECTION: 'db_connection',
  REDIS_PING: 'redis_ping',
  VENDOR_API_HEADERS: 'vendor_api_headers',
  VENDOR_AUTH_SCHEME: 'vendor_auth_scheme',
  API_ROUTING: 'api_routing',
  RESPONSE_FORMAT: 'response_format',
  CORS_HEADERS: 'cors_headers',
  TCP_CONNECT: 'tcp_connect',
  MONGO_CONNECTION: 'mongo_connection',
  TYPE_MISMATCH: 'type_mismatch',
} as const;

// Зеленый результат: проверка прошла, ошибки нет.
export function createSuccessResult(name: string): CheckResult {
  return { name, status: 'green', error: null };
}

// Красный результат: проверка упала, текст ошибки наводит на причину.
export function createErrorResult(name: string, error: string): CheckResult {
  return { name, status: 'red', error };
}
