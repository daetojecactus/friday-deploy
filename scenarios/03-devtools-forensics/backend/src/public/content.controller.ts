import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { corpOrigin } from '../internal/lib/origin';

// Публичное API лендинга. Конвертом { ok, data } намеренно не пользуется:
// команда изучает эти ответы в Network, и они должны выглядеть как ответы
// обычного сайта, а не учебного стенда.

const REVIEWS = [
  {
    author: 'Джордан Белфорт',
    role: 'ex-джун',
    rating: 5,
    text: 'Этот бот изменил мою жизнь. Раньше я был джуном, а теперь я СЕО Гитлаба!',
  },
  {
    author: 'Мия Уоллес',
    role: 'Support',
    rating: 5,
    text: 'Раньше я писала отчёт сорок минут. Теперь сорок минут я смотрю, как его пишет бот.',
  },
  {
    author: 'Тайлер Дёрден',
    role: 'DevOps',
    rating: 4,
    text: 'Первое правило отчётов: никто не говорит про отчёты. Бот тоже молчит, просто отправляет.',
  },
  {
    author: 'Клэрис Старлинг',
    role: 'QA',
    rating: 5,
    text: 'Нашла в отчёте баг, которого не было в моей работе. Идеально.',
  },
  {
    author: 'Дом Кобб',
    role: 'Product',
    rating: 5,
    text: 'Отчёт внутри отчёта внутри отчёта. Мы называем это вложенностью, клиент — прозрачностью.',
  },
];

const PLANS = [
  { name: 'СТАРТОВЫЙ', price: 'БЕСПЛАТНО', note: 'один отчёт в день, как у людей' },
  { name: 'ПРОФЕССИОНАЛЬНЫЙ', price: 'БЕСПЛАТНО', note: 'то же самое, но с AI' },
  { name: 'КОРПОРАТИВНЫЙ', price: 'БЕСПЛАТНО', note: 'то же самое, но звучит солиднее' },
  { name: 'ПЛАТИНОВЫЙ ULTRA', price: 'БЕСПЛАТНО', note: 'то же самое, но капсом' },
];

const BENEFITS = [
  { icon: 'fire', title: 'МЕГА СКОРОСТЬ', text: 'Отчёт готов раньше, чем ты открыл GitLab.' },
  { icon: 'crown', title: 'VIP ЭКСКЛЮЗИВ', text: 'Уникальный алгоритм на базе if/else.' },
  { icon: 'trophy', title: 'SUCCESSFUL SUCCESS', text: 'Продуктивность без продуктивности.' },
  { icon: 'brain', title: 'AI НА БОРТУ', text: 'Три провайдера, один результат.' },
];

@Controller('api')
export class ContentController {
  @Get('stats')
  stats() {
    const hour = new Date().getHours();
    return { reportsToday: 1240 + hour * 37, usersActive: 128, queueDepth: 3, uptime: '99.4%' };
  }

  @Get('reviews')
  reviews(@Req() request: Request) {
    return {
      items: REVIEWS,
      total: REVIEWS.length,
      // Служебный блок ETL, который забыли вырезать из ответа: интерфейс его не
      // показывает, но пользователю он приехал целиком. Адрес настоящий —
      // найденную строку можно открыть и увидеть витрину.
      _meta: {
        source: `${corpOrigin(request.headers.host)}/db/v1/reviews-mirror-6b0d`,
        generatedBy: 'rdb-etl',
        rows: 412,
        syncedAt: new Date().toISOString(),
      },
    };
  }

  @Get('pricing')
  pricing() {
    return { plans: PLANS, currency: 'KZT', discount: -146 };
  }

  @Get('benefits')
  benefits() {
    return { items: BENEFITS };
  }

  @Get('testimonials')
  testimonials() {
    return { items: REVIEWS.slice(0, 3).map((review) => review.text) };
  }

  @Get('subscribers')
  subscribers() {
    return { count: 10428, today: 37, growth: '+146%' };
  }

  @Get('search')
  search(@Query('q') q?: string) {
    const query = (q ?? '').toLowerCase();
    return { query, items: PLANS.filter((plan) => plan.name.toLowerCase().includes(query)) };
  }
}
