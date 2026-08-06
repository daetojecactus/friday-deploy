import type { NextFunction, Request, Response } from 'express';
import { corpBrandHost } from '../internal/lib/origin';

// Обвязка контура. Разрешающий CORS — часть халатности по легенде, а заодно
// даёт настоящий preflight OPTIONS в Network. Заголовки самоидентификации
// делают «внутренность» видимой, даже когда реальный адрес — это IP машины.

export function corpEnvelope(request: Request, response: Response, next: NextFunction): void {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Requested-With');
  response.setHeader('Server', 'corp-intranet/1.4');
  response.setHeader('X-Corp-Host', corpBrandHost());
  response.setHeader('X-Corp-Zone', 'internal');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
}
