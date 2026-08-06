import { Controller, Get, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CORP_SERVER_ROOM } from '../internal/site/assets';
import { corpBrandHost, publicOrigin } from '../internal/lib/origin';

// ВНУТРЕННИЙ КОНТУР ReportDailyBot. По легенде живёт за VPN, по факту отвечает
// всем — иначе половина утечек не была бы наблюдаемой в DevTools.
//
// Каждый адрес — конец ниточки с лендинга, и каждый обязан отвечать на GET:
// команда, нашедшая адрес, должна увидеть за ним настоящие внутренние данные.
// Именно это делает утечку осязаемой.

const STYLE = `body{background:#0b1020;color:#c8d4f0;font-family:ui-monospace,Menlo,monospace;
padding:32px;line-height:1.6}h1{color:#ff5f5f;font-size:20px}table{border-collapse:collapse;
margin-top:16px;width:100%;max-width:900px}td,th{border:1px solid #26325a;padding:6px 10px;
text-align:left;font-size:13px}th{background:#141c33;color:#8fa6dd}
.warn{background:#3a1414;border:1px solid #ff5f5f;padding:12px;max-width:900px}a{color:#6ea8ff}`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${title}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

@Controller()
export class CorpController {
  // Ирония в чистом виде: плашка «только из VPN» на странице, которая
  // открывается из любой сети.
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  root(): string {
    return page(
      'ReportDailyBot · внутренний контур',
      `<h1>ВНУТРЕННИЙ КОНТУР · ДОСТУП ТОЛЬКО ИЗ VPN</h1>
<div class="warn">Этот сегмент не предназначен для публичного доступа.
Если вы видите эту страницу из внешней сети — сообщите в отдел ИБ.</div>
<p>Сервисы: очередь рассылки, консоль владельца, витрина отчётов, шлюз GitLab,
телеметрия, статус выката, внутреннее хранилище статики.</p>`,
    );
  }

  // Фон hero-блока лендинга.
  @Get('static/serverroom-3e8a.svg')
  @Header('Content-Type', 'image/svg+xml')
  serverRoom(): string {
    return CORP_SERVER_ROOM;
  }

  // Счётчик отчётов в hero.
  @Get('report/stats-a63f')
  stats() {
    const hour = new Date().getHours();
    return {
      reportsToday: 1240 + hour * 37,
      usersActive: 128,
      queueDepth: 3,
      workers: ['reports-1', 'reports-2', 'broadcast-1'],
      gitlab: { api: 'v4', rateLimitLeft: 1893 },
    };
  }

  // Виджет состояния очереди: лежит уже вторую неделю. Именно поэтому на
  // лендинге срабатывает обработчик ошибки и печатает адрес в консоль.
  @Get('report/queue-health-5a8d')
  @HttpCode(503)
  queueHealth() {
    return {
      status: 'unavailable',
      since: '2026-02-01T09:14:00Z',
      reason: 'воркер reports-2 не отвечает, очередь не опрашивается',
    };
  }

  // Приёмник формы заявки.
  @Post('broadcast/subscribe-f2b7')
  @Header('Content-Type', 'text/html; charset=utf-8')
  subscribe(): string {
    return page(
      'Заявка принята',
      `<h1>ОЧЕРЕДЬ РАССЫЛКИ · заявка поставлена</h1>
<p>Очередь: <b>broadcast:subscribe</b>, воркер <b>broadcast-1</b>, приоритет 5.</p>
<div class="warn">Внимание: этот обработчик принимает запросы напрямую из
внешней сети. Публичные формы должны приходить через шлюз.</div>`,
    );
  }

  // Форма шлёт POST, но открыть адрес руками команда попробует первым делом —
  // и должна что-то увидеть, а не 404.
  @Get('broadcast/subscribe-f2b7')
  subscribeInfo() {
    return {
      queue: 'broadcast:subscribe',
      accepts: 'POST',
      worker: 'broadcast-1',
      priority: 5,
      pending: 12,
      rateLimit: '30/сек, требование Telegram API',
      note: 'приёмник заявок с лендинга, публичных проверок нет',
    };
  }

  // Консоль владельца бота.
  @Get('owner/console-9d4c')
  @Header('Content-Type', 'text/html; charset=utf-8')
  ownerConsole(): string {
    const rows = [
      ['m.wallace', '482013──', 'QA', 'Active', '19:00'],
      ['t.durden', '119284──', 'Developer', 'Active', '18:30'],
      ['c.starling', '773451──', 'QA', 'Vacation', '19:00'],
      ['d.cobb', '905117──', 'PM', 'Active', '20:00'],
      ['j.belfort', '336290──', 'SA', 'Blocked', '17:00'],
      ['w.wolf', '640882──', 'Admin', 'Active', '21:00'],
    ]
      .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');

    return page(
      'Консоль владельца · ReportDailyBot',
      `<h1>КОНСОЛЬ ВЛАДЕЛЬЦА · управление пользователями бота</h1>
<div class="warn">Страница доступна только владельцу. Ссылку никому не давать.</div>
<table><tr><th>GitLab</th><th>Telegram ID</th><th>Роль</th><th>Статус</th><th>Час отчёта</th></tr>
${rows}</table>
<p>Всего пользователей: 6 · активных: 4 · транспорт: webhook</p>`,
    );
  }

  // Привязка сессии — та самая, чей путь балансировщик записал в cookie.
  @Get('admin/session-sync-c4e1')
  sessionSync() {
    return {
      status: 'ok',
      sticky: true,
      node: `rdb-corp-node04.${corpBrandHost()}`,
      sessions: 42,
      note: 'синхронизация админских сессий между нодами',
    };
  }

  // Статус выката — тот, что закрыт от индексации в robots.txt.
  @Get('ops/deploy-status-b73f')
  deployStatus() {
    return {
      env: 'production',
      version: '2026.02.14',
      deployedBy: 'w.wolf',
      deployedAt: '2026-02-14T08:41:00Z',
      services: [
        { name: 'bot-api', status: 'running', replicas: 2 },
        { name: 'reports-worker', status: 'degraded', replicas: 1 },
        { name: 'broadcast-worker', status: 'running', replicas: 1 },
      ],
    };
  }

  // Ручная выгрузка отчётов из диагностического слепка в localStorage.
  @Get('report/send-recent-b51e')
  sendRecent() {
    return {
      status: 'ok',
      queued: 4,
      recipients: ['m.wallace', 't.durden', 'd.cobb', 'w.wolf'],
      template: 'standard',
      note: 'ручная рассылка за последние сутки, вызывается диагностикой',
    };
  }

  // Синхронизация команд владельца: та самая ручка из мёртвой ветки бандла.
  @Post('report/setup-owner-commands-7c19')
  setupOwnerCommands() {
    return {
      status: 'ok',
      scope: 'owner',
      registered: ['/add_user', '/update_user', '/block_user', '/list_users', '/broadcast'],
    };
  }

  @Get('report/setup-owner-commands-7c19')
  setupOwnerCommandsInfo() {
    return {
      scope: 'owner',
      accepts: 'POST',
      transport: 'webhook',
      commands: ['/add_user', '/update_user', '/block_user', '/list_users', '/broadcast'],
      lastSyncAt: '2026-02-14T08:41:30Z',
      note: 'регистрация команд владельца в Telegram Bot API',
    };
  }

  // Приёмник телеметрии из window.__CONFIG__.
  @Get('telemetry/collect-4a2d')
  telemetryInfo() {
    return {
      status: 'ok',
      sink: 'telemetry:landing',
      accepts: ['pageview', 'scroll_depth', 'subscribe_submit'],
      retentionDays: 90,
    };
  }

  @Post('telemetry/collect-4a2d')
  telemetryCollect() {
    return { status: 'accepted' };
  }

  // Пайплайн сборки — тот, чья ссылка лежит в мета-тегах лендинга.
  @Get('ci/pipeline-status-2f6a')
  pipelineStatus() {
    return {
      pipeline: 4821,
      ref: 'main',
      status: 'success',
      triggeredBy: 'w.wolf',
      finishedAt: '2026-02-14T08:39:12Z',
      stages: [
        { name: 'build', status: 'success', duration: '1m12s' },
        { name: 'test', status: 'success', duration: '3m41s' },
        { name: 'deploy:landing', status: 'success', duration: '22s' },
        { name: 'deploy:bot', status: 'failed', duration: '8s', retry: 2 },
      ],
      nextRelease: '2026-02-21',
    };
  }

  // Промежуточное звено цепочки редиректов: ссылка выглядит публичной,
  // заканчивается публичной страницей, но по дороге успевает сходить сюда.
  //
  // Единственный адрес контура, чей ответ — сам переход. Тело всё-таки отдаём:
  // браузер его не покажет, а вот `curl` без -L покажет, и станет видно, что за
  // звено это было.
  @Get('promo/mega-skidka-d38b')
  promoHop(@Req() request: Request, @Res() response: Response): void {
    response
      .status(302)
      .set('Location', `${publicOrigin(request.headers.host)}/promo.html`)
      .json({
        hop: 'promo:spring',
        campaign: 'mega-skidka-146',
        clicksToday: 3184,
        note: 'счётчик переходов кампании, стоит между лендингом и страницей акции',
      });
  }

  // Витрина отзывов, чей адрес приехал в _meta публичного ответа.
  @Get('db/v1/reviews-mirror-6b0d')
  reviewsMirror() {
    return {
      collection: 'reviews',
      rows: 412,
      moderated: 5,
      sample: [
        { author: 'Ярослав Старченков', approved: true, moderator: 'w.wolf' },
        { author: 'Мия Уоллес', approved: true, moderator: 'w.wolf' },
        { author: 'аноним', approved: false, moderator: null, reason: 'мат' },
      ],
      note: 'витрина ETL, обновляется раз в час из основной базы бота',
    };
  }

  // Внутренний шлюз, чьё имя и путь светятся в заголовках публичного API.
  @Get('gateway/v1/bot-8e5f')
  gateway() {
    return {
      node: `rdb-corp-node04.${corpBrandHost()}`,
      routes: ['/telegram/webhook', '/report/setup-commands', '/report/send-recent'],
      upstreams: { gitlab: 'v4', telegram: 'bot-api', ai: ['openrouter', 'gemini', 'groq'] },
      health: 'ok',
    };
  }

  // Выгрузка истории GitLab из комментария в карте исходников.
  @Get('dump/v1/gitlab-export-a91d')
  gitlabExport() {
    return {
      export: 'gitlab-events',
      period: '2025-01-01..2026-02-14',
      projects: 17,
      events: 48211,
      note: 'временная выгрузка, оставлена «на пару дней» год назад',
    };
  }
}
