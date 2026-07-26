import { MongoClient, type Db } from 'mongodb';

// Подключение ПРИЛОЖЕНИЯ к MongoDB.
//
// Пользователь crm_app имеет только readWrite: приложение умеет читать и писать
// данные и не умеет чинить базу (ни collMod, ни просмотра пользователей). Это
// принципиально для стенда — иначе приложение могло бы «вылечить» инцидент само.
//
// Приложение НЕ создает индексов при старте и не знает ничего о схеме: схема,
// индексы и валидаторы живут только в MongoDB. Поэтому починка через mongosh
// применяется сразу, без рестарта контейнера.

const host = process.env.MONGO_HOST ?? 'mongo';
const port = process.env.MONGO_PORT ?? '27017';
const user = process.env.MONGO_USER ?? 'crm_app';
const password = process.env.MONGO_PASSWORD ?? 'app_secret';
const authSource = process.env.MONGO_AUTH_SOURCE ?? 'crm';

export const APP_DB = process.env.MONGO_DB ?? 'crm';
export const APP_URI =
  `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
  `@${host}:${port}/?authSource=${authSource}`;

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db> {
  if (client) return client.db(APP_DB);

  if (!connecting) {
    connecting = new MongoClient(APP_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    })
      .connect()
      .then((connected) => {
        client = connected;
        return connected;
      })
      .finally(() => {
        connecting = null;
      });
  }

  return (await connecting).db(APP_DB);
}
