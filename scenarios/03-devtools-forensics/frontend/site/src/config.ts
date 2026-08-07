import { CORP } from './corp';

// Рантайм-конфиг лендинга: виджеты берут параметры отсюда, а не таскают их
// друг другу через аргументы.
export function installConfig(): void {
  window.__CONFIG__ = {
    app: 'report-daily-bot-landing',
    version: '2026.02.14',
    apiBase: '/api',
    locale: 'ru',
    features: { popup: true, confetti: true, ticker: true },
    support: 'https://t.me/report_daily_bot',
    // Служебный блок переехал сюда из .env, «чтобы не пересобирать фронт на
    // каждое изменение адреса».
    internal: {
      host: CORP,
      metrics: CORP + '/telemetry/collect-4a2d',
      token: 'rdb_pat_9f31c7',
      queue: 'reports:daily',
    },
  };

  window.__RDB_VERSION__ = '2026.02.14';
  window.dataLayer = window.dataLayer || [];
  window.rdbWidgets = {};
}
