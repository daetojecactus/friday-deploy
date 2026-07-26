import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurePlatform, startStand } from './internal/platform';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Префикс /api, конверт ответов, статика страницы.
  configurePlatform(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Mongo Rescue Simulator listening on port :${port}`);

  // Установка стенда (однократная) и синтетический мониторинг.
  startStand();
}
bootstrap();
