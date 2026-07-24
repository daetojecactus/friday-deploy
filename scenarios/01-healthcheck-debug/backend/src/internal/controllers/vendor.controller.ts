import { Controller, Get, Headers, HttpException, Res } from '@nestjs/common';

// Имитация ВНЕШНЕГО вендора. Живет на своем базовом пути `/vendor/api/v2`
// (вне общего префикса `/api` приложения) — как отдельный внешний сервис со
// своей схемой URL. Наша сторона ходит к нему по `VENDOR_API_URL` + метод.
//
// Это «чужой» сервис — его не чинят. Все баги, которые участники видят на
// дашборде, живут на НАШЕЙ стороне, в `checks.controller.ts`. Вендор ведет себя
// предсказуемо и отдает фиксированные ответы.

// Ключ, который принимает вендор (наша сторона шлет свой из .env).
const VENDOR_TOKEN = 'valid_token_2025';

@Controller('vendor/api/v2')
export class VendorController {
  // Отдает JSON только если явно попросить заголовком Accept: application/json,
  // иначе возвращает текст. (На стороне проверки текст падает на JSON.parse.)
  @Get('data')
  data(@Headers('accept') accept: string, @Res() res: any) {
    if (accept && accept.includes('application/json')) {
      res.type('application/json').send(JSON.stringify({ ok: true }));
      return;
    }
    res
      .type('text/plain')
      .send('vendor: set header "Accept: application/json" to receive JSON');
  }

  // Профиль аккаунта. Токен обязателен строго в схеме Bearer.
  @Get('profile')
  profile(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer '))
      throw new HttpException(
        "invalid token format: expected 'Authorization: Bearer <token>'",
        401,
      );
    if (authorization.slice('Bearer '.length) !== VENDOR_TOKEN)
      throw new HttpException('invalid token value', 401);
    return { accountId: 'acc_7f3d21b8', plan: 'enterprise', status: 'active' };
  }

  // Статус живет только под актуальной версией базового пути (v2). Пути с v1
  // (`/vendor/api/v1/status`) у вендора нет → 404.
  @Get('status')
  status() {
    return { status: 'ok', version: 'v2' };
  }

  // Баланс. Вендор ВСЕГДА отдает фиксированный ответ; поле balance — строка
  // (так спроектирован их API). Наша сторона ждет число.
  @Get('balance')
  balance(@Res() res: any) {
    res.type('application/json').send(JSON.stringify({ balance: '1000' }));
  }
}
