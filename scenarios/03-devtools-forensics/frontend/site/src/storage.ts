import { CORP } from './corp';

// Всё, что лендинг помнит между визитами. Ключи с префиксом rdb.

const VISITS = 'rdb.visits';
const THEME = 'rdb.theme';
const CONSENT = 'rdb.cookieConsent';
const POPUP = 'rdb.popup.shown';
const TIMER = 'rdb.promo.timer';
const AB = 'rdb.ab.variant';
const COLLAPSED = 'rdb.ui.collapsed';
const DIAG = 'rdb.diag.session';

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* приватный режим — переживём */
  }
}

export function bumpVisits(): number {
  const next = Number(read(VISITS, '0')) + 1;
  write(VISITS, String(next));
  return next;
}

export function installStorage(): void {
  if (!read(THEME, '')) write(THEME, 'acid');
  if (!read(CONSENT, '')) write(CONSENT, 'accepted-by-default');
  if (!read(POPUP, '')) write(POPUP, 'false');
  if (!read(TIMER, '')) write(TIMER, '59');
  if (!read(AB, '')) write(AB, Math.random() > 0.5 ? 'b' : 'a');
  if (!read(COLLAPSED, '')) write(COLLAPSED, '[]');

  // Диагностический слепок сессии: добавили, чтобы «посмотреть, почему рассылка
  // не доходит», и забыли убрать. Base64 тут не защита, а привычка.
  const diag = {
    api: CORP + '/report/send-recent-b51e',
    token: 'tg_bot_5f31c7',
    ttl: 86400,
  };
  write(DIAG, btoa(unescape(encodeURIComponent(JSON.stringify(diag)))));
}

export function markPopupShown(): void {
  write(POPUP, 'true');
}

export function isPopupShown(): boolean {
  return read(POPUP, 'false') === 'true';
}
