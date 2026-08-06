import type { NextFunction, Request, Response } from 'express';
import { corpBrandHost } from '../internal/lib/origin';

// Заголовки и cookie публичного контура — то, что «ставит балансировщик».
//
// Здесь живут сразу две утечки: служебные заголовки с именем внутренней ноды и
// путём на шлюзе, и cookie привязки сессии с админским путём внутри. Рядом —
// обычные заголовки живого сайта, чтобы «странное» нужно было отличать от
// «служебного», а не просто заметить.

let counter = 0;

export function balancerHeaders(request: Request, response: Response, next: NextFunction): void {
  counter += 1;

  response.setHeader('X-Request-Id', `rdb-${Date.now().toString(36)}-${counter}`);
  response.setHeader('X-Cache', counter % 3 === 0 ? 'HIT' : 'MISS');
  response.setHeader('X-Upstream-Node', `rdb-corp-node04.${corpBrandHost()}`);
  response.setHeader('X-Upstream-Path', '/gateway/v1/bot-8e5f');

  next();
}

// Cookie ставится на любой ответ, включая саму страницу: так она появляется в
// браузере до того, как участник вообще откроет Network.
export function stickyCookie(request: Request, response: Response, next: NextFunction): void {
  if (!String(request.headers.cookie ?? '').includes('rdb_upstream')) {
    response.setHeader('Set-Cookie', [
      `rdb_upstream=${encodeURIComponent('/admin/session-sync-c4e1')}; Path=/; SameSite=Lax`,
      'rdb_consent=granted; Path=/; SameSite=Lax',
      'rdb_ab=b; Path=/; SameSite=Lax',
    ]);
  }

  next();
}
