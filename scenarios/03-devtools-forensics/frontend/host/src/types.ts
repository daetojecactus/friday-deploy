export type LeakStatus = 'open' | 'found' | 'revealed';

export type LeakRow = {
  id: number;
  difficulty: number;
  status: LeakStatus;
  at: string | null;
  withHint: boolean;
  /** Приходит с сервера только после того, как утечку закрыли. */
  category: string | null;
  marker: string | null;
  lesson: string | null;
  hintsUsed: number;
  hintsTotal: number;
};

export type Progress = {
  total: number;
  found: number;
  revealed: number;
  withHint: number;
  startedAt: string;
  finishedAt: string | null;
};

export type FeedKind =
  | 'intro'
  | 'found'
  | 'danger'
  | 'ask'
  | 'hint'
  | 'reveal'
  | 'nudge'
  | 'milestone'
  | 'finale';

export type FeedMessage = {
  seq: number;
  at: string;
  author: string;
  role: string;
  emoji: string;
  text: string;
  kind: FeedKind;
};

export type HostState = {
  progress: Progress;
  leaks: LeakRow[];
  messages: FeedMessage[];
  lastMessageSeq: number;
  /** Автор сообщения, которое вот-вот появится. */
  typing: string | null;
};

export type AnswerResult =
  | { kind: 'match'; leak: { id: number; category: string; marker: string; lesson: string } }
  | { kind: 'already'; id: number }
  | { kind: 'too-broad' }
  | { kind: 'bare-host' }
  | { kind: 'miss' };
