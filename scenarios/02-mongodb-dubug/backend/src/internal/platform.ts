import type { NestExpressApplication } from '@nestjs/platform-express';
import { EnvelopeInterceptor } from './lib/envelope';
import { installIfNeeded } from './install';
import { startMonitor } from './probes';

// Служебная обвязка: префикс /api, единый конверт ответов, статика страницы и
// фоновые задачи стенда.

export function configurePlatform(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useStaticAssets('/app/public');
}

// Установка идет уже после подъема HTTP: страница открывается сразу и
// показывает прогресс. Монитор ждет готовности стенда сам.
export function startStand(): void {
  void (async () => {
    await installIfNeeded();
    startMonitor();
  })();
}
