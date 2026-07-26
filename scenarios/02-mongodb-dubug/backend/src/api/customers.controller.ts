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

// Клиенты CRM: список, регистрация, карточка профиля.

@Controller('customers')
export class CustomersController {
  // Список для боковой панели менеджера.
  @Get()
  async list() {
    const db = await getDb();
    return db
      .collection('customers')
      .find(
        { _synthetic: { $ne: true } },
        { projection: { firstName: 1, lastName: 1, email: 1, city: 1, plan: 1 } },
      )
      .sort({ _id: 1 })
      .limit(24)
      .toArray();
  }

  // Регистрация нового клиента.
  @Post()
  async create(
    @Body() body: { firstName?: string; lastName?: string; email?: string; age?: number },
  ) {
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!firstName || !lastName || !email)
      throw new BadRequestException('firstName, lastName и email обязательны');

    const db = await getDb();
    const customer = {
      firstName,
      lastName,
      email,
      age: Number(body.age) || 30,
      city: 'Москва',
      plan: 'basic',
      createdAt: new Date(),
    };
    const { insertedId } = await db.collection('customers').insertOne(customer);
    return { _id: insertedId, ...customer };
  }

  // Карточка клиента. Считается агрегацией на стороне базы: возраст, год
  // рождения и суммарные покупки одним запросом.
  @Get(':id')
  async profile(@Param('id') id: string) {
    if (!ObjectId.isValid(id)) throw new BadRequestException(`некорректный id: ${id}`);
    const db = await getDb();

    const [profile] = await db
      .collection('customers')
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'customerId',
            as: 'orders',
          },
        },
        {
          $addFields: {
            birthYear: { $subtract: [new Date().getFullYear(), '$age'] },
            ordersCount: { $size: '$orders' },
            ordersTotal: { $sum: '$orders.total' },
          },
        },
        { $project: { orders: 0 } },
      ])
      .toArray();

    if (!profile) throw new NotFoundException(`клиент не найден: ${id}`);
    return profile;
  }
}
