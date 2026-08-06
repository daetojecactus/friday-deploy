import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, map, throwError, type Observable } from 'rxjs';

// Конверт ответа для API дашборда, переехал из стенда 02.
//
// Лендинг и корп-контур им НЕ пользуются намеренно: команда изучает их в
// Network, и ответы должны выглядеть как ответы обычного сайта.

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const source = `${request.method} ${request.originalUrl.split('?')[0]}`;

    return next.handle().pipe(
      map((data) => ({ ok: true, data })),
      catchError((error) => {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const message = String(error?.message ?? error);
        console.error(`[${source}] ${error?.name ?? 'Error'}: ${message}`);
        return throwError(
          () => new HttpException({ ok: false, error: { source, message } }, status),
        );
      }),
    );
  }
}
