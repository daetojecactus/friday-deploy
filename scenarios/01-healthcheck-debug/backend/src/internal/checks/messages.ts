// Тексты всех сообщений стенда собраны здесь, чтобы контроллер оставался чистым:
// в checks.controller видна только логика проверок, без отвлекающих строк.
//
// Формулировки намеренно НЕ в лоб: они называют класс проблемы (тип, разбор,
// доступ, маршрут), но не диктуют «что именно поправить» — участник должен
// сам додумать причину по симптому и данным. Все тексты — на английском, как
// реальные ошибки сервисов.

export const MESSAGES = {
  db: {
    unreachable: (host: string | undefined, detail: unknown) =>
      `data store did not accept the connection (host=${host}): ${detail}`,
    closeFailed: '[db] failed to close data store connection',
  },
  redis: {
    unexpectedReply: (reply: string) => `unexpected handshake reply: ${reply}`,
    noResponse: (detail: string) => `cache node did not respond: ${detail}`,
    closeFailed: '[redis] failed to close cache client',
  },
  vendorFormat: {
    unexpectedBody: (body: string) =>
      `response shape did not match expectations: ${body}`,
    notJson: (detail: string, body: string) =>
      `could not deserialize upstream payload (${detail}): ${body}`,
  },
  vendorAuth: {
    refused: (status: number, body: string) =>
      `upstream refused the credentials (${status}): ${body}`,
  },
  apiRouting: {
    unexpectedStatus: (status: number, url: string) =>
      `endpoint answered ${status} (${url})`,
  },
  report: {
    unexpectedShape: (status: number, body: string) =>
      `payload not in expected form (HTTP ${status}): ${body}`,
    deserialize: (detail: string, body: string) =>
      `could not deserialize report payload (${detail}): ${body}`,
  },
  cors: {
    policyHeaderMissing: (value: string | null) =>
      `cross-origin policy header not present (got: ${value ?? '<none>'})`,
  },
  probePort: {
    failed: (host: string, port: unknown, detail: string) =>
      `port probe did not complete (${host}:${port}): ${detail}`,
    crashed: '[probe-port] port probe crashed',
    typeMismatch: (type: string, value: string) =>
      `typing error: expected number, received ${type} (${value})`,
  },
  rateLimit: {
    tripped: (rejected: number, total: number) =>
      `requests were shed by an upstream guard: ${rejected}/${total} (HTTP 429)`,
  },
  vendorAmount: {
    typeMismatch: (value: string, type: string) =>
      `typing error in upstream payload: ${value} (${type})`,
  },
} as const;
