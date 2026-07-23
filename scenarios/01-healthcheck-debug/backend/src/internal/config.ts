import { env } from './lib/env';

// Служебные адреса стенда.
// APP_PORT — порт, на котором слушает бэкенд.
// HOST_URL — базовый адрес самого приложения (по нему проверки ходят к своим же
// эндпоинтам-имитациям: сервису отчетов, CORS-эндпоинту, лимитеру).
export const APP_PORT = Number(process.env.PORT ?? 3000);
export const HOST_URL = `http://127.0.0.1:${APP_PORT}`;

// Базовый адрес внешнего вендора берется из .env целиком (VENDOR_API_URL) и
// используется как есть — метод просто дописывается справа:
//   vendorUrl('/status') → http://127.0.0.1:3000/vendor/api/v2/status
// Читается на лету, чтобы правки .env применялись без пересборки.
export function vendorUrl(path: string): string {
  const base = env('VENDOR_API_URL') ?? '';
  return `${base}${path}`;
}

// Базовый адрес нашего собственного API берется из .env целиком (API_URL) и
// используется как есть — метод просто дописывается справа:
//   apiUrl('/report') → http://127.0.0.1:3000/api/report
// По этим эндпоинтам проверки ходят к своим же имитациям (сервису отчетов,
// CORS-эндпоинту, лимитеру). Читается на лету, чтобы правки .env применялись
// без пересборки.
export function apiUrl(path: string): string {
  const base = env('API_URL') ?? '';
  return `${base}${path}`;
}
