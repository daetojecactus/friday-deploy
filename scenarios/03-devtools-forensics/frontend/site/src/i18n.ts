// Локализация лендинга. Бот двуязычный, лендинг тоже: язык берётся из
// настроек браузера, переключателя на странице нет — маркетинг решил, что
// выбор отвлекает от покупки.

type Dict = Record<string, string>;

const RU: Dict = {
  'hero.tagline': 'ТЫ ВСЕ ЕЩЕ ПИШЕШЬ ОТЧЕТЫ РУКАМИ???',
  'hero.subtagline': 'ТЫ ЧТО, ИЗ КАМЕННОГО ВЕКА???',
  'hero.cta': '>>> ХОЧУ СЕЙЧАС <<<',
  'hero.counter': 'ОТЧЕТОВ ОТПРАВЛЕНО СЕГОДНЯ:',
  'price.discount': 'СКИДКА -146%',
  'price.free': 'БЕСПЛАТНО!!!*',
  'price.today': '(только сегодня!)',
  'benefits.title': 'ПОЧЕМУ ИМЕННО МЫ',
  'reviews.title': 'ОТЗЫВЫ КЛИЕНТОВ (REAL!):',
  'reviews.loading': 'загружаем настоящие отзывы настоящих людей…',
  'reviews.empty': 'отзывы временно застенчивы',
  'pricing.title': 'ТАРИФЫ (ВСЕ БЕСПЛАТНЫЕ!!!):',
  'pricing.loading': 'считаем твою выгоду…',
  'faq.title': 'ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ:',
  'demo.title': 'ТАК ВЫГЛЯДИТ ТВОЙ ОТЧЕТ:',
  'demo.template': 'Шаблон отчёта:',
  'demo.regenerate': 'ПОКАЗАТЬ ЕЩЕ РАЗ',
  'subscribe.title': 'ОСТАВЬ ЗАЯВКУ НА БЕСПЛАТНЫЙ БОТ!!!',
  'subscribe.button': 'ЗАБРАТЬ БОТА!!!',
  'popup.hurry': 'Твоя персональная скидка сгорит через:',
  'popup.gift': 'Не уходи без подарка!',
  'footer.disclaimer': '*Предложение действует только в твоей голове.',
  'partners.title': 'НАМ ДОВЕРЯЮТ:',
};

const EN: Dict = {
  'hero.tagline': 'ARE YOU STILL WRITING REPORTS BY HAND???',
  'hero.subtagline': 'WHAT ARE YOU, A CAVEMAN???',
  'hero.cta': '>>> I WANT IT NOW <<<',
  'hero.counter': 'REPORTS SENT TODAY:',
  'price.discount': 'DISCOUNT -146%',
  'price.free': 'FREE!!!*',
  'price.today': '(today only!)',
  'benefits.title': 'WHY EXACTLY US',
  'reviews.title': 'CUSTOMER REVIEWS (REAL!):',
  'reviews.loading': 'loading real reviews from real people…',
  'reviews.empty': 'reviews are being shy right now',
  'pricing.title': 'PRICING (ALL FREE!!!):',
  'pricing.loading': 'calculating your savings…',
  'faq.title': 'FREQUENTLY ASKED QUESTIONS:',
  'demo.title': 'THIS IS WHAT YOUR REPORT LOOKS LIKE:',
  'demo.template': 'Report template:',
  'demo.regenerate': 'SHOW ME AGAIN',
  'subscribe.title': 'LEAVE A REQUEST FOR A FREE BOT!!!',
  'subscribe.button': 'TAKE THE BOT!!!',
  'popup.hurry': 'Your personal discount expires in:',
  'popup.gift': "Don't leave without a gift!",
  'footer.disclaimer': '*Offer valid only in your head.',
  'partners.title': 'TRUSTED BY:',
};

const DICTS: Record<string, Dict> = { ru: RU, en: EN };

export function locale(): string {
  const preferred = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  return DICTS[preferred] ? preferred : 'ru';
}

export function t(key: string): string {
  const dict = DICTS[locale()] ?? RU;
  return dict[key] ?? RU[key] ?? key;
}

// Проставляет переводы во все элементы с data-i18n. Вызывается один раз при
// старте: динамических перерисовок на лендинге нет.
export function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
}
