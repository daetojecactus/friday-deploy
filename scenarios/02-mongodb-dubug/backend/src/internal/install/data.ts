import { ObjectId } from 'mongodb';

// Детерминированные демо-данные CRM. Один и тот же сид — одна и та же база,
// поэтому у всех команд стенд выглядит одинаково.
//
// СПОЙЛЕР: файл читает только ведущий.

// --- маленький ГПСЧ с фиксированным зерном ------------------------------------

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = makeRandom(20260726);
const pick = <T>(items: T[]): T => items[Math.floor(rnd() * items.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000 - int(0, 86_400_000));

// --- клиенты ------------------------------------------------------------------

// Имена намеренно РАЗНЫЕ у всех шестидесяти клиентов: иначе уникальный индекс
// по имени просто не собрался бы на существующих данных.
export const FIRST_NAMES = [
  'Анна', 'Пётр', 'Ольга', 'Сергей', 'Мария', 'Дмитрий', 'Елена', 'Иван',
  'Татьяна', 'Алексей', 'Наталья', 'Андрей', 'Ирина', 'Михаил', 'Светлана',
  'Николай', 'Юлия', 'Владимир', 'Екатерина', 'Артём', 'Людмила', 'Евгений',
  'Оксана', 'Роман', 'Марина', 'Виктор', 'Галина', 'Павел', 'Полина', 'Денис',
  'Вера', 'Кирилл', 'Надежда', 'Максим', 'Дарья', 'Антон', 'Алла', 'Григорий',
  'Валентина', 'Егор', 'Софья', 'Борис', 'Лидия', 'Тимур', 'Ксения', 'Олег',
  'Раиса', 'Степан', 'Милана', 'Валерий', 'Инна', 'Фёдор', 'Зоя', 'Арсений',
  'Тамара', 'Леонид', 'Кристина', 'Глеб', 'Нина', 'Руслан',
];

const LAST_NAMES = [
  'Ковалёв', 'Ершов', 'Мельников', 'Зайцев', 'Соловьёв', 'Панов',
  'Кузнецов', 'Лебедев', 'Гордеев', 'Тихонов', 'Белов', 'Носов',
  'Дроздов', 'Савельев', 'Крылов', 'Юдин', 'Фомин', 'Царёв',
  'Шестаков', 'Литвинов',
];

// В списке имен нет мужских на «-а/-я», поэтому правило простое и надежное.
const isFeminine = (firstName: string) => /[ая]$/.test(firstName);

export function lastNameFor(firstName: string, index: number): string {
  const base = LAST_NAMES[index % LAST_NAMES.length];
  return isFeminine(firstName) ? `${base}а` : base;
}

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург',
  'Нижний Новгород', 'Самара', 'Краснодар', 'Воронеж', 'Пермь',
];

export type Customer = {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  city: string;
  plan: string;
  createdAt: Date;
};

export function buildCustomers(): Customer[] {
  return FIRST_NAMES.map((firstName, index) => ({
    _id: new ObjectId(),
    firstName,
    lastName: lastNameFor(firstName, index),
    email: `client${String(index + 1).padStart(2, '0')}@example.com`,
    age: int(21, 64),
    city: pick(CITIES),
    plan: pick(['basic', 'basic', 'pro', 'enterprise']),
    createdAt: daysAgo(int(30, 900)),
  }));
}

// --- заказы -------------------------------------------------------------------

// Заказов «в работе» — примерно каждый восьмой: витрина должна быть заметно
// меньше коллекции, иначе частичный индекс теряет смысл.
const ORDER_STATUSES = [
  'Open', 'Pending', 'Paid', 'Paid', 'Paid', 'Shipped', 'Shipped',
  'Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed',
];

export function buildOrders(customers: Customer[]) {
  return Array.from({ length: 800 }, (_, index) => {
    const customer = pick(customers);
    return {
      orderNo: `ORD-2026-${String(1000 + index)}`,
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      status: pick(ORDER_STATUSES),
      total: int(1200, 480_000),
      currency: 'RUB',
      createdAt: daysAgo(int(0, 90)),
    };
  });
}

// --- инциденты ----------------------------------------------------------------

const INCIDENT_TITLES = [
  'Не проходит оплата картой Mir',
  'Задваиваются уведомления клиентам',
  'Отчет по продажам грузится больше минуты',
  'Не приходит письмо со счетом',
  'Экспорт в 1С падает на больших выгрузках',
  'Тормозит поиск по клиентам',
  'Слетает фильтр в списке заказов',
  'Не сохраняется комментарий менеджера',
  'Дублируются строки в выгрузке',
  'Ошибка при печати накладной',
];

const OWNERS = ['ivanov', 'petrova', 'sidorov', 'kuznetsova', 'orlov'];

export function buildIncidents() {
  return Array.from({ length: 40 }, (_, index) => ({
    code: `INC-${String(1200 + index)}`,
    title: pick(INCIDENT_TITLES),
    // Ни одного инцидента в статусе Active: перевести в работу — это как раз
    // то действие, которое участник проверяет кнопкой.
    status: rnd() < 0.55 ? 'New' : 'Resolved',
    owner: pick(OWNERS),
    openedAt: daysAgo(int(0, 30)),
  }));
}

// --- обращения в поддержку ----------------------------------------------------

const TICKET_SUBJECTS = [
  'Не приходит счет на почту',
  'Хочу поменять тариф',
  'Верните деньги за отмененный заказ',
  'Не могу войти в личный кабинет',
  'Ошибка в реквизитах компании',
  'Долго везут заказ',
  'Нужен акт сверки',
  'Как подключить второго менеджера',
];

const TICKET_BODIES = [
  'Уже третий день жду документы, клиент нервничает.',
  'Подскажите, что делать дальше — сроки горят.',
  'Пробовал сам, не получилось. Прошу помочь.',
  'Приложил скриншот, там видно ошибку.',
  'Раньше все работало, сломалось после обновления.',
];

export type Ticket = {
  _id: ObjectId;
  subject: string;
  body: string;
  additionalInfo?: string;
  status: string;
  customerId: ObjectId;
  createdAt: Date;
};

export function buildTickets(customers: Customer[]): Ticket[] {
  return Array.from({ length: 300 }, (): Ticket => {
    const customer = pick(customers);
    const ticket: Ticket = {
      _id: new ObjectId(),
      subject: pick(TICKET_SUBJECTS),
      body: pick(TICKET_BODIES),
      status: pick(['Open', 'Open', 'Answered', 'Closed']),
      customerId: customer._id,
      createdAt: daysAgo(int(0, 60)),
    };
    // Поле необязательное: заполнено меньше чем у половины обращений.
    if (rnd() < 0.4) ticket.additionalInfo = `Номер договора ${int(100000, 999999)}`;
    return ticket;
  });
}

// --- переписка ----------------------------------------------------------------

const CORPUS = [
  'Добрый день, уточняю статус по обращению, клиент ждет ответа со вчерашнего дня.',
  'Передал вопрос в отдел логистики, они обещали посмотреть в течение дня.',
  'Приложил выгрузку из личного кабинета, там видно все позиции заказа.',
  'По документам все закрыто, но клиент утверждает, что письмо не приходило.',
  'Проверил реквизиты, расхождений нет, отправляю повторно на указанную почту.',
  'Клиент просит перезвонить после обеда, удобное время с четырнадцати часов.',
  'Согласовал с руководителем, можем сделать исключение и продлить срок оплаты.',
  'Отметил обращение как срочное, вернусь с ответом сразу после проверки.',
];

// Одно сообщение — примерно 8 000 символов кириллицы, то есть около 16 КБ в
// UTF-8. Много «жирных» документов на небольшом количестве строк: так стенд
// остается легким, а размер индекса по тексту — внушительным.
const TARGET_CHARS = 8000;

export function buildMessage(ticketId: ObjectId, index: number) {
  const parts: string[] = [`Обращение №${index + 1}.`];
  let length = parts[0].length;
  let cursor = index;
  while (length < TARGET_CHARS) {
    cursor += 1;
    const line = `${CORPUS[cursor % CORPUS.length]} (реплика ${cursor})`;
    parts.push(line);
    length += line.length + 1;
  }
  return {
    ticketId,
    author: index % 2 === 0 ? 'client' : 'support',
    channel: pick(['email', 'chat', 'phone']),
    messageText: parts.join(' '),
    createdAt: daysAgo(int(0, 60)),
  };
}

export const MESSAGES_TOTAL = 3000;
export const MESSAGES_BATCH = 150;
