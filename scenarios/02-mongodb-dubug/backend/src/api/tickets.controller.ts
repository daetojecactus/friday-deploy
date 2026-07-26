import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { getDb } from '../internal/lib/mongo';

// Обращения в поддержку. Форма на сайте: тема и текст обязательны,
// «дополнительная информация» — поле по желанию клиента.

@Controller('tickets')
export class TicketsController {
  @Get()
  async list() {
    const db = await getDb();
    return db
      .collection('tickets')
      .find({ _synthetic: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();
  }

  @Post()
  async create(@Body() body: { subject?: string; body?: string; additionalInfo?: string }) {
    const subject = String(body.subject ?? '').trim();
    const text = String(body.body ?? '').trim();
    if (!subject || !text) throw new BadRequestException('subject и body обязательны');

    const db = await getDb();
    const ticket: Record<string, unknown> = {
      subject,
      body: text,
      status: 'Open',
      createdAt: new Date(),
    };
    // Клиент заполняет это поле не всегда — пустое в базу не пишем.
    const additionalInfo = String(body.additionalInfo ?? '').trim();
    if (additionalInfo) ticket.additionalInfo = additionalInfo;

    const { insertedId } = await db.collection('tickets').insertOne(ticket);
    return { _id: insertedId, ...ticket };
  }
}
