// Тонкая обертка над fetch.
//
// Главное правило страницы: ответ боевого API показывается КАК ЕСТЬ. Здесь он
// не переписывается и не «переводится» — сохраняются и HTTP-код, и тело целиком,
// включая настоящий текст ошибки MongoDB и блок errInfo.

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        source: string;
        name: string;
        code?: number | string;
        codeName?: string;
        message: string;
        errInfo?: unknown;
      };
    };

export type ApiResult<T> = {
  method: string;
  url: string;
  status: number;
  ms: number;
  ok: boolean;
  payload: ApiEnvelope<T> | null;
  data: T | null;
  /** Короткая строка для тоста: текст ошибки MongoDB или подтверждение. */
  errorText: string | null;
};

export async function call<T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const startedAt = performance.now();
  const options: RequestInit = { method, headers: {} };

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    const ok = response.ok && Boolean(payload) && payload?.ok !== false;

    return {
      method,
      url,
      status: response.status,
      ms: Math.round(performance.now() - startedAt),
      ok,
      payload,
      data: payload && payload.ok ? payload.data : null,
      errorText: payload && payload.ok === false ? payload.error.message : null,
    };
  } catch (error) {
    // Сеть до стенда не дошла — это не ошибка MongoDB, помечаем отдельно.
    return {
      method,
      url,
      status: 0,
      ms: Math.round(performance.now() - startedAt),
      ok: false,
      payload: {
        ok: false,
        error: { source: `${method} ${url}`, name: 'NetworkError', message: String(error) },
      },
      data: null,
      errorText: String(error),
    };
  }
}

// Мелкие коллекции в мегабайтах превращаются в «0.0 МБ» — для отчета по
// хранилищу это бесполезно, поэтому до мегабайта показываем килобайты.
export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 МБ';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

export const formatMoney = (value: number, currency = 'RUB'): string =>
  `${value.toLocaleString('ru-RU')} ${currency === 'RUB' ? '₽' : currency}`;

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
