import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, map, throwError, type Observable } from 'rxjs';

// Единый конверт ответа: { ok: true, data } или { ok: false, error }.
// Контроллеры возвращают чистые данные и не обрабатывают ошибки — любая ошибка
// драйвера долетает сюда и показывается участнику как есть.

export type ApiError = {
  source: string; // метод и адрес запроса: видно, что повторить через curl
  name: string;
  code?: number | string;
  codeName?: string;
  message: string;
  errInfo?: unknown; // детали валидации схемы: какое правило не прошло
};

// Текст ошибки не переписывается и не «переводится»: участник должен видеть
// настоящее сообщение MongoDB — код, codeName, формулировку и errInfo.
export function toApiError(source: string, error: any): ApiError {
  if (error instanceof HttpException) {
    const response: any = error.getResponse();
    return {
      source,
      name: error.name,
      code: error.getStatus(),
      message: String(response?.message ?? error.message),
    };
  }
  return {
    source,
    name: error?.name ?? 'Error',
    code: typeof error?.code === 'number' ? error.code : undefined,
    codeName: error?.codeName,
    message: String(error?.message ?? error),
    errInfo: error?.errInfo,
  };
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const source = `${request.method} ${request.originalUrl.split('?')[0]}`;

    return next.handle().pipe(
      map((data) => ({ ok: true, data })),
      catchError((error) => {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const failure = { ok: false, error: toApiError(source, error) };
        console.error(`[${source}] ${failure.error.name}: ${failure.error.message}`);
        return throwError(() => new HttpException(failure, status));
      }),
    );
  }
}
