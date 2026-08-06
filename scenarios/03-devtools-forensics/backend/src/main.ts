import 'reflect-metadata';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PublicModule } from './public/public.module';
import { CorpModule } from './corp/corp.module';
import { HostModule } from './host/host.module';
import { balancerHeaders, stickyCookie } from './public/headers.middleware';
import { corpEnvelope } from './corp/corp.middleware';
import { EnvelopeInterceptor } from './internal/lib/envelope';
import { buildSite } from './internal/site/build';
import { ensureGame } from './internal/game/store';

// Один образ обслуживает три роли стенда. Роль выбирается переменной APP_ROLE в
// docker-compose: так у стенда три сервиса, но одна сборка Node.

const ROLE = process.env.APP_ROLE ?? 'public';
const PORT = Number(process.env.PORT ?? 3000);
const HOST_DIST = '/app/public-host';

async function bootstrapPublic(): Promise<void> {
  // Лендинг собирается до подъёма HTTP: страница должна быть готова к первому
  // же запросу, а сборка занимает доли секунды.
  await buildSite();

  const app = await NestFactory.create<NestExpressApplication>(PublicModule, { cors: false });
  // Cookie ставится на любой ответ, служебные заголовки — только на API: чтобы
  // найти их, нужно открыть конкретный XHR, а не первую строку в Network.
  app.use(stickyCookie);
  app.use('/api', balancerHeaders);

  await app.listen(PORT, '0.0.0.0');
  console.log(`[public] лендинг ReportDailyBot на :${PORT}`);
}

async function bootstrapCorp(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(CorpModule, { cors: false });
  app.use(corpEnvelope);

  await app.listen(PORT, '0.0.0.0');
  console.log(`[corp] внутренний контур на :${PORT}`);
}

async function bootstrapHost(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(HostModule, { cors: false });
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useStaticAssets(join(HOST_DIST, 'assets'), { prefix: '/assets' });

  await app.listen(PORT, '0.0.0.0');
  console.log(`[host] дашборд ведущего на :${PORT}`);

  // База может подниматься дольше бэкенда: страница уже открывается, игра
  // заводится, как только Mongo ответит.
  void (async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await ensureGame();
        console.log('[host] игра готова');
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    console.error('[host] не удалось подключиться к MongoDB');
  })();
}

void (async () => {
  if (ROLE === 'corp') return bootstrapCorp();
  if (ROLE === 'host') return bootstrapHost();
  return bootstrapPublic();
})();
