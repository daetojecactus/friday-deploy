// Клиент публичного API лендинга. Ничего умного: fetch и разбор JSON.

export async function get<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
