import { Controller, Get } from '@nestjs/common';
import { Client } from 'pg';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';
import {
  CHECK_NAMES,
  createErrorResult,
  createSuccessResult,
  env,
  httpGet,
  MESSAGES,
  probeTcpPort,
  type CheckResult,
} from './internal';

const apiUrl = process.env.API_URL;
const vendorApiUrl = process.env.VENDOR_API_URL;

@Controller('checks')
export class ChecksController {
  //#1: коннект к PostgreSQL
  @Get('postgres')
  async postgres(): Promise<CheckResult> {
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
      return createSuccessResult(CHECK_NAMES.POSTGRES_CONNECTION);
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.POSTGRES_CONNECTION,
        MESSAGES.postgres.unreachable(
          host,
          error.message || error.code || error,
        ),
      );
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.error(MESSAGES.postgres.closeFailed, closeError);
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
      if (pong === 'PONG') {
        return createSuccessResult(CHECK_NAMES.REDIS_PING);
      } else {
        return createErrorResult(
          CHECK_NAMES.REDIS_PING,
          MESSAGES.redis.unexpectedReply(pong),
        );
      }
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
    const response = await httpGet(`${vendorApiUrl}/data`, {
      Accept: 'text/plain',
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);

      if (data.ok) {
        return createSuccessResult(CHECK_NAMES.VENDOR_API_HEADERS);
      } else {
        return createErrorResult(
          CHECK_NAMES.VENDOR_API_HEADERS,
          MESSAGES.vendorFormat.unexpectedBody(text.slice(0, 80)),
        );
      }
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
    const response = await httpGet(`${vendorApiUrl}/profile`, {
      Authorization: `bearer ${token}`,
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
    const url = `${vendorApiUrl}/status`;
    const response = await httpGet(
      `http://127.0.0.1:3000/vendor/api/v1/status`,
    );
    if (response.status === 200)
      return createSuccessResult(CHECK_NAMES.API_ROUTING);
    return createErrorResult(
      CHECK_NAMES.API_ROUTING,
      MESSAGES.apiRouting.unexpectedStatus(response.status, url),
    );
  }

  //#6: ответ сервиса отчетов
  @Get('report')
  async report(): Promise<CheckResult> {
    const response = await httpGet(`${apiUrl}/Report`);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.status === 'ok') {
        return createSuccessResult(CHECK_NAMES.RESPONSE_FORMAT);
      } else {
        return createErrorResult(
          CHECK_NAMES.RESPONSE_FORMAT,
          MESSAGES.report.unexpectedShape(response.status, text.slice(0, 80)),
        );
      }
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
    const response = await httpGet(`${apiUrl}/cors-check`, {
      Origin: origin,
    });
    const allowedOrigin = response.headers.get('access-control-allow-origin');
    if (allowedOrigin === '*' || allowedOrigin === origin) {
      return createSuccessResult(CHECK_NAMES.CORS_HEADERS);
    }
    return createErrorResult(
      CHECK_NAMES.CORS_HEADERS,
      MESSAGES.cors.policyHeaderMissing(allowedOrigin),
    );
  }

  //#8: TCP соединение
  @Get('tcp-connect')
  async tcpConnect(): Promise<CheckResult> {
    const port: any = env('PORT');
    try {
      await probeTcpPort('127.0.0.1', port);
      return createSuccessResult(CHECK_NAMES.TCP_CONNECT);
    } catch (error: any) {
      console.error(MESSAGES.tcpConnect.crashed, error);
      return createErrorResult(
        CHECK_NAMES.TCP_CONNECT,
        MESSAGES.tcpConnect.connectFailed(port, error.message),
      );
    }
  }

  //#9: коннект к MongoDB
  @Get('mongo')
  async mongo(): Promise<CheckResult> {
    const host = env('MONGO_HOST');
    const uri = `mongodb://${env('MONGO_PASSWORD')}:${env('MONGO_USER')}@${host}:${Number(env('MONGO_PORT') ?? 27017)}/?authSource=admin`;
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2500 });
    try {
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      return createSuccessResult(CHECK_NAMES.MONGO_CONNECTION);
    } catch (error: any) {
      return createErrorResult(
        CHECK_NAMES.MONGO_CONNECTION,
        MESSAGES.mongo.unreachable(host, error.message || error.code || error),
      );
    } finally {
      try {
        await client.close();
      } catch (closeError) {
        console.error(MESSAGES.mongo.closeFailed, closeError);
      }
    }
  }

  //#10: баланс вендора
  @Get('vendor-amount')
  async vendorAmount(): Promise<CheckResult> {
    const response = await httpGet(`${vendorApiUrl}/balance`);
    const data = await response.json();
    const amount = data.balance;
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
