import { Controller, Get, Post, Query } from '@nestjs/common';
import { getInstallState, reinstall } from './install';
import { CYCLE_MS, getLastCycleAt, getProbeStates, resetProbes } from './probes';
import { getMessages, resetFeed } from './feed';

// Служебные эндпоинты стенда: состояние продакшена, лента Slack и
// переустановка. Правая панель страницы опрашивает только /api/stand/status.

@Controller('stand')
export class StandController {
  @Get('status')
  status(@Query('since') since?: string) {
    const messages = getMessages(Number(since ?? 0));
    return {
      install: getInstallState(),
      cycleMs: CYCLE_MS,
      lastCycleAt: getLastCycleAt(),
      probes: getProbeStates(),
      messages,
      lastMessageId: messages.length ? messages[messages.length - 1].id : Number(since ?? 0),
    };
  }

  // Пересобрать стенд: снести базу, залить данные заново и снова сломать.
  @Post('reset')
  async reset() {
    resetFeed();
    resetProbes();
    return reinstall();
  }
}
