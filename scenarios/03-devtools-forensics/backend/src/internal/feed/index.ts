import { getDb } from '../lib/mongo';
import type { Author } from './script';

// Лента #security. Сообщения кладутся в базу сразу, но у каждого есть
// publishAt: наружу оно уезжает, когда время подошло — поэтому реплики
// приходят по очереди, а не пачкой. В MongoDB, а не в памяти, чтобы рестарт
// бэкенда посреди урока не стирал переписку.

export type FeedKind =
  | 'intro'
  | 'found'
  | 'danger'
  | 'ask'
  | 'hint'
  | 'reveal'
  | 'nudge'
  | 'milestone'
  | 'finale';

export type FeedMessage = {
  seq: number;
  at: string;
  publishAt: string;
  author: string;
  role: string;
  emoji: string;
  text: string;
  kind: FeedKind;
};

export async function post(
  author: Author,
  text: string,
  kind: FeedKind,
  delayMs = 0,
): Promise<FeedMessage> {
  const collection = (await getDb()).collection<FeedMessage>('feed');
  const last = await collection.findOne({}, { sort: { seq: -1 } });

  // Пауза отсчитывается от последнего запланированного сообщения, а не от
  // «сейчас»: иначе две реплики подряд с одинаковой задержкой пришли бы вместе.
  const now = Date.now();
  const previous = last ? new Date(last.publishAt).getTime() : now;
  const publishAt = new Date(Math.max(now, previous) + delayMs);

  const message: FeedMessage = {
    seq: (last?.seq ?? 0) + 1,
    at: new Date().toISOString(),
    publishAt: publishAt.toISOString(),
    author: author.name,
    role: author.role,
    emoji: author.emoji,
    text,
    kind,
  };

  await collection.insertOne(message);
  return message;
}

// Отдаёт только то, что уже «сказано», и обрывается на первом неопубликованном:
// так курсор не перепрыгнет через сообщение, которое вот-вот появится.
export async function readFeed(since = 0): Promise<FeedMessage[]> {
  const db = await getDb();
  const rows = await db
    .collection<FeedMessage>('feed')
    .find({ seq: { $gt: since } }, { sort: { seq: 1 }, projection: { _id: 0 } })
    .toArray();

  const now = Date.now();
  const ready: FeedMessage[] = [];
  for (const row of rows) {
    if (new Date(row.publishAt).getTime() > now) break;
    ready.push(row);
  }
  return ready;
}

// Кто «печатает» прямо сейчас: автор ближайшего неопубликованного сообщения.
// Дашборд показывает это троеточием под лентой.
export async function pendingAuthor(): Promise<string | null> {
  const db = await getDb();
  const next = await db
    .collection<FeedMessage>('feed')
    .findOne({ publishAt: { $gt: new Date().toISOString() } }, { sort: { seq: 1 } });

  return next?.author ?? null;
}

export async function feedSize(): Promise<number> {
  return (await getDb()).collection('feed').countDocuments();
}

export async function clearFeed(): Promise<void> {
  await (await getDb()).collection('feed').deleteMany({});
}
