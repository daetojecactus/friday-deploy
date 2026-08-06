import { bumpVisits } from './storage';

// Аналитика лендинга: события уходят в dataLayer, как учили в 2014-м.

export function trackPageview(): void {
  const visits = bumpVisits();
  window.dataLayer?.push({
    event: 'pageview',
    page: location.pathname,
    visits,
    referrer: document.referrer || 'direct',
  });
}

export function trackScrollDepth(): void {
  const marks = [25, 50, 75, 100];
  const seen = new Set<number>();

  window.addEventListener(
    'scroll',
    () => {
      const height = document.body.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      const depth = Math.round((window.scrollY / height) * 100);

      for (const mark of marks) {
        if (depth >= mark && !seen.has(mark)) {
          seen.add(mark);
          window.dataLayer?.push({ event: 'scroll_depth', depth: mark });
        }
      }
    },
    { passive: true },
  );
}
