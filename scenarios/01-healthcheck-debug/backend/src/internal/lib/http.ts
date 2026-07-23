// GET с таймаутом, чтобы упавшая проверка не подвешивала весь /api/checks.
export async function httpGet(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 2500,
): Promise<globalThis.Response> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: abortController.signal });
  } finally {
    clearTimeout(timeoutHandle);
  }
}
