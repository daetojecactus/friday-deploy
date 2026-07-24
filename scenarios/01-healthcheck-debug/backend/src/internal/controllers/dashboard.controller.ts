import { Controller, Get } from '@nestjs/common';
import { httpGet } from '../lib/http';

// Служебный эндпоинт дашборда: собирает все 10 проверок одним ответом.
// Участникам этот агрегатор не нужен — они смотрят на карточки и, при желании,
// дергают конкретные /api/checks/<name> напрямую через curl.

// Базовый адрес нашего API (тот же, что используют проверки) — берется из .env.
const apiUrl = process.env.API_URL;

// Порядок = порядок карточек на дашборде.
const CHECK_SLUGS = [
  'postgres',
  'redis',
  'vendor-format',
  'vendor-auth',
  'vendor-routing',
  'report',
  'cors',
  'tcp-connect',
  'mongo',
  'vendor-amount',
];

@Controller()
export class DashboardController {
  @Get('checks')
  async checks() {
    const base = `${apiUrl}/checks`;
    return Promise.all(
      CHECK_SLUGS.map(async (slug) => {
        try {
          const response = await httpGet(`${base}/${slug}`, {}, 8000);
          return await response.json();
        } catch (error: any) {
          return { name: slug, status: 'red', error: `check failed: ${error.message}` };
        }
      }),
    );
  }
}
