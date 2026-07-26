import { FINALE, INTRO, SCRIPTS, type Line } from './script';

// Slack-движок стенда.
//
// Лента живет в памяти процесса и НЕ пишется в базу: иначе участник наткнулся
// бы на нее в `show collections` и прочитал спойлеры. После рестарта бэкенда
// лента восстанавливается сама — по текущему состоянию проб.
//
// Сообщения появляются на переходах состояния:
//   красный впервые   -> тред жалобы
//   красный > 10 мин  -> эскалация
//   красный -> зеленый -> благодарность
//   зеленый -> красный -> сообщение о регрессе
//   все зеленое        -> финал

export type FeedMessage = Line & {
  id: number;
  at: string;
  probe: string | null;
  kind: 'intro' | 'complaint' | 'escalation' | 'thanks' | 'regress' | 'finale';
};

type ProbePhase = {
  status: string;
  redSince: number | null;
  complained: boolean;
  escalated: boolean;
};

const ESCALATE_AFTER_MS = 10 * 60_000;
// Первые сообщения проставляются задним числом, чтобы лента на старте
// выглядела как утренняя переписка, а не как пачка сообщений в одну секунду.
const BOOTSTRAP_WINDOW_MS = 3 * 60_000;
const BOOTSTRAP_STEP_MS = 150_000;

let messages: FeedMessage[] = [];
let phases: Record<string, ProbePhase> = {};
let sequence = 0;
let startedAt = Date.now();
let bootstrapSlot = 0;
let finaleSent = false;

function post(line: Line, probe: string | null, kind: FeedMessage['kind']): void {
  const bootstrapping = Date.now() - startedAt < BOOTSTRAP_WINDOW_MS;
  const at = bootstrapping
    ? new Date(startedAt - 20 * 60_000 + bootstrapSlot++ * BOOTSTRAP_STEP_MS)
    : new Date();

  sequence += 1;
  messages.push({ ...line, id: sequence, at: at.toISOString(), probe, kind });
  if (messages.length > 200) messages = messages.slice(-200);
}

export function resetFeed(): void {
  messages = [];
  phases = {};
  sequence = 0;
  startedAt = Date.now();
  bootstrapSlot = 0;
  finaleSent = false;
}

export function getMessages(since = 0): FeedMessage[] {
  return messages.filter((message) => message.id > since);
}

// Вызывается монитором после каждого цикла проб.
export function applyProbeStatuses(states: { key: string; status: string }[]): void {
  if (!messages.length) for (const line of INTRO) post(line, null, 'intro');

  const now = Date.now();

  for (const state of states) {
    const script = SCRIPTS[state.key];
    if (!script) continue;

    const phase = (phases[state.key] ??= {
      status: 'unknown',
      redSince: null,
      complained: false,
      escalated: false,
    });

    // Желтый — «работает, но с оговоркой» (сценарий про хранилище): жалоба
    // такая же, как у красного, просто бизнес-операции при этом проходят.
    const failing = state.status === 'red' || state.status === 'yellow';

    if (failing) {
      if (phase.status === 'green') post(script.regress, state.key, 'regress');
      if (!phase.complained) {
        for (const line of script.complaint) post(line, state.key, 'complaint');
        phase.complained = true;
      }
      phase.redSince ??= now;
      if (!phase.escalated && now - phase.redSince > ESCALATE_AFTER_MS) {
        post(script.escalation, state.key, 'escalation');
        phase.escalated = true;
      }
    }

    if (state.status === 'green') {
      if (phase.complained) {
        post(script.thanks, state.key, 'thanks');
        phase.complained = false;
        phase.escalated = false;
      }
      phase.redSince = null;
    }

    if (state.status !== 'unknown') phase.status = state.status;
  }

  const allGreen =
    states.length > 0 && states.every((state) => state.status === 'green');
  if (allGreen && !finaleSent) {
    post(FINALE, null, 'finale');
    finaleSent = true;
  }
  if (!allGreen) finaleSent = false;
}
