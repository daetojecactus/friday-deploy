import type { Db } from 'mongodb';
import { OPEN_STATUSES, SHOPFRONT_INDEX } from '../../api/orders.controller';
import { getDb } from '../lib/mongo';
import { getInstallState } from '../install';
import { applyProbeStatuses } from '../feed';

// Синтетический мониторинг стенда.
//
// Каждая проба — это та же бизнес-операция, что и кнопка на странице, только
// выполненная роботом и убранная за собой. Пробы принципиально НЕ смотрят на
// конфигурацию базы («а какой сейчас expireAfterSeconds») — только на
// поведение. Поэтому обмануть индикатор нельзя: он зеленеет ровно тогда, когда
// операция снова работает.
//
// Ходят пробы через подключение ПРИЛОЖЕНИЯ: они обязаны видеть ровно то же,
// что видит пользователь.

export type ProbeStatus = 'green' | 'yellow' | 'red' | 'unknown';

export type ProbeResult = { status: ProbeStatus; note?: string };

export type ProbeState = {
  id: number;
  key: string;
  label: string;
  about: string;
  status: ProbeStatus;
  note: string | null;
  checkedAt: string | null;
};

type ProbeDefinition = {
  id: number;
  key: string;
  label: string;
  about: string;
  run: (db: Db) => Promise<ProbeResult>;
};

export const CYCLE_MS = 5000;

const SYNTHETIC = '_synthetic';
const CANARY_TOKEN = 'monitoring-canary';
// Контрольная сессия создается «постаревшей» на две минуты: с часовым сроком
// жизни она это переживет, с минутным — нет.
const CANARY_BACKDATE_MS = 120_000;
// Столько ждем, прежде чем поверить, что сессия действительно живет: TTL-монитор
// MongoDB просыпается раз в минуту.
const CANARY_HOLD_MS = 70_000;
// Если контрольная сессия дожила до этого возраста, ее исчезновение — штатное
// протухание по сроку, а не симптом.
const CANARY_HEALTHY_MS = 10 * 60_000;
const MESSAGES_INDEX_LIMIT = 15 * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;

let canaryInsertedAt = 0;

async function probeSessions(db: Db): Promise<ProbeResult> {
  const sessions = db.collection('sessions');
  const canary = await sessions.findOne({ token: CANARY_TOKEN });

  const restart = async (): Promise<void> => {
    await sessions.deleteMany({ token: CANARY_TOKEN });
    await sessions.insertOne({
      token: CANARY_TOKEN,
      customerId: null,
      userAgent: 'monitoring',
      [SYNTHETIC]: true,
      createdAt: new Date(Date.now() - CANARY_BACKDATE_MS),
    });
    canaryInsertedAt = Date.now();
  };

  // Первый цикл или рестарт бэкенда: замер начинаем заново.
  if (!canaryInsertedAt) {
    await restart();
    return { status: 'unknown', note: 'проверяем, до минуты' };
  }

  const heldMs = Date.now() - canaryInsertedAt;

  if (!canary) {
    await restart();
    if (heldMs >= CANARY_HEALTHY_MS)
      return { status: 'green', note: 'контрольная сессия отработала свой срок' };
    return {
      status: 'red',
      note: `контрольная сессия прожила ${Math.round(heldMs / 1000)} с`,
    };
  }

  if (heldMs < CANARY_HOLD_MS)
    return {
      status: 'unknown',
      note: `проверяем, еще ${Math.ceil((CANARY_HOLD_MS - heldMs) / 1000)} с`,
    };

  return { status: 'green', note: 'контрольная сессия держится' };
}

async function probeOrders(db: Db): Promise<ProbeResult> {
  const orders = db.collection('orders');
  const filter = { status: { $in: OPEN_STATUSES } };

  // Ровно тот же запрос, что делает витрина.
  const shopfront = await orders
    .find(filter)
    .sort({ createdAt: -1 })
    .hint(SHOPFRONT_INDEX)
    .limit(50)
    .toArray();

  // Контрольный пересчет: сколько заказов в работе есть на самом деле.
  const total = await orders.countDocuments(filter);

  if (!shopfront.length && total > 0)
    return { status: 'red', note: `витрина пустая, а заказов в работе — ${total}` };

  return { status: 'green', note: `витрина: ${shopfront.length} из ${total}` };
}

async function probeRegistration(db: Db): Promise<ProbeResult> {
  const customers = db.collection('customers');
  const twin = await customers.findOne(
    { [SYNTHETIC]: { $ne: true } },
    { sort: { _id: 1 }, projection: { firstName: 1 } },
  );

  const probe = {
    firstName: twin?.firstName ?? 'Винсент',
    lastName: 'Мониторинг',
    email: `monitoring+${Date.now()}@crm.local`,
    age: 33,
    city: 'Москва',
    plan: 'basic',
    createdAt: new Date(),
    [SYNTHETIC]: true,
  };

  const { insertedId } = await customers.insertOne(probe);
  await customers.deleteOne({ _id: insertedId });
  return { status: 'green', note: 'регистрация проходит' };
}

async function probeProfiles(db: Db): Promise<ProbeResult> {
  // Та же арифметика, что и в карточке клиента, но сразу по всем клиентам.
  const profiles = await db
    .collection('customers')
    .aggregate([
      { $addFields: { birthYear: { $subtract: [new Date().getFullYear(), '$age'] } } },
      { $project: { birthYear: 1 } },
    ])
    .toArray();

  return { status: 'green', note: `карточек открывается: ${profiles.length}` };
}

async function probeStorage(db: Db): Promise<ProbeResult> {
  const [stats] = await db
    .collection('messages')
    .aggregate([{ $collStats: { storageStats: {} } }])
    .toArray();

  const indexBytes = stats?.storageStats?.totalIndexSize ?? 0;
  const dataBytes = stats?.storageStats?.size ?? 0;
  const note = `индексы переписки: ${mb(indexBytes)} при данных ${mb(dataBytes)}`;

  return { status: indexBytes > MESSAGES_INDEX_LIMIT ? 'yellow' : 'green', note };
}

async function probeIncidents(db: Db): Promise<ProbeResult> {
  const incidents = db.collection('incidents');
  const { insertedId } = await incidents.insertOne({
    code: `INC-MON-${Date.now() % 100000}`,
    title: 'Синтетическая проверка мониторинга',
    status: 'New',
    owner: 'monitoring',
    openedAt: new Date(),
    [SYNTHETIC]: true,
  });

  try {
    await incidents.updateOne({ _id: insertedId }, { $set: { status: 'Active' } });
    return { status: 'green', note: 'инцидент переводится в работу' };
  } finally {
    await incidents.deleteOne({ _id: insertedId });
  }
}

async function probeSupport(db: Db): Promise<ProbeResult> {
  const tickets = db.collection('tickets');
  // Обращение без «дополнительной информации» — самый частый случай на форме.
  const { insertedId } = await tickets.insertOne({
    subject: 'Синтетическая проверка мониторинга',
    body: 'Проверка формы обращения',
    status: 'Open',
    createdAt: new Date(),
    [SYNTHETIC]: true,
  });
  await tickets.deleteOne({ _id: insertedId });
  return { status: 'green', note: 'обращения создаются' };
}

const PROBES: ProbeDefinition[] = [
  {
    id: 3,
    key: 'registration',
    label: 'Регистрация',
    about: 'менеджер заводит нового клиента',
    run: probeRegistration,
  },
  {
    id: 2,
    key: 'orders',
    label: 'Заказы',
    about: 'витрина заказов в работе',
    run: probeOrders,
  },
  {
    id: 1,
    key: 'sessions',
    label: 'Сессии',
    about: 'клиент остается в личном кабинете',
    run: probeSessions,
  },
  {
    id: 4,
    key: 'profiles',
    label: 'Профили',
    about: 'карточка клиента открывается',
    run: probeProfiles,
  },
  {
    id: 6,
    key: 'incidents',
    label: 'Инциденты',
    about: 'инцидент переводится в работу',
    run: probeIncidents,
  },
  {
    id: 7,
    key: 'support',
    label: 'Поддержка',
    about: 'клиент создает обращение',
    run: probeSupport,
  },
  {
    id: 5,
    key: 'storage',
    label: 'Хранилище',
    about: 'потребление памяти и диска',
    run: probeStorage,
  },
];

let states: ProbeState[] = PROBES.map((probe) => ({
  id: probe.id,
  key: probe.key,
  label: probe.label,
  about: probe.about,
  status: 'unknown',
  note: null,
  checkedAt: null,
}));

let lastCycleAt: string | null = null;

export function getProbeStates(): ProbeState[] {
  return states.map((state) => ({ ...state }));
}

export function getLastCycleAt(): string | null {
  return lastCycleAt;
}

export function resetProbes(): void {
  canaryInsertedAt = 0;
  lastCycleAt = null;
  states = states.map((state) => ({ ...state, status: 'unknown', note: null, checkedAt: null }));
}

// Остатки синтетики после падения процесса посреди цикла.
async function cleanupSynthetic(db: Db): Promise<void> {
  for (const collection of ['customers', 'incidents', 'tickets']) {
    await db.collection(collection).deleteMany({ [SYNTHETIC]: true }).catch(() => {});
  }
}

async function runCycle(): Promise<void> {
  if (getInstallState().phase !== 'ready') return;
  const db = await getDb();

  const next: ProbeState[] = [];
  for (const probe of PROBES) {
    const previous = states.find((state) => state.key === probe.key);
    let result: ProbeResult;

    try {
      result = await probe.run(db);
    } catch (error: any) {
      // Текст ошибки участнику не показываем: он получает его сам, нажав
      // кнопку в левой панели. В логи пишем — это лог мониторинга.
      result = { status: 'red', note: 'операция не выполняется' };
      if (previous?.status !== 'red')
        console.warn(`[probe] ${probe.key}: ${error?.codeName ?? error?.name} ${error?.message}`);
    }

    // Пока идет перепроверка (сессии), держим последний известный зеленый:
    // иначе плашка мигала бы серым каждый раз при обновлении канарейки.
    if (result.status === 'unknown' && previous?.status === 'green') result.status = 'green';

    next.push({
      id: probe.id,
      key: probe.key,
      label: probe.label,
      about: probe.about,
      status: result.status,
      note: result.note ?? null,
      checkedAt: new Date().toISOString(),
    });
  }

  states = next;
  lastCycleAt = new Date().toISOString();
  applyProbeStatuses(states);
}

export function startMonitor(): void {
  void (async () => {
    try {
      await cleanupSynthetic(await getDb());
    } catch {
      /* база может быть еще не готова — почистим в следующий раз */
    }

    const tick = async () => {
      try {
        await runCycle();
      } catch (error: any) {
        console.error('[probe] цикл не отработал:', error?.message ?? error);
      }
      setTimeout(tick, CYCLE_MS);
    };
    void tick();
  })();
}
