import { Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { getInstallState, reinstall } from './install';
import { CYCLE_MS, getLastCycleAt, getProbeStates, resetProbes } from './probes';
import { getMessages, resetFeed } from './feed';
import { buildConnectionInfo } from './lib/connection';

// Служебные эндпоинты стенда: состояние продакшена, лента Slack, строка
// подключения к базе и переустановка. Правая панель страницы опрашивает только
// /api/stand/status.

@Controller('stand')
export class StandController {
  @Get('status')
  status(@Query('since') since?: string) {
    // since может не прийти вовсе (например, при curl из README): без
    // нормализации Number(undefined) дал бы NaN, и лента приехала бы пустой.
    const cursor = Number(since);
    const from = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;
    const messages = getMessages(from);

    return {
      install: getInstallState(),
      cycleMs: CYCLE_MS,
      lastCycleAt: getLastCycleAt(),
      probes: getProbeStates(),
      messages,
      lastMessageId: messages.length ? messages[messages.length - 1].id : from,
    };
  }

  // Готовая строка подключения к MongoDB: ее можно скопировать и передать
  // коллеге в той же сети. Адрес берется из того, как открыта страница.
  @Get('connection')
  connection(@Headers('host') host?: string) {
    return buildConnectionInfo(host);
  }

  // Пересобрать стенд: снести базу, залить данные заново и снова сломать.
  @Post('reset')
  async reset() {
    resetFeed();
    resetProbes();
    return reinstall();
  }
}
