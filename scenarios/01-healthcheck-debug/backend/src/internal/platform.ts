import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Служебная обвязка платформы: префикс маршрутов и раздача статики дашборда.
// В дебаге не участвует (баги живут в checks.controller) и только раздувает
// main.ts, поэтому вынесена сюда, чтобы bootstrap оставался коротким.
export function configurePlatform(app: NestExpressApplication): void {
  // Приложение отвечает под префиксом /api. Внешний вендор — это «отдельный
  // сервис» со своей схемой URL (/vendor/api/v2/*), поэтому он исключен из
  // общего префикса и живет на своем базовом пути.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'vendor/api/v2/data', method: RequestMethod.GET },
      { path: 'vendor/api/v2/profile', method: RequestMethod.GET },
      { path: 'vendor/api/v2/status', method: RequestMethod.GET },
      { path: 'vendor/api/v2/balance', method: RequestMethod.GET },
    ],
  });

  // Статика дашборда (в docker сюда смонтирован ./frontend).
  app.useStaticAssets('/app/public');
}
