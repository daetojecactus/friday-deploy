// Клиент API дашборда. Ответы приезжают в конверте { ok, data } — том же, что
// в стенде 02.

type Envelope<T> = { ok: boolean; data?: T; error?: { message: string } };

export type Result<T> = { ok: boolean; data?: T; errorText?: string };

export async function call<T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json()) as Envelope<T>;
    if (payload.ok) return { ok: true, data: payload.data };
    return { ok: false, errorText: payload.error?.message ?? `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, errorText: String(error) };
  }
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatClock(fromIso: string, toIso: string | null): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((to - from) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
