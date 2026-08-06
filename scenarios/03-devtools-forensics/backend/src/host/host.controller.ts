import { Body, Controller, Get, Header, NotFoundException, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { pendingAuthor, readFeed } from '../internal/feed';
import {
  getProgress,
  getRows,
  giveHint,
  resetGame,
  revealLeak,
  submitAnswer,
  syncIdleChatter,
} from '../internal/game/store';

// API и страница дашборда ведущего.
//
// Главное правило: категория и маркер ненайденной утечки отсюда не уезжают
// никогда. Сверка идёт на сервере, наружу отдаётся только то, что уже закрыто —
// найдено командой или раскрыто самим ведущим. Поэтому дашборд не спойлерит,
// даже если его случайно откроют с чужого экрана.

const DIST = '/app/public-host';

@Controller()
export class HostController {
  @Get()
  index(@Res() response: Response): void {
    response.sendFile(join(DIST, 'index.html'));
  }

  @Get('api/state')
  @Header('Cache-Control', 'no-store')
  async state(@Query('since') since?: string) {
    await syncIdleChatter();

    const cursor = Number(since);
    const from = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;
    const messages = await readFeed(from);

    return {
      progress: await getProgress(),
      leaks: await getRows(),
      messages,
      lastMessageSeq: messages.length ? messages[messages.length - 1].seq : from,
      // Кто «печатает» прямо сейчас — под лентой появляется троеточие.
      typing: await pendingAuthor(),
    };
  }

  @Post('api/answer')
  async answer(@Body() body: { value?: string }) {
    return submitAnswer(String(body?.value ?? ''));
  }

  @Post('api/hint')
  async hint(@Body() body: { id?: number }) {
    const result = await giveHint(Number(body?.id));
    if (!result) throw new NotFoundException('нет такой утечки');
    return result;
  }

  @Post('api/reveal')
  async reveal(@Body() body: { id?: number }) {
    const leak = await revealLeak(Number(body?.id));
    if (!leak) throw new NotFoundException('нет такой утечки');
    return { id: leak.id, marker: leak.marker, lesson: leak.lesson, cause: leak.cause };
  }

  @Post('api/reset')
  async reset() {
    await resetGame();
    return { ok: true };
  }
}
