import { MongoClient, type Db } from 'mongodb';

// Подключение к служебной базе стенда. В ней живёт только прогресс игры, лента
// чата и телеметрия корп-контура — ничего из того, что ищет команда. Порт
// наружу не публикуется, участнику база не нужна.

const URI = process.env.MONGO_URI ?? 'mongodb://mongo:27017/forensics';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(URI);
  await client.connect();
  db = client.db();
  return db;
}
