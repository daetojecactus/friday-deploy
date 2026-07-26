import { MongoClient, type Db } from 'mongodb';

// Служебное административное подключение стенда (root из docker-compose.yml).
//
// Через него работает только установщик: создание коллекций, валидаторов,
// индексов, демо-данных и поломок. Боевой код им не пользуется.
//
// Метаданные стенда лежат в ОТДЕЛЬНОЙ базе stand_meta, к которой у участника
// (пользователь engineer) нет доступа: `show dbs` ее не покажет и спойлера о
// том, какие инциденты активны, не будет.

const ADMIN_URI = process.env.ADMIN_MONGO_URI;

export const STAND_DB = process.env.MONGO_DB ?? 'crm';
export const META_DB = 'stand_meta';

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!ADMIN_URI) throw new Error('ADMIN_MONGO_URI is not set');
  if (!client) {
    client = await new MongoClient(ADMIN_URI, {
      serverSelectionTimeoutMS: 3000,
    }).connect();
  }
  return client;
}

export async function getAdminDb(): Promise<Db> {
  return (await getClient()).db(STAND_DB);
}

export async function getMetaDb(): Promise<Db> {
  return (await getClient()).db(META_DB);
}

// Mongo поднимается дольше бэкенда, поэтому установщик ее ждет.
export async function waitForMongo(attempts = 40, delayMs = 1000): Promise<Db> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const db = await getAdminDb();
      await db.command({ ping: 1 });
      return db;
    } catch (error) {
      lastError = error;
      client = null;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
