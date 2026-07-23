import { Controller, Get, HttpException } from '@nestjs/common';
import { hitRateLimit } from '../lib/limiter';

// ⚠️ Имитация прочих ВНЕШНИХ систем (сервис отчетов, CORS-эндпоинт, лимитер).
// Это «чужие» сервисы — их не чинят. Все баги правятся на нашей стороне.

@Controller()
export class ExternalsController {
  // Сервис отчетов: рабочий эндпоинт отдает JSON.
  @Get('report')
  report() {
    return { status: 'ok' };
  }

  // Эндпоинт для проверки CORS.
  @Get('cors-check')
  corsCheck() {
    return { ok: true };
  }

  // Эндпоинт под rate limiter'ом.
  @Get('limited')
  async limited() {
    if (!(await hitRateLimit('rl:limited')))
      throw new HttpException('rate limited', 429);
    return { ok: true };
  }
}
