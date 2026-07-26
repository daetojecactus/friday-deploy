import { Controller, Get } from '@nestjs/common';
import { getDb } from '../internal/lib/mongo';

// Отчет по хранилищу для дежурного: сколько занимают данные и индексы.
// Числа отдаются как есть, без интерпретации.

const COLLECTIONS = ['customers', 'orders', 'sessions', 'incidents', 'tickets', 'messages'];

@Controller('storage')
export class StorageController {
  @Get('report')
  async report() {
    const db = await getDb();
    const stats = await db.command({ dbStats: 1, scale: 1 });

    const collections = await Promise.all(
      COLLECTIONS.map(async (name) => {
        const [result] = await db
          .collection(name)
          .aggregate([{ $collStats: { storageStats: {} } }])
          .toArray();
        const storage = result?.storageStats ?? {};
        return {
          collection: name,
          documents: storage.count ?? 0,
          dataSize: storage.size ?? 0,
          storageSize: storage.storageSize ?? 0,
          totalIndexSize: storage.totalIndexSize ?? 0,
          indexSizes: storage.indexSizes ?? {},
        };
      }),
    );

    return {
      database: db.databaseName,
      cacheSizeMb: Number(process.env.MONGO_CACHE_MB ?? 256),
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexSize: stats.indexSize,
      indexes: stats.indexes,
      collections,
    };
  }
}
