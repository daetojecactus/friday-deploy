import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';

// ЭТАЛОННОЕ состояние базы: валидаторы и индексы такими, какими их задумала
// команда разработки. Именно к этому состоянию участник должен вернуть базу.
//
// СПОЙЛЕР: файл читает только ведущий. Поломки — в breakage.ts.

export type IndexSpec = {
  collection: string;
  keys: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
};

// Валидаторы схемы. Стоят только там, где бизнес требует жесткого контракта:
// у инцидентов (конечный набор статусов) и у обращений в поддержку
// (обязательные поля формы). Клиенты, заказы, сессии и переписка живут без
// валидатора — как это обычно и бывает в проекте, доросшем до валидации не
// сразу.
export const VALIDATORS: Record<string, Record<string, unknown>> = {
  incidents: {
    $jsonSchema: {
      bsonType: 'object',
      title: 'Инцидент CRM',
      required: ['code', 'title', 'status', 'openedAt'],
      properties: {
        code: { bsonType: 'string' },
        title: { bsonType: 'string' },
        // Три состояния жизненного цикла: заведен → в работе → закрыт.
        status: { enum: ['New', 'Active', 'Resolved'] },
        owner: { bsonType: 'string' },
        openedAt: { bsonType: 'date' },
      },
    },
  },
  tickets: {
    $jsonSchema: {
      bsonType: 'object',
      title: 'Обращение в поддержку',
      // Тема и текст обязательны, additionalInfo — необязательное поле формы.
      required: ['subject', 'body', 'status', 'createdAt'],
      properties: {
        subject: { bsonType: 'string' },
        body: { bsonType: 'string' },
        additionalInfo: { bsonType: 'string' },
        status: { enum: ['Open', 'Answered', 'Closed'] },
        customerId: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
};

export const INDEXES: IndexSpec[] = [
  {
    // Сессия пользователя живет час, дальше документ удаляется сам.
    collection: 'sessions',
    keys: { createdAt: 1 },
    options: { name: 'ttl_createdAt', expireAfterSeconds: 3600 },
  },
  {
    // Витрина открытых заказов. Индекс частичный: в него попадают только
    // заказы в работе — их единицы процентов от всей коллекции.
    collection: 'orders',
    keys: { status: 1, createdAt: -1 },
    options: {
      name: 'orders_open',
      partialFilterExpression: { status: { $in: ['Open', 'Pending'] } },
    },
  },
  {
    // Почта — бизнес-ключ клиента: один клиент — один адрес.
    collection: 'customers',
    keys: { email: 1 },
    options: { name: 'uniq_email', unique: true },
  },
  {
    // Переписка по обращению: фильтр по обращению плюс сортировка по времени.
    collection: 'messages',
    keys: { ticketId: 1, createdAt: 1 },
    options: { name: 'ticket_thread' },
  },
  {
    collection: 'incidents',
    keys: { openedAt: -1 },
    options: { name: 'openedAt' },
  },
  {
    collection: 'tickets',
    keys: { createdAt: -1 },
    options: { name: 'createdAt' },
  },
];

export const COLLECTIONS = [
  'customers',
  'orders',
  'sessions',
  'incidents',
  'tickets',
  'messages',
];
