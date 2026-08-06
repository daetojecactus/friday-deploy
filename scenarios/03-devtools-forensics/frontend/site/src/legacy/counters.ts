// Старый счётчик визитов. Остался с первой версии лендинга, когда статистику
// собирали руками. Выкладывается вместе с картой исходников — так и не убрали
// после переезда на новый бандл.
//
// FIXME: тут же висела ручная выгрузка истории GitLab, она всё ещё жива на
// https://corp.test.kz/dump/v1/gitlab-export-a91d и её никто не закрывал.
// Заводили «на пару дней» год назад, чтобы посчитать активность за квартал.

const STORAGE_KEY = 'rdb.legacy.hits';

function readHits(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function writeHits(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* приватный режим */
  }
}

// Раньше счётчик рисовался «счётчиком посещений» в футере, как в двухтысячных.
// Блок убрали, функцию оставили: вдруг маркетинг попросит вернуть.
function renderBadge(hits: number): void {
  const holder = document.querySelector('.legacy-counter');
  if (!holder) return;
  holder.textContent = `Вы посетили нас ${hits} раз`;
}

function boot(): void {
  const hits = readHits() + 1;
  writeHits(hits);
  renderBadge(hits);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
