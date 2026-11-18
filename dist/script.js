const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const header = document.querySelector('[data-header]');

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      reveal.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));

let scrollTicking = false;
const updateScrollMotion = () => {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 24);
  document.querySelectorAll('.gravity-item').forEach((item) => {
    const rect = item.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - innerHeight / 2;
    const shift = Math.max(-18, Math.min(18, center * -0.035));
    item.style.setProperty('--scroll-shift', `${shift}px`);
  });
  scrollTicking = false;
};

addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(updateScrollMotion);
    scrollTicking = true;
  }
}, { passive: true });

if (!reducedMotion && finePointer) {
  const scene = document.querySelector('[data-gravity-scene]');
  let pointerFrame = 0;
  scene.addEventListener('pointermove', (event) => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const rect = scene.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 14;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 14;
      scene.style.setProperty('--gx', `${x}px`);
      scene.style.setProperty('--gy', `${y}px`);
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', () => {
    scene.style.setProperty('--gx', '0px');
    scene.style.setProperty('--gy', '0px');
  });
}

updateScrollMotion();
