import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { getDb } from '../internal/lib/mongo';

// Внутренние инциденты CRM: список и перевод в работу.

@Controller('incidents')
export class IncidentsController {
  @Get()
  async list() {
    const db = await getDb();
    return db
      .collection('incidents')
      .find({ _synthetic: { $ne: true } })
      .sort({ openedAt: -1 })
      .limit(12)
      .toArray();
  }

  @Post(':id/status')
  async changeStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    if (!ObjectId.isValid(id)) throw new BadRequestException(`некорректный id: ${id}`);
    const status = String(body.status ?? '').trim();
    if (!status) throw new BadRequestException('нужен status');

    const db = await getDb();
    const updated = await db
      .collection('incidents')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );

    if (!updated) throw new NotFoundException(`инцидент не найден: ${id}`);
    return updated;
  }
}
