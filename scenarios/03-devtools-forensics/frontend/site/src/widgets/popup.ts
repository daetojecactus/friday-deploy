import { byId } from '../api';
import { isPopupShown, markPopupShown } from '../storage';
import { TICKER, pick } from '../content';

// Фейковый таймер скидки. Бесконечный: скидка не сгорает никогда, но об этом
// знает только тот, кто досмотрел до 00:00.
export function mountPopup(): void {
  const timer = byId<HTMLSpanElement>('timer');
  const popup = byId<HTMLDivElement>('popup');
  if (!timer || !popup) return;

  if (!isPopupShown()) markPopupShown();

  let left = 59;
  let ticks = 0;

  setInterval(() => {
    left = left > 0 ? left - 1 : 59;
    ticks += 1;
    timer.style.color = left % 2 === 0 ? 'blue' : 'red';
    timer.textContent = `00:${left < 10 ? '0' : ''}${left}`;

    // Раз в полминуты меняем текст в бегущей строке снизу — «чтобы не приедался».
    if (ticks % 30 === 0) {
      const marquee = document.querySelector('.bottom-marquee span');
      if (marquee) marquee.textContent = pick(TICKER, ticks / 30);
    }
  }, 800);
}
