import Redis from 'ioredis';
import { env } from './env';

// Rate limiter на Redis для эндпоинта /api/limited.
// Пока Redis недоступен, лимитер «падает открытым» и пропускает все; когда Redis
// оживает — начинает считать и при низком лимите отдает 429.

let client: Redis | null = null;
let builtWithPassword: string | undefined;

// Пересоздаем клиент, если пароль поменялся (чтобы работало на лету).
function getClient(): Redis {
  const password = env('REDIS_PASSWORD');
  if (!client || builtWithPassword !== password) {
    if (client) client.disconnect();
    client = new Redis({
      host: env('REDIS_HOST'),
      port: Number(env('REDIS_PORT') ?? 6379),
      password,
      connectTimeout: 1500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    client.on('error', () => {});
    builtWithPassword = password;
  }
  return client;
}

// true = запрос разрешен, false = превышен лимит.
export async function hitRateLimit(key: string): Promise<boolean> {
  const max = Number(env('REDIS_RATE_LIMIT_MAX') ?? 100);
  const windowSec = Number(env('REDIS_RATE_LIMIT_WINDOW_SEC') ?? 10);
  try {
    const redis = getClient();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return count <= max;
  } catch {
    return true; // Redis недоступен → пропускаем
  }
}
