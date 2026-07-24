// Тексты всех сообщений стенда собраны здесь, чтобы контроллер оставался чистым:
// в checks.controller видна только логика проверок, без отвлекающих строк.
//
// Формулировки намеренно НЕ дают готовых решений: они называют класс проблемы
// (тип данных, разбор ответа, сетевой доступ, маршрут, заголовок), но не диктуют
// «что именно поправить» — участник сам восстанавливает причину по симптому,
// логам и данным. Все тексты — на английском, как реальные ошибки сервисов.

export const MESSAGES = {
  postgres: {
    unreachable: (host: string | undefined, detail: unknown) =>
      `relational store did not accept the connection (host=${host}): ${detail}`,
    closeFailed: '[postgres] failed to close relational store connection',
  },
  redis: {
    unexpectedReply: (reply: string) =>
      `unexpected handshake reply from cache node: ${reply}`,
    noResponse: (detail: string) => `cache node did not respond: ${detail}`,
    closeFailed: '[redis] failed to close cache client',
  },
  vendorFormat: {
    unexpectedBody: (body: string) =>
      `upstream response shape did not match expectations: ${body}`,
    notJson: (detail: string, body: string) =>
      `could not deserialize upstream payload (${detail}): ${body}`,
  },
  vendorAuth: {
    refused: (status: number, body: string) =>
      `upstream rejected the credentials (HTTP ${status}): ${body}`,
  },
  apiRouting: {
    unexpectedStatus: (status: number, url: string) =>
      `endpoint answered HTTP ${status} (${url})`,
  },
  report: {
    unexpectedShape: (status: number, body: string) =>
      `payload not in expected form (HTTP ${status}): ${body}`,
    deserialize: (detail: string, body: string) =>
      `could not deserialize report payload (${detail}): ${body}`,
  },
  cors: {
    policyHeaderMissing: (value: string | null) =>
      `cross-origin policy header not present in response (got: ${value ?? '<none>'})`,
  },
  tcpConnect: {
    connectFailed: (port: unknown, detail: string) =>
      `service port did not accept a connection (127.0.0.1:${port}): ${detail}`,
    typeMismatch: (type: string, value: string) =>
      `port configuration has the wrong type: expected number, received ${type} (${value})`,
    crashed: '[tcp-connect] connection attempt crashed',
  },
  mongo: {
    unreachable: (host: string | undefined, detail: unknown) =>
      `document store did not accept the connection (host=${host}): ${detail}`,
    closeFailed: '[mongo] failed to close document store connection',
  },
  vendorAmount: {
    typeMismatch: (value: string, type: string) =>
      `upstream field has the wrong type: ${value} (${type})`,
  },
} as const;
