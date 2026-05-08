// ── Navbar scroll glass effect ───────────────────────────────────────────
const navbar = document.getElementById('navbar') as HTMLElement;
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Scroll-triggered reveal ──────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const delay = parseFloat(el.dataset.delay ?? '0');
        setTimeout(() => el.classList.add('visible'), delay);
        revealObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => {
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.querySelectorAll(':scope > .reveal'));
    const idx = siblings.indexOf(el as HTMLElement);
    if (idx > 0) {
      (el as HTMLElement).dataset.delay = String(idx * 80);
    }
  }
  revealObserver.observe(el);
});

// ── Drag-to-scroll phone showcase ────────────────────────────────────────
const track = document.querySelector<HTMLElement>('.phones-track');
if (track) {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  track.addEventListener('mousedown', (e) => {
    isDragging = true;
    track.classList.add('grabbing');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    track.classList.remove('grabbing');
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 1.2;
  });

  // Touch support
  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX);
  }, { passive: true });
}

// ── Animated particle/rope canvas in hero ────────────────────────────────
const canvas = document.getElementById('ropeCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let particles: Particle[] = [];
let W = 0;
let H = 0;
let raf = 0;

function resize(): void {
  W = canvas.width = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
  initParticles();
}

function initParticles(): void {
  particles = [];
  const count = 55;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    });
  }
}

function draw(): void {
  ctx.clearRect(0, 0, W, H);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;
  }

  const maxDist = 150;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.4;
        const t = i / particles.length;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = t < 0.55
          ? `rgba(52, 211, 207, ${alpha})`
          : `rgba(255, 46, 99, ${alpha * 0.65})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  raf = requestAnimationFrame(draw);
}

const ro = new ResizeObserver(() => resize());
ro.observe(canvas);
resize();
draw();

// Pause when hero is off-screen
const heroEl = document.getElementById('hero');
if (heroEl) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!raf) draw();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }, { threshold: 0 }).observe(heroEl);
}

// ── Smooth scroll for anchor links ──────────────────────────────────────
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
