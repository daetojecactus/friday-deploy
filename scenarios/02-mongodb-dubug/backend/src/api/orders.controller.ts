import { Controller, Get } from '@nestjs/common';
import { getDb } from '../internal/lib/mongo';

// Витрина заказов в работе — первый экран менеджера.

export const OPEN_STATUSES = ['Open', 'Pending'];

// Индекс витрины зафиксирован через hint: заказов в работе заметно меньше, чем
// всех остальных, и без hint планировщик на росте коллекции начинает уезжать в
// полный перебор. План запроса должен быть предсказуемым.
export const SHOPFRONT_INDEX = 'orders_open';

@Controller('orders')
export class OrdersController {
  @Get()
  async list() {
    const db = await getDb();
    return db
      .collection('orders')
      .find({ status: { $in: OPEN_STATUSES } })
      .sort({ createdAt: -1 })
      .hint(SHOPFRONT_INDEX)
      .limit(50)
      .toArray();
  }
}
