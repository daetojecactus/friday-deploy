import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurePlatform } from './internal';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  //чувствительность к регистру
  app.set('case sensitive routing', true);

  //CORS для фронтенда
  app.enableCors();

  //cлужебная обвязка платформы
  configurePlatform(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`Server listening on port :${port}`);
}
bootstrap();
