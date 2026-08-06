import { installConfig } from './config';
import { installStorage } from './storage';
import { installAdminTools } from './admin';
import { trackPageview, trackScrollDepth } from './analytics';
import { mountCounter } from './widgets/counter';
import { mountQueueStatus } from './widgets/queue';
import { mountReviews } from './widgets/reviews';
import { mountPricing } from './widgets/pricing';
import { mountPopup } from './widgets/popup';
import { mountConfetti } from './widgets/confetti';
import { mountSubscribe } from './widgets/subscribe';
import { mountFeatures } from './widgets/features';
import { mountFaq } from './widgets/faq';
import { mountDemo } from './widgets/demo';
import { applyTranslations } from './i18n';
import { SLOGANS, pick } from './content';

// Точка входа лендинга ReportDailyBot.

function boot(): void {
  installConfig();
  installStorage();

  trackPageview();
  trackScrollDepth();

  applyTranslations();
  mountPopup();
  mountConfetti();
  mountSubscribe();
  mountFeatures();
  mountFaq();
  mountDemo();
  installAdminTools();

  void mountCounter();
  void mountQueueStatus();
  void mountReviews();
  void mountPricing();

  rotateSlogan();
}

// Слоган в шапке меняется сам: одного человеку мало.
function rotateSlogan(): void {
  const node = document.querySelector('.fire-text');
  if (!node) return;

  let index = 0;
  setInterval(() => {
    index += 1;
    node.textContent = pick(SLOGANS, index);
  }, 6000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
