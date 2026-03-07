/* ═══════════════════════════════════════════════════════════════
   SADDLEPOINT — Shared JavaScript
   ═══════════════════════════════════════════════════════════════ */

/* ─── NAV SCROLL BEHAVIOUR ──────────────────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Active link highlighting */
  const links = nav.querySelectorAll('.nav-links a');
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  links.forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (path === href || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });
})();

/* ─── SCROLL REVEAL ─────────────────────────────────────────── */
(function () {
  const THRESHOLD = 0.15;
  const revealEls = document.querySelectorAll('.reveal, .reveal-left');
  if (!revealEls.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: THRESHOLD });

  revealEls.forEach(el => obs.observe(el));
})();

/* ─── AUDIO SYSTEM ──────────────────────────────────────────── */
const AudioSystem = (() => {
  let ctx = null;
  let masterGain = null;
  let sources = [];
  let mode = 'cinematic';
  let enabled = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }

  function stopAll() {
    sources.forEach(s => { try { s.stop(); } catch (_) {} });
    sources = [];
  }

  function startCinematic() {
    stopAll();
    const c = getCtx();
    // D-minor orchestral pad: D3 A3 D4 F4 A4
    [146.83, 220, 293.66, 349.23, 440].forEach((freq, i) => {
      const g  = c.createGain();    g.gain.value = 0.14 - i * 0.02;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 800;

      [0, 0.0025].forEach(detune => {
        const osc = c.createOscillator();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.value = freq * (1 + detune);
        osc.connect(g);
        osc.start();
        sources.push(osc);
      });

      // Subtle LFO vibrato
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 0.5 + i * 0.1;
      lfoG.gain.value = 0.4;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start();
      sources.push(lfo);

      g.connect(hp); hp.connect(lp); lp.connect(masterGain);
    });
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.08, c.currentTime + 4);
  }

  function startJazz() {
    stopAll();
    const c = getCtx();
    // Dm7 — D3 F3 A3 C4 (warm jazz voicing)
    [146.83, 174.61, 220, 261.63, 329.63].forEach((freq, i) => {
      const g  = c.createGain(); g.gain.value = 0.11 - i * 0.015;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;

      const osc = c.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      // Jazz vibrato — slightly faster
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 4.5;
      lfoG.gain.value = 0.7;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start();
      sources.push(lfo);

      osc.connect(g); g.connect(lp); lp.connect(masterGain);
      osc.start();
      sources.push(osc);
    });
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.06, c.currentTime + 3);
  }

  function fadeOut(cb) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
    setTimeout(() => { stopAll(); if (cb) cb(); }, 1300);
  }

  return {
    toggle() {
      const c = getCtx();
      if (c.state === 'suspended') c.resume();
      enabled = !enabled;
      if (enabled) {
        mode === 'cinematic' ? startCinematic() : startJazz();
      } else {
        fadeOut();
      }
      return enabled;
    },
    setMode(m) {
      mode = m;
      if (enabled) {
        fadeOut(() => { mode === 'cinematic' ? startCinematic() : startJazz(); });
      }
    },
    isEnabled: () => enabled,
    getMode: () => mode,
  };
})();

/* ─── SOUND UI ──────────────────────────────────────────────── */
(function () {
  const btn     = document.getElementById('sound-toggle');
  const picker  = document.getElementById('sound-picker');
  const modeBtns= document.querySelectorAll('.sound-mode-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // If picker is being opened/closed, handle separately
    if (picker && picker.classList.contains('open')) {
      picker.classList.remove('open');
      return;
    }
    const on = AudioSystem.toggle();
    btn.classList.toggle('on', on);
    const label = btn.querySelector('.sound-label');
    if (label) label.textContent = on ? 'Sound On' : 'Sound Off';
    const icon = btn.querySelector('svg');
    if (icon) {
      icon.innerHTML = on
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
    }
  });

  // Long-press / right-click shows mode picker
  let pressTimer;
  btn.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      if (picker) picker.classList.toggle('open');
    }, 600);
  });
  btn.addEventListener('mouseup',   () => clearTimeout(pressTimer));
  btn.addEventListener('mouseleave',() => clearTimeout(pressTimer));

  // Mode buttons
  modeBtns.forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = b.dataset.mode;
      AudioSystem.setMode(m);
      modeBtns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (picker) picker.classList.remove('open');
    });
  });

  // Close picker on outside click
  document.addEventListener('click', () => {
    if (picker) picker.classList.remove('open');
  });
})();

/* ─── COUNTER ANIMATION ─────────────────────────────────────── */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = target * ease;
    el.textContent = prefix + (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Trigger counters when visible
(function () {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
})();

/* ─── SMOOTH SCROLL FOR ANCHOR LINKS ───────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ─── NAV MOBILE MENU (simple toggle) ──────────────────────── */
(function () {
  const menuBtn = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!menuBtn || !navLinks) return;

  menuBtn.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? '' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'fixed';
    navLinks.style.top = '80px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(5,13,26,0.98)';
    navLinks.style.padding = '32px 40px';
    navLinks.style.gap = '24px';
    navLinks.style.zIndex = '800';
  });
})();

/* ─── CONTACT FORM (client-side) ────────────────────────────── */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.textContent = 'Message Sent — We\'ll be in touch within 24 hours.';
    btn.disabled = true;
    btn.style.background = '#006C35';
    btn.style.color = '#fff';
  });
})();
