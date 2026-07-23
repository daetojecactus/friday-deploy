// Публичная точка входа во внутреннюю обвязку стенда.
// checks.controller собирает 10 проверок только из этих экспортов, не заглядывая
// во внутреннее устройство (lib/, checks/, config, messages).
export { env } from './lib/env';
export { httpGet } from './lib/http';
export { probeTcpPort } from './lib/net';
export { configurePlatform } from './platform';
export { HOST_URL, vendorUrl, apiUrl } from './config';
export { MESSAGES } from './checks/messages';
export type { CheckResult } from './checks/results';
export {
  CHECK_NAMES,
  createSuccessResult,
  createErrorResult,
} from './checks/results';
