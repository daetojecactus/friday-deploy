import { Controller, Get } from '@nestjs/common';

// Имитация прочих ВНЕШНИХ систем (сервис отчетов, CORS-эндпоинт).
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
}
