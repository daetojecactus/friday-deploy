import { Controller, Get } from '@nestjs/common';
import { Client } from 'pg';
import Redis from 'ioredis';
import {
  CHECK_NAMES,
  createErrorResult,
  createSuccessResult,
  env,
  httpGet,
  MESSAGES,
  probeTcpPort,
  vendorUrl,
  type CheckResult,
} from './internal';
import { apiUrl } from './internal/config';

// 10 health-проверок. Каждый эндпоинт самодостаточен: читает свою конфигурацию,
// сам ходит в зависимость и сам решает green/red. Логика одной проверки читается
// и чинится независимо от остальных.
//
// Служебная обвязка (тип результата, имена чеков, адреса, хелперы green/red,
// сокет-проба, тексты сообщений) вынесена в ./internal — здесь остается только
// логика проверок. Значения берутся из .env (см. .env.example). Правки в .env и
// в этом файле применяются на лету — пересобирать контейнер не нужно.

const RATE_LIMIT_ATTEMPTS = 5;

@Controller('checks')
export class ChecksController {
  //#1: коннект к PostgreSQL
  @Get('db')
  async db(): Promise<CheckResult> {
    const host = env('POSTGRES_HOST');
    const client = new Client({
      host,
      port: Number(env('POSTGRES_PORT') ?? 5432),
      user: env('POSTGRES_USER'),
      password: env('POSTGRES_PASSWORD'),
      database: env('POSTGRES_DB'),
      connectionTimeoutMillis: 2500,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return createSuccessResult(CHECK_NAMES.DB_CONNECTION);
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.DB_CONNECTION,
        MESSAGES.db.unreachable(host, error.message || error.code || error),
      );
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.error(MESSAGES.db.closeFailed, closeError);
      }
    }
  }

  //#2: PING к Redis
  @Get('redis')
  async redis(): Promise<CheckResult> {
    const redis = new Redis({
      host: env('REDIS_HOST'),
      port: Number(env('REDIS_PORT') ?? 6379),
      password: env('REDIS_PASSWORD'),
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    redis.on('error', () => {});
    try {
      await redis.connect();
      const pong = await redis.ping();
      return pong === 'PONG'
        ? createSuccessResult(CHECK_NAMES.REDIS_PING)
        : createErrorResult(
            CHECK_NAMES.REDIS_PING,
            MESSAGES.redis.unexpectedReply(pong),
          );
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.REDIS_PING,
        MESSAGES.redis.noResponse(error.message),
      );
    } finally {
      try {
        redis.disconnect();
      } catch (closeError) {
        console.error(MESSAGES.redis.closeFailed, closeError);
      }
    }
  }

  //#3: формат ответа вендора
  @Get('vendor-format')
  async vendorFormat(): Promise<CheckResult> {
    const response = await httpGet(vendorUrl('/data'), {
      Accept: 'application/json',
    });
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data.ok
        ? createSuccessResult(CHECK_NAMES.VENDOR_API_HEADERS)
        : createErrorResult(
            CHECK_NAMES.VENDOR_API_HEADERS,
            MESSAGES.vendorFormat.unexpectedBody(text.slice(0, 80)),
          );
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.VENDOR_API_HEADERS,
        MESSAGES.vendorFormat.notJson(error.message, text.slice(0, 80)),
      );
    }
  }

  //#4: авторизация у вендора
  @Get('vendor-auth')
  async vendorAuth(): Promise<CheckResult> {
    const token = env('VENDOR_API_TOKEN') ?? '';
    const response = await httpGet(vendorUrl('/profile'), {
      Authorization: `Bearer ${token}`,
    });
    if (response.status === 200)
      return createSuccessResult(CHECK_NAMES.VENDOR_AUTH_SCHEME);
    const body = await response.text();
    return createErrorResult(
      CHECK_NAMES.VENDOR_AUTH_SCHEME,
      MESSAGES.vendorAuth.refused(response.status, body),
    );
  }

  //#5: маршрутизация к вендору
  @Get('vendor-routing')
  async vendorStatus(): Promise<CheckResult> {
    const url = vendorUrl('/status');
    const response = await httpGet(url);
    if (response.status === 200)
      return createSuccessResult(CHECK_NAMES.API_ROUTING);
    return createErrorResult(
      CHECK_NAMES.API_ROUTING,
      MESSAGES.apiRouting.unexpectedStatus(response.status, url),
    );
  }

  //#6: разбор ответа сервиса отчетов
  @Get('report')
  async report(): Promise<CheckResult> {
    const response = await httpGet(apiUrl('/report'));
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data.status === 'ok'
        ? createSuccessResult(CHECK_NAMES.RESPONSE_FORMAT)
        : createErrorResult(
            CHECK_NAMES.RESPONSE_FORMAT,
            MESSAGES.report.unexpectedShape(response.status, text.slice(0, 80)),
          );
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.RESPONSE_FORMAT,
        MESSAGES.report.deserialize(error.message, text.slice(0, 80)),
      );
    }
  }

  //#7: CORS-заголовки
  @Get('cors')
  async cors(): Promise<CheckResult> {
    const origin = 'http://localhost:8080';
    const response = await httpGet(apiUrl('/cors-check'), {
      Origin: origin,
    });
    const allowedOrigin = response.headers.get('access-control-allow-origin');
    if (allowedOrigin === '*' || allowedOrigin === origin)
      return createSuccessResult(CHECK_NAMES.CORS_HEADERS);
    return createErrorResult(
      CHECK_NAMES.CORS_HEADERS,
      MESSAGES.cors.policyHeaderMissing(allowedOrigin),
    );
  }

  //#8: TCP-проба порта зависимости
  @Get('probe-port')
  async probePort(): Promise<CheckResult> {
    const host = env('REDIS_HOST') ?? 'redis';
    const port = Number(env('REDIS_PORT') ?? 6379);
    try {
      await probeTcpPort(host, port);
      return createSuccessResult(CHECK_NAMES.CONFIG_PARSING);
    } catch (error: any) {
      console.error(MESSAGES.probePort.crashed, error);
      return createErrorResult(
        CHECK_NAMES.CONFIG_PARSING,
        MESSAGES.probePort.failed(host, port, error.message),
      );
    }
  }

  //#9: rate limiter
  @Get('rate-limit')
  async rateLimit(): Promise<CheckResult> {
    let rejected = 0;
    for (let attempt = 0; attempt < RATE_LIMIT_ATTEMPTS; attempt++) {
      const response = await httpGet(apiUrl('/limited'));
      if (response.status === 429) rejected++;
    }
    return rejected === 0
      ? createSuccessResult(CHECK_NAMES.RATE_LIMITER)
      : createErrorResult(
          CHECK_NAMES.RATE_LIMITER,
          MESSAGES.rateLimit.tripped(rejected, RATE_LIMIT_ATTEMPTS),
        );
  }

  //#10: баланс вендора
  @Get('vendor-amount')
  async vendorAmount(): Promise<CheckResult> {
    const response = await httpGet(vendorUrl('/balance'));
    const data = await response.json();
    const amount = Number(data.balance);
    if (!Number.isFinite(amount))
      return createErrorResult(
        CHECK_NAMES.TYPE_MISMATCH,
        MESSAGES.vendorAmount.typeMismatch(
          JSON.stringify(data.balance),
          typeof data.balance,
        ),
      );
    return createSuccessResult(CHECK_NAMES.TYPE_MISMATCH);
  }
}
