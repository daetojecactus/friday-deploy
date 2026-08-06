// Картинки лендинга. Все до одной генерируются кодом: в репозитории стенда нет
// ни одного бинарного файла, и стенд не зависит от интернета — кислотная
// эстетика собирается локально.
//
// Каждая картинка — отдельный HTTP-запрос, и это ровно то, что нужно: два
// десятка строк в Network делают поиск «лишнего» запроса осмысленным.

function emoji(symbol: string, animation: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <text x="50" y="50" font-size="70" text-anchor="middle" dominant-baseline="central">${symbol}
    ${animation}
  </text>
</svg>`;
}

const SPIN = `<animateTransform attributeName="transform" type="rotate"
      from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite" />`;

const PULSE = `<animateTransform attributeName="transform" type="scale"
      values="1;1.25;1" dur="1.2s" repeatCount="indefinite" additive="sum" />`;

const WOBBLE = `<animateTransform attributeName="transform" type="rotate"
      values="-15 50 50;15 50 50;-15 50 50" dur="0.6s" repeatCount="indefinite" />`;

export const PUBLIC_ASSETS: Record<string, string> = {
  'money.svg': emoji('💵', SPIN),
  'moneybag.svg': emoji('💰', WOBBLE),
  'diamond.svg': emoji('💎', PULSE),
  'boom.svg': emoji('💥', PULSE),
  'banana.svg': emoji('🍌', WOBBLE),
  'rocket.svg': emoji('🚀', PULSE),
  'fire.svg': emoji('🔥', WOBBLE),
  'crown.svg': emoji('👑', PULSE),
  'trophy.svg': emoji('🏆', SPIN),
  'star.svg': emoji('⭐', SPIN),
  'party.svg': emoji('🎉', WOBBLE),
  'gift.svg': emoji('🎁', PULSE),
  'gitlab.svg': emoji('🦊', SPIN),
  'telegram.svg': emoji('✈️', WOBBLE),
  'robot.svg': emoji('🤖', PULSE),
  'chart.svg': emoji('📈', WOBBLE),
  'clock.svg': emoji('⏰', SPIN),
  'brain.svg': emoji('🧠', PULSE),
  'zap.svg': emoji('⚡', WOBBLE),
  'medal.svg': emoji('🥇', SPIN),
  'favicon.svg': emoji('🤖', ''),

  'valid.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 31" width="88" height="31">
  <rect width="88" height="31" fill="#0c479d"/>
  <text x="44" y="12" font-family="monospace" font-size="9" fill="#fff" text-anchor="middle">VALID</text>
  <text x="44" y="24" font-family="monospace" font-size="9" fill="#ff0" text-anchor="middle">HTML 4.01</text>
</svg>`,
};

// «Фото нашего дата-центра» с внутреннего хранилища. Живёт на корп-контуре и
// приезжает на публичную страницу фоном — это утечка 3.
export const CORP_SERVER_ROOM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <rect width="640" height="360" fill="#0b1020"/>
  <g fill="#141c33" stroke="#2b3a63">
    <rect x="40" y="60" width="90" height="250"/>
    <rect x="150" y="60" width="90" height="250"/>
    <rect x="260" y="60" width="90" height="250"/>
    <rect x="370" y="60" width="90" height="250"/>
    <rect x="480" y="60" width="90" height="250"/>
  </g>
  <g fill="#39d98a">
    <rect x="50" y="75" width="70" height="6"><animate attributeName="opacity" values="1;0.2;1" dur="1.7s" repeatCount="indefinite"/></rect>
    <rect x="160" y="95" width="70" height="6"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.3s" repeatCount="indefinite"/></rect>
    <rect x="270" y="130" width="70" height="6"><animate attributeName="opacity" values="1;0.2;1" dur="1.1s" repeatCount="indefinite"/></rect>
    <rect x="380" y="170" width="70" height="6"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.9s" repeatCount="indefinite"/></rect>
    <rect x="490" y="210" width="70" height="6"><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></rect>
  </g>
  <text x="320" y="335" font-family="monospace" font-size="16" fill="#4d6291" text-anchor="middle">
    INTERNAL STORAGE · DC-1 · not for public use
  </text>
</svg>`;
