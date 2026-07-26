import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../internal/lib/mongo';

// Вход в личный кабинет и работа под сессией.
//
// Сессия — это документ в коллекции sessions. Срок жизни сессии задан на
// стороне базы, приложение его не проверяет и не продлевает.

@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() body: { customerId?: string }) {
    const customerId = String(body.customerId ?? '');
    if (!ObjectId.isValid(customerId))
      throw new BadRequestException(`некорректный customerId: ${customerId}`);

    const db = await getDb();
    const customer = await db
      .collection('customers')
      .findOne({ _id: new ObjectId(customerId) }, { projection: { firstName: 1, lastName: 1 } });
    if (!customer) throw new UnauthorizedException('клиент не найден');

    const session = {
      token: randomUUID(),
      customerId: customer._id,
      userAgent: 'crm-web',
      createdAt: new Date(),
    };
    await db.collection('sessions').insertOne(session);

    return {
      token: session.token,
      createdAt: session.createdAt,
      customer: `${customer.firstName} ${customer.lastName}`,
    };
  }

  // Любой запрос личного кабинета сначала приходит сюда.
  @Get('me')
  async me(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('нужен token');
    const db = await getDb();

    const session = await db.collection('sessions').findOne({ token });
    if (!session) throw new UnauthorizedException('session expired');

    const customer = await db
      .collection('customers')
      .findOne({ _id: session.customerId }, { projection: { firstName: 1, lastName: 1, plan: 1 } });

    return {
      token,
      loggedInAt: session.createdAt,
      sessionAgeSec: Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000),
      customer,
    };
  }
}
