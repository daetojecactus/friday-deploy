// Формы данных боевого API и служебного слоя стенда.

export type ProbeStatus = 'green' | 'yellow' | 'red' | 'unknown';

export type Probe = {
  id: number;
  key: string;
  label: string;
  about: string;
  status: ProbeStatus;
  note: string | null;
  checkedAt: string | null;
};

export type FeedKind = 'intro' | 'complaint' | 'escalation' | 'thanks' | 'regress' | 'finale';

export type FeedMessage = {
  id: number;
  at: string;
  author: string;
  role: string;
  emoji: string;
  text: string;
  probe: string | null;
  kind: FeedKind;
};

export type InstallState = {
  phase: 'starting' | 'installing' | 'ready' | 'failed';
  step: string | null;
  incidents: number[];
  installedAt: string | null;
  error: string | null;
};

export type StandStatus = {
  install: InstallState;
  cycleMs: number;
  lastCycleAt: string | null;
  probes: Probe[];
  messages: FeedMessage[];
  lastMessageId: number;
};

export type Connection = {
  host: string;
  port: number;
  database: string;
  authSource: string;
  detected: boolean;
  loopback: boolean;
  user: string;
  uri: string;
  mongoshCommand: string;
  dockerCommand: string;
  appUser: string;
};

export type Customer = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  city?: string;
  plan?: string;
};

export type Incident = {
  _id: string;
  code: string;
  title: string;
  status: string;
  owner?: string;
  openedAt?: string;
};

export type Order = {
  _id: string;
  orderNo: string;
  customerName: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
};

export type StorageReport = {
  database: string;
  cacheSizeMb: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  indexes: number;
  collections: {
    collection: string;
    documents: number;
    dataSize: number;
    storageSize: number;
    totalIndexSize: number;
    indexSizes: Record<string, number>;
  }[];
};

export type Session = {
  token: string;
  createdAt: string;
  customer: string;
};
