const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const mobileViewport = matchMedia('(max-width: 760px)');
const header = document.querySelector('[data-header]');
const mobileGravityMedia = [...document.querySelectorAll('.promotion-banner > img, .carousel-slide img, .brand-photo video, .location-visual img')];

document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
  link.href = 'https://bio.site/vistoaeroboy';
  link.setAttribute('aria-label', 'Escolher uma unidade Aeroboy para atendimento');
});

document.querySelectorAll('[data-year]').forEach((item) => {
  item.textContent = new Date().getFullYear();
});

const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      reveal.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
  reveal.observe(element);
});

let scrollTicking = false;
const updateScrollMotion = () => {
  const y = window.scrollY;
  header?.classList.toggle('scrolled', y > 24);

  if (!reducedMotion) {
    const gravityLimit = mobileViewport.matches ? 24 : 34;
    document.querySelectorAll('.gravity-item').forEach((item) => {
      const rect = item.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - innerHeight / 2;
      const shift = Math.max(-gravityLimit, Math.min(gravityLimit, center * -0.05));
      item.style.setProperty('--scroll-shift', `${shift}px`);
    });

    document.querySelectorAll('.motion-layer').forEach((layer) => {
      const rect = layer.parentElement.getBoundingClientRect();
      const speed = Number(layer.dataset.motionSpeed || 0.04);
      const center = rect.top + rect.height / 2 - innerHeight / 2;
      const limit = mobileViewport.matches ? 38 : 78;
      const shift = Math.max(-limit, Math.min(limit, center * speed));
      layer.style.setProperty('--motion-y', `${shift}px`);
    });

    if (mobileViewport.matches) {
      mobileGravityMedia.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > innerHeight + 120) return;
        const center = rect.top + rect.height / 2 - innerHeight / 2;
        const strength = index % 2 === 0 ? -0.035 : -0.025;
        const shift = Math.max(-16, Math.min(16, center * strength));
        item.style.setProperty('--mobile-gravity-y', `${shift}px`);
      });
    }
  }
  scrollTicking = false;
};

addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(updateScrollMotion);
    scrollTicking = true;
  }
}, { passive: true });

if (!reducedMotion && finePointer) {
  document.querySelectorAll('[data-gravity-scene]').forEach((scene) => {
    let pointerFrame = 0;
    scene.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = scene.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 18;
        const y = ((event.clientY - rect.top) / rect.height - .5) * 18;
        scene.style.setProperty('--gx', `${x}px`);
        scene.style.setProperty('--gy', `${y}px`);
      });
    }, { passive: true });
    scene.addEventListener('pointerleave', () => {
      scene.style.setProperty('--gx', '0px');
      scene.style.setProperty('--gy', '0px');
    });
  });

  document.querySelectorAll('.tilt-card, .product-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const rx = ((event.clientY - rect.top) / rect.height - .5) * -5;
      const ry = ((event.clientX - rect.left) / rect.width - .5) * 5;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * .12;
      const y = (event.clientY - rect.top - rect.height / 2) * .12;
      button.style.transform = `translate3d(${x}px,${y}px,0)`;
    }, { passive: true });
    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

const filterButtons = document.querySelectorAll('[data-catalog-filter]');
const catalogItems = document.querySelectorAll('[data-catalog-item]');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.catalogFilter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    catalogItems.forEach((item) => {
      const visible = filter === 'todos' || item.dataset.catalogItem === filter;
      item.classList.toggle('is-filtered', !visible);
      if (visible) item.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  });
});

const dialog = document.querySelector('[data-product-dialog]');
if (dialog) {
  const dialogImage = dialog.querySelector('[data-dialog-image]');
  const dialogName = dialog.querySelector('[data-dialog-name]');
  const dialogDescription = dialog.querySelector('[data-dialog-description]');
  const dialogWhatsApp = dialog.querySelector('[data-dialog-whatsapp]');
  document.querySelectorAll('[data-product-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const product = button.closest('[data-product-name]');
      dialogImage.src = product.dataset.productImage;
      dialogImage.alt = product.dataset.productName;
      dialogName.textContent = product.dataset.productName;
      dialogDescription.textContent = product.dataset.productDescription;
      dialogWhatsApp.href = 'https://bio.site/vistoaeroboy';
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('[data-carousel-track]');
  const slides = [...track.querySelectorAll('.carousel-slide')];
  const progress = carousel.querySelector('[data-carousel-progress]');
  const step = () => (slides[0]?.getBoundingClientRect().width || track.clientWidth) + 16;
  const updateProgress = () => {
    const max = Math.max(1, track.scrollWidth - track.clientWidth);
    const ratio = Math.min(1, track.scrollLeft / max);
    progress.style.transform = `translateX(${ratio * 300}%)`;
  };
  carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });
  let carouselTimer;
  const stopAutoplay = () => clearInterval(carouselTimer);
  const startAutoplay = () => {
    stopAutoplay();
    if (reducedMotion) return;
    carouselTimer = setInterval(() => {
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 12;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step(), behavior: 'smooth' });
    }, 4200);
  };
  carousel.addEventListener('pointerenter', stopAutoplay);
  carousel.addEventListener('pointerleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);
  carousel.addEventListener('touchstart', stopAutoplay, { passive: true });
  carousel.addEventListener('touchend', startAutoplay, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stopAutoplay() : startAutoplay());
  updateProgress();
  startAutoplay();
});

document.querySelectorAll('[data-promo-carousel]').forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('[data-promo-slide]')];
  const dotsRoot = carousel.querySelector('[data-promo-dots]');
  let activeIndex = 0;
  let autoplay;
  let touchStartX = 0;

  const dots = slides.map((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `promo-dot${index === 0 ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `Abrir campanha ${index + 1}`);
    dot.addEventListener('click', () => showSlide(index, 1));
    dotsRoot.append(dot);
    return dot;
  });

  const showSlide = (nextIndex, direction = 1) => {
    const normalized = (nextIndex + slides.length) % slides.length;
    if (normalized === activeIndex) return;
    const previous = slides[activeIndex];
    previous.classList.remove('is-active');
    previous.classList.add('is-leaving');
    previous.style.setProperty('--promo-direction', direction);
    slides[normalized].classList.remove('is-leaving');
    slides[normalized].classList.add('is-active');
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === normalized));
    activeIndex = normalized;
    setTimeout(() => previous.classList.remove('is-leaving'), 800);
  };

  const stop = () => clearInterval(autoplay);
  const start = () => {
    stop();
    if (!reducedMotion) autoplay = setInterval(() => showSlide(activeIndex + 1, 1), 5600);
  };

  carousel.querySelector('[data-promo-prev]')?.addEventListener('click', () => {
    showSlide(activeIndex - 1, -1);
    start();
  });
  carousel.querySelector('[data-promo-next]')?.addEventListener('click', () => {
    showSlide(activeIndex + 1, 1);
    start();
  });
  carousel.addEventListener('pointerenter', stop);
  carousel.addEventListener('pointerleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
  carousel.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0]?.clientX || 0;
    stop();
  }, { passive: true });
  carousel.addEventListener('touchend', (event) => {
    const delta = (event.changedTouches[0]?.clientX || touchStartX) - touchStartX;
    if (Math.abs(delta) > 45) showSlide(activeIndex + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
    start();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
});

const mediaObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    if (entry.isIntersecting && !document.hidden) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { rootMargin: '120px 0px', threshold: 0.01 });

document.querySelectorAll('video').forEach((video) => mediaObserver.observe(video));

updateScrollMotion();
