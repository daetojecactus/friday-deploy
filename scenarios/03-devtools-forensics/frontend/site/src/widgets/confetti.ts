// Конфетти по клику куда угодно. Согласовано с отделом маркетинга как
// «интерактивность мирового уровня».

const SHAPES = ['💰', '💎', '🚀', '🔥', '⭐', '🎉', '🤖', '📈'];

type Particle = {
  node: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

const particles: Particle[] = [];
let running = false;

export function mountConfetti(): void {
  document.addEventListener('click', (event) => {
    for (let i = 0; i < 12; i += 1) spawn(event.clientX, event.clientY);
    if (!running) {
      running = true;
      requestAnimationFrame(step);
    }
  });
}

function spawn(x: number, y: number): void {
  const node = document.createElement('span');
  node.textContent = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  node.style.position = 'fixed';
  node.style.zIndex = '3000';
  node.style.pointerEvents = 'none';
  node.style.fontSize = `${14 + Math.random() * 18}px`;
  document.body.appendChild(node);

  particles.push({
    node,
    x,
    y,
    vx: (Math.random() - 0.5) * 8,
    vy: -Math.random() * 8 - 2,
    life: 1,
  });
}

function step(): void {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.vy += 0.35;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.012;

    particle.node.style.left = `${particle.x}px`;
    particle.node.style.top = `${particle.y}px`;
    particle.node.style.opacity = String(Math.max(0, particle.life));

    if (particle.life <= 0 || particle.y > window.innerHeight + 60) {
      particle.node.remove();
      particles.splice(i, 1);
    }
  }

  if (particles.length) {
    requestAnimationFrame(step);
  } else {
    running = false;
  }
}
