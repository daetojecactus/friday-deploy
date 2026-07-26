import type { Db } from 'mongodb';
import { VALIDATORS } from './schema';

// СПОЙЛЕР. Здесь лежат все семь поломок стенда: что именно портится в MongoDB
// и как оно чинится. Читает только ведущий (см. SABOTAGE.md).
//
// Каждая поломка — это операция над самой базой, а не над кодом. Приложение о
// них ничего не знает и работает с базой как обычно.

export type Breakage = {
  id: number;
  probe: string; // индикатор на панели Production Status
  title: string; // как это называет бизнес
  cause: string; // что на самом деле сделано с базой
  fix: string; // эталонная починка в mongosh
  apply: (db: Db) => Promise<void>;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const BREAKAGES: Breakage[] = [
  {
    id: 1,
    probe: 'sessions',
    title: 'Выкидывает из системы',
    cause: 'TTL-индекс sessions.ttl_createdAt: expireAfterSeconds 60 вместо 3600',
    fix: 'db.runCommand({ collMod: "sessions", index: { name: "ttl_createdAt", expireAfterSeconds: 3600 } })',
    async apply(db) {
      await db.collection('sessions').dropIndex('ttl_createdAt');
      await db
        .collection('sessions')
        .createIndex({ createdAt: 1 }, { name: 'ttl_createdAt', expireAfterSeconds: 60 });
    },
  },
  {
    id: 2,
    probe: 'orders',
    title: 'Пропали открытые заказы',
    cause:
      'partialFilterExpression индекса orders_open перечисляет закрытые статусы: ' +
      'в индекс попадает все, кроме заказов в работе',
    fix:
      'db.orders.dropIndex("orders_open"); db.orders.createIndex({ status: 1, createdAt: -1 }, ' +
      '{ name: "orders_open", partialFilterExpression: { status: { $in: ["Open", "Pending"] } } })',
    async apply(db) {
      await db.collection('orders').dropIndex('orders_open');
      await db.collection('orders').createIndex(
        { status: 1, createdAt: -1 },
        {
          name: 'orders_open',
          partialFilterExpression: { status: { $in: ['Paid', 'Shipped', 'Closed'] } },
        },
      );
    },
  },
  {
    id: 3,
    probe: 'registration',
    title: 'Не удается зарегистрировать клиента',
    cause: 'уникальный индекс повешен на customers.firstName',
    fix: 'db.customers.dropIndex("uniq_firstName")',
    async apply(db) {
      await db
        .collection('customers')
        .createIndex({ firstName: 1 }, { name: 'uniq_firstName', unique: true });
    },
  },
  {
    id: 4,
    probe: 'profiles',
    title: '500 при открытии конкретного профиля',
    cause: 'у одного клиента поле age стало строкой',
    fix: 'db.customers.updateMany({ age: { $type: "string" } }, [{ $set: { age: { $toInt: "$age" } } }])',
    async apply(db) {
      // Четвертый клиент по порядку создания — он же четвертая кнопка в списке
      // профилей: находится не сразу, но и не приходится перебирать все.
      const victim = await db
        .collection('customers')
        .find({}, { sort: { _id: 1 }, skip: 3, limit: 1 })
        .next();
      if (!victim) return;
      await db
        .collection('customers')
        .updateOne({ _id: victim._id }, { $set: { age: String(victim.age) } });
    },
  },
  {
    id: 5,
    probe: 'storage',
    title: 'Mongo съела всю память',
    cause: 'индекс messages.messageText_1 по тексту сообщения (~16 КБ на документ)',
    fix: 'db.messages.dropIndex("messageText_1")',
    async apply(db) {
      await db
        .collection('messages')
        .createIndex({ messageText: 1 }, { name: 'messageText_1' });
    },
  },
  {
    id: 6,
    probe: 'incidents',
    title: 'Ошибка перевода инцидента в Active',
    cause: 'опечатка в enum валидатора incidents: Actve вместо Active',
    fix: 'db.runCommand({ collMod: "incidents", validator: <эталон из schema.ts> })',
    async apply(db) {
      const validator: any = clone(VALIDATORS.incidents);
      validator.$jsonSchema.properties.status.enum = ['New', 'Actve', 'Resolved'];
      await db.command({ collMod: 'incidents', validator });
    },
  },
  {
    id: 7,
    probe: 'support',
    title: 'Не создается обращение в поддержку',
    cause: 'необязательное поле additionalInfo попало в required валидатора tickets',
    fix: 'db.runCommand({ collMod: "tickets", validator: <эталон из schema.ts> })',
    async apply(db) {
      const validator: any = clone(VALIDATORS.tickets);
      validator.$jsonSchema.required = [...validator.$jsonSchema.required, 'additionalInfo'];
      await db.command({ collMod: 'tickets', validator });
    },
  },
];
