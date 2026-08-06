import { Controller, Get, Header, NotFoundException, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getBundle } from '../internal/site/build';
import { PUBLIC_ASSETS } from '../internal/site/assets';
import { corpBrandHost, corpOrigin } from '../internal/lib/origin';

// Отдача лендинга. Плейсхолдеры подставляются здесь, а не при сборке: адрес
// внутреннего контура зависит от того, по какому Host открыли страницу.
// Поэтому статика отдаётся с no-store — иначе первый же участник закешировал бы
// чужой адрес.

function substitute(source: string, request: Request): string {
  return source
    .split('{{CORP_ORIGIN}}')
    .join(corpOrigin(request.headers.host))
    .split('{{CORP_BRAND_HOST}}')
    .join(corpBrandHost());
}

@Controller()
export class SiteController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  index(@Req() request: Request): string {
    return substitute(getBundle().html, request);
  }

  @Get('promo.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  promo(@Req() request: Request): string {
    return substitute(getBundle().promoHtml, request);
  }

  @Get('assets/styles.css')
  @Header('Content-Type', 'text/css; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  styles(@Req() request: Request): string {
    return substitute(getBundle().css, request);
  }

  @Get('assets/app.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  script(@Req() request: Request): string {
    return substitute(getBundle().js, request);
  }

  // Старый бандл и его карта исходников. Карта есть только у него: будь она у
  // app.js, она развернула бы и admin.ts — и хардкод в бандле перестал бы быть
  // отдельным упражнением.
  @Get('assets/legacy.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  legacyScript(@Req() request: Request): string {
    return substitute(getBundle().legacyJs, request);
  }

  @Get('assets/legacy.js.map')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  legacyMap(@Req() request: Request): string {
    return substitute(getBundle().legacyMap, request);
  }

  @Get('assets/img/:name')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'no-store')
  image(@Param('name') name: string): string {
    const svg = PUBLIC_ASSETS[name];
    if (!svg) throw new NotFoundException();
    return svg;
  }

  // Публичный список того, что мы считаем непубличным. Поисковик его послушает,
  // человек прочитает.
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots(): string {
    return [
      'User-agent: *',
      'Allow: /',
      '',
      '# служебные адреса, от индексации закрыты',
      'Disallow: /ops/deploy-status-b73f',
      'Disallow: /assets/',
      'Disallow: /docs/',
      '',
      'Sitemap: /sitemap.xml',
      '',
    ].join('\n');
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  sitemap(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>/</loc><priority>1.0</priority></url>
  <url><loc>/promo.html</loc><priority>0.8</priority></url>
  <url><loc>/docs/faq.html</loc><priority>0.5</priority></url>
</urlset>`;
  }

  // Вторая, безобидная ссылка из скрытой панели владельца: без неё блок
  // выглядел бы как одна подозрительная строка, а не как список ссылок.
  @Get('docs/faq.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  faq(): string {
    return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>FAQ — ReportDailyBot</title>
<link rel="stylesheet" href="/assets/styles.css"></head>
<body><div class="header-marquee"><marquee>ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ</marquee></div>
<center class="reviews-block"><div class="reviews">
<p class="review-text">Это правда бесплатно?</p><p class="review-author">Да. Это pet-project.</p>
<p class="review-text">А если я ничего не делал?</p><p class="review-author">Бот вежливо сообщит об отсутствии активности.</p>
<p class="review-text">Это corporate решение?</p><p class="review-author">Это решение. Corporate — это про другое.</p>
</div><br><a class="cta-button" href="/">НАЗАД</a></center></body></html>`;
  }

  // Кнопка «ХОЧУ СЕЙЧАС»: публичный адрес, но по дороге к странице акции
  // браузер успевает сходить во внутренний контур.
  @Get('api/promo/mega')
  promoRedirect(@Req() request: Request, @Res() response: Response): void {
    response.redirect(302, `${corpOrigin(request.headers.host)}/promo/mega-skidka-d38b`);
  }
}
