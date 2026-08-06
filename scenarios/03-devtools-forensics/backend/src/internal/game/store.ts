import { getDb } from '../lib/mongo';
import { clearFeed, feedSize, post } from '../feed';
import {
  ASKS,
  FINALE,
  INTRO,
  MILESTONES,
  NUDGES,
  REVEAL_LINE,
  TEAM,
  TRINITY,
  WINSTON,
  pick,
} from '../feed/script';
import { LEAKS, matchAnswer, type Leak } from '../leaks/registry';

// Состояние игры. Живёт в MongoDB, потому что рестарт бэкенда посреди урока не
// должен стирать сорок минут находок.

type Found = { id: number; at: string; answer: string; withHint: boolean };
type Hint = { id: number; level: number; at: string };
type Revealed = { id: number; at: string };

type GameDoc = {
  _id: string;
  startedAt: string;
  finishedAt: string | null;
  found: Found[];
  hints: Hint[];
  revealed: Revealed[];
  /** Когда коллеги последний раз сами подавали голос в затишье. */
  lastNudgeAt: string | null;
  nudgeCount: number;
};

const ID = 'game';
// Через столько тишины коллеги напоминают о себе сами.
const QUIET_MS = 5 * 60_000;

// Паузы между репликами: чат должен читаться как разговор, а не как лог.
const DELAY = {
  danger: 4000,
  hintAnswer: 3500,
  milestone: 2500,
  finale: 3000,
};

async function collection() {
  return (await getDb()).collection<GameDoc>('game');
}

export async function ensureGame(): Promise<GameDoc> {
  const games = await collection();
  const existing = await games.findOne({ _id: ID });
  if (existing) return existing;

  const fresh: GameDoc = {
    _id: ID,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    found: [],
    hints: [],
    revealed: [],
    lastNudgeAt: null,
    nudgeCount: 0,
  };

  await games.insertOne(fresh);
  if ((await feedSize()) === 0) {
    for (const line of INTRO) await post(line.author, line.text, 'intro', line.delay);
  }
  return fresh;
}

// --- строки таблицы дашборда ------------------------------------------------

export type LeakRow = {
  id: number;
  difficulty: number;
  status: 'open' | 'found' | 'revealed';
  at: string | null;
  withHint: boolean;
  /** Категория, маркер и урок раскрываются только после того, как утечку закрыли. */
  category: string | null;
  marker: string | null;
  lesson: string | null;
  hintsUsed: number;
  hintsTotal: number;
};

function rowsFor(game: GameDoc): LeakRow[] {
  return LEAKS.map((leak) => {
    const found = game.found.find((item) => item.id === leak.id);
    const revealed = game.revealed.find((item) => item.id === leak.id);
    const closed = Boolean(found || revealed);

    return {
      id: leak.id,
      difficulty: leak.difficulty,
      status: found ? 'found' : revealed ? 'revealed' : 'open',
      at: found?.at ?? revealed?.at ?? null,
      withHint: found?.withHint ?? false,
      category: closed ? leak.category : null,
      marker: closed ? leak.marker : null,
      lesson: closed ? leak.lesson : null,
      hintsUsed: game.hints.filter((item) => item.id === leak.id).length,
      hintsTotal: leak.hints.length,
    };
  });
}

export async function getRows(): Promise<LeakRow[]> {
  return rowsFor(await ensureGame());
}

export async function getProgress() {
  const game = await ensureGame();
  const rows = rowsFor(game);

  return {
    total: rows.length,
    found: rows.filter((row) => row.status === 'found').length,
    revealed: rows.filter((row) => row.status === 'revealed').length,
    withHint: rows.filter((row) => row.withHint).length,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
  };
}

// --- действия ведущего ------------------------------------------------------

export type AnswerResult =
  | { kind: 'match'; leak: { id: number; category: string; marker: string; lesson: string } }
  | { kind: 'already'; id: number }
  | { kind: 'too-broad' }
  | { kind: 'bare-host' }
  | { kind: 'miss' };

export async function submitAnswer(value: string): Promise<AnswerResult> {
  const game = await ensureGame();
  const match = matchAnswer(value);
  if (match.kind !== 'match') return match;

  const leak = match.leak;
  if (game.found.some((item) => item.id === leak.id)) return { kind: 'already', id: leak.id };

  const entry: Found = {
    id: leak.id,
    at: new Date().toISOString(),
    answer: value.trim(),
    withHint: game.hints.some((item) => item.id === leak.id),
  };

  const games = await collection();
  await games.updateOne({ _id: ID }, { $push: { found: entry }, $set: { lastNudgeAt: null } });

  // Разбор от ИБ и следом цена вопроса от тимлида: сначала «почему это утечка»,
  // потом «чем это грозит». Разные роли говорят разное, и говорят по очереди —
  // тимлид отвечает через несколько секунд, а не хором с ИБ.
  await post(TRINITY, leak.lesson, 'found');
  await post(WINSTON, leak.danger, 'danger', DELAY.danger);

  const closed = game.found.length + 1 + game.revealed.length;
  const milestone = MILESTONES[closed];
  if (milestone) await post(milestone.author, milestone.text, 'milestone', DELAY.milestone);

  await checkFinale();

  return {
    kind: 'match',
    leak: { id: leak.id, category: leak.category, marker: leak.marker, lesson: leak.lesson },
  };
}

// Подсказка — это переписка, а не всплывающее окно: команда пишет в чат, что
// встала, ИБ отвечает через несколько секунд. В ленте остаётся живой след того,
// где буксовали, и его видно на разборе.
export async function giveHint(id: number): Promise<{ level: number; text: string } | null> {
  const game = await ensureGame();
  const leak = LEAKS.find((item) => item.id === id);
  if (!leak) return null;

  const used = game.hints.filter((item) => item.id === id).length;
  const level = Math.min(used + 1, leak.hints.length);
  const text = leak.hints[level - 1];

  if (used < leak.hints.length) {
    const games = await collection();
    await games.updateOne(
      { _id: ID },
      {
        $push: { hints: { id, level, at: new Date().toISOString() } },
        $set: { lastNudgeAt: null },
      },
    );
  }

  const ask = pick(ASKS[level - 1], game.hints.length + id).replace('{id}', String(id));
  await post(TEAM, ask, 'ask');
  await post(TRINITY, text, 'hint', DELAY.hintAnswer);

  return { level, text };
}

export async function revealLeak(id: number): Promise<Leak | null> {
  const game = await ensureGame();
  const leak = LEAKS.find((item) => item.id === id);
  if (!leak) return null;

  const closed =
    game.found.some((item) => item.id === id) || game.revealed.some((item) => item.id === id);

  if (!closed) {
    const games = await collection();
    await games.updateOne(
      { _id: ID },
      {
        $push: { revealed: { id, at: new Date().toISOString() } },
        $set: { lastNudgeAt: null },
      },
    );
    await post(
      WINSTON,
      REVEAL_LINE.replace('{marker}', leak.marker).replace('{lesson}', leak.lesson),
      'reveal',
    );
    await checkFinale();
  }

  return leak;
}

export async function resetGame(): Promise<void> {
  const games = await collection();
  await games.deleteOne({ _id: ID });
  await clearFeed();
  await ensureGame();
}

async function checkFinale(): Promise<void> {
  const game = await ensureGame();
  const rows = rowsFor(game);
  if (game.finishedAt || rows.some((row) => row.status === 'open')) return;

  const games = await collection();
  await games.updateOne({ _id: ID }, { $set: { finishedAt: new Date().toISOString() } });
  await post(FINALE.author, FINALE.text, 'finale', DELAY.finale);
}

// --- реакция на затишье -----------------------------------------------------

// Вызывается на каждом опросе дашборда. Если несколько минут ничего не
// происходит, коллеги подают голос сами: без этого чат оживает только по
// нажатию кнопки и выглядит как автоответчик.
export async function syncIdleChatter(): Promise<void> {
  const game = await ensureGame();
  if (game.finishedAt) return;

  const events = [
    game.startedAt,
    game.lastNudgeAt,
    ...game.found.map((item) => item.at),
    ...game.hints.map((item) => item.at),
    ...game.revealed.map((item) => item.at),
  ].filter(Boolean) as string[];

  const lastEvent = Math.max(...events.map((iso) => new Date(iso).getTime()));
  if (Date.now() - lastEvent < QUIET_MS) return;

  const nudge = pick(NUDGES, game.nudgeCount);
  await post(nudge.author, nudge.text, 'nudge');

  const games = await collection();
  await games.updateOne(
    { _id: ID },
    { $set: { lastNudgeAt: new Date().toISOString() }, $inc: { nudgeCount: 1 } },
  );
}
