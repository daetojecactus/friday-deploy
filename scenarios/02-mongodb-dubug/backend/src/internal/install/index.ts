import type { Db } from 'mongodb';
import { getAdminDb, getMetaDb, waitForMongo } from '../lib/admin';
import { COLLECTIONS, INDEXES, VALIDATORS } from './schema';
import {
  MESSAGES_BATCH,
  MESSAGES_TOTAL,
  buildCustomers,
  buildIncidents,
  buildMessage,
  buildOrders,
  buildTickets,
} from './data';
import { BREAKAGES } from './breakage';

// Установщик стенда.
//
// Ключевое правило: установка выполняется ОДИН РАЗ. Маркер лежит в отдельной
// базе stand_meta, и при рестарте бэкенда установщик просто ничего не делает —
// иначе он затирал бы починки участника. Переустановка только явная: кнопка на
// странице или POST /api/stand/reset.

export type InstallPhase = 'starting' | 'installing' | 'ready' | 'failed';

export type InstallState = {
  phase: InstallPhase;
  step: string | null;
  incidents: number[];
  installedAt: string | null;
  error: string | null;
};

const state: InstallState = {
  phase: 'starting',
  step: null,
  incidents: [],
  installedAt: null,
  error: null,
};

export function getInstallState(): InstallState {
  return { ...state };
}

function selectedIncidents(): number[] {
  const raw = process.env.STAND_INCIDENTS ?? '1,2,3,4,5,6,7';
  const ids = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => BREAKAGES.some((breakage) => breakage.id === value));
  return [...new Set(ids)].sort((a, b) => a - b);
}

async function fillDatabase(db: Db): Promise<void> {
  state.step = 'создаю коллекции и валидаторы';
  for (const name of COLLECTIONS) {
    await db.createCollection(name, VALIDATORS[name] ? { validator: VALIDATORS[name] } : {});
  }

  state.step = 'заполняю клиентов, заказы, инциденты и обращения';
  const customers = buildCustomers();
  const tickets = buildTickets(customers);
  await db.collection('customers').insertMany(customers);
  await db.collection('orders').insertMany(buildOrders(customers));
  await db.collection('incidents').insertMany(buildIncidents());
  await db.collection('tickets').insertMany(tickets);

  // Переписка вставляется пачками: документы «жирные», ~16 КБ каждый.
  for (let from = 0; from < MESSAGES_TOTAL; from += MESSAGES_BATCH) {
    state.step = `заполняю переписку (${from} из ${MESSAGES_TOTAL})`;
    const batch = Array.from({ length: Math.min(MESSAGES_BATCH, MESSAGES_TOTAL - from) }, (_, offset) =>
      buildMessage(tickets[(from + offset) % tickets.length]._id, from + offset),
    );
    await db.collection('messages').insertMany(batch);
  }

  state.step = 'строю индексы';
  for (const spec of INDEXES) {
    await db.collection(spec.collection).createIndex(spec.keys, spec.options);
  }
}

async function install(): Promise<void> {
  const db = await getAdminDb();
  state.phase = 'installing';
  state.error = null;

  await db.dropDatabase();
  await fillDatabase(db);

  const incidents = selectedIncidents();
  state.step = 'применяю поломки';
  for (const breakage of BREAKAGES) {
    if (!incidents.includes(breakage.id)) continue;
    await breakage.apply(db);
    console.log(`[install] инцидент ${breakage.id}: ${breakage.title}`);
  }

  const installedAt = new Date();
  const meta = await getMetaDb();
  await meta
    .collection('install')
    .replaceOne({ _id: 'stand' as any }, { installedAt, incidents }, { upsert: true });

  state.phase = 'ready';
  state.step = null;
  state.incidents = incidents;
  state.installedAt = installedAt.toISOString();
}

export async function installIfNeeded(): Promise<void> {
  try {
    await waitForMongo();
    const meta = await getMetaDb();
    const marker = await meta.collection('install').findOne({ _id: 'stand' as any });

    if (marker) {
      state.phase = 'ready';
      state.incidents = (marker as any).incidents ?? [];
      state.installedAt = new Date((marker as any).installedAt).toISOString();
      console.log('[install] стенд уже установлен, данные и поломки не трогаем');
      return;
    }

    await install();
    console.log('[install] стенд установлен');
  } catch (error: any) {
    state.phase = 'failed';
    state.error = String(error?.message ?? error);
    console.error('[install] не удалось установить стенд:', state.error);
  }
}

export async function reinstall(): Promise<InstallState> {
  try {
    await install();
    console.log('[install] стенд переустановлен');
  } catch (error: any) {
    state.phase = 'failed';
    state.error = String(error?.message ?? error);
    console.error('[install] переустановка не удалась:', state.error);
  }
  return getInstallState();
}
