/**
 * Saddlepoint — Shared JS
 * Handles: cursor, audio, nav scroll, active nav, hamburger, GSAP reveals, FAQ, wizard, calc
 */
(function () {
    'use strict';

    /* ─── CURSOR ─── */
    const curEl = document.getElementById('cur');
    const curF  = document.getElementById('cur-f');
    if (curEl && curF) {
        let mx = 0, my = 0, fx = 0, fy = 0;
        document.addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
            curEl.style.left = mx + 'px';
            curEl.style.top  = my + 'px';
        });
        (function tick() {
            fx += (mx - fx) * 0.12;
            fy += (my - fy) * 0.12;
            curF.style.left = fx + 'px';
            curF.style.top  = fy + 'px';
            requestAnimationFrame(tick);
        })();
        document.querySelectorAll('a,button,.sitem,.why-item,.mcard,.pcard,.mega-card,.proj-card,.vcard,.tstat').forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cur-big'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cur-big'));
        });
    }

    /* ─── LOADING SCREEN (home only) ─── */
    const loader = document.getElementById('loader');
    if (loader) {
        const logoEl = document.getElementById('loader-logo');
        if (logoEl) {
            'SADDLEPOINT'.split('').forEach((ch, i) => {
                const span = document.createElement('span');
                span.className = 'loader-logo-char';
                span.textContent = ch;
                span.style.animationDelay = (i * 0.06) + 's';
                logoEl.appendChild(span);
            });
            const dot = document.createElement('span');
            dot.className = 'loader-dot';
            logoEl.appendChild(dot);
        }
        setTimeout(() => {
            loader.classList.add('hidden');
            loader.addEventListener('transitionend', () => {
                loader.style.display = 'none';
                if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            }, { once: true });
        }, 2400);
    }

    /* ─── NAV SCROLL ─── */
    const nav = document.getElementById('nav');
    if (nav) {
        window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 80), { passive: true });
    }

    /* ─── ACTIVE NAV LINK ─── */
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
        const href = a.getAttribute('href').replace(/\/$/, '') || '/';
        if (href === path || (path === '' && href === '/')) {
            a.classList.add('active');
        }
    });

    /* ─── HAMBURGER ─── */
    const ham    = document.getElementById('nav-ham');
    const drawer = document.getElementById('nav-drawer');
    if (ham && drawer) {
        ham.addEventListener('click', () => {
            drawer.classList.toggle('open');
            ham.classList.toggle('active');
        });
        document.addEventListener('click', e => {
            if (nav && !nav.contains(e.target) && !drawer.contains(e.target)) {
                drawer.classList.remove('open');
                ham.classList.remove('active');
            }
        });
        drawer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                drawer.classList.remove('open');
                ham.classList.remove('active');
            });
        });
    }

    /* ─── AMBIENT AUDIO ─── */
    let audioCtx = null, masterGain = null, muted = false;

    function playClickSound() {
        if (!audioCtx || muted) return;
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1046;
        env.gain.setValueAtTime(0.055, audioCtx.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
        osc.connect(env); env.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.07);
    }

    function playNavSound() {
        if (!audioCtx || muted) return;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const env = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = audioCtx.currentTime + i * 0.09;
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.07, t + 0.02);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(env); env.connect(audioCtx.destination);
            osc.start(t); osc.stop(t + 0.3);
        });
    }

    function startAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioCtx.destination);

        /* ── Lush hall reverb (5s exponential decay) ── */
        const irLen = Math.floor(audioCtx.sampleRate * 5.0);
        const irBuf = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = irBuf.getChannelData(ch);
            for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.8);
        }
        const reverb = audioCtx.createConvolver();
        reverb.buffer = irBuf;
        const revGain = audioCtx.createGain();
        revGain.gain.value = 0.58;
        reverb.connect(revGain);
        revGain.connect(masterGain);

        /* ── Warm filter chain ── */
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 55; hp.Q.value = 0.6;
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.45;
        hp.connect(lp);
        lp.connect(masterGain);
        lp.connect(reverb);

        /* ── Dm9 jazz-cinematic pad: D2 F2 A2 C3 E3 ──
           (minor triad + flat-7th + 9th — the classic "hotel lobby jazz" voicing) */
        [
            { freq: 73.42,  vol: 0.20, lfoHz: 0.07  },  // D2  — deep root
            { freq: 87.31,  vol: 0.13, lfoHz: 0.09  },  // F2  — ♭3rd (warm)
            { freq: 110,    vol: 0.14, lfoHz: 0.11  },  // A2  — 5th
            { freq: 130.81, vol: 0.11, lfoHz: 0.08  },  // C3  — ♭7th (jazz)
            { freq: 164.81, vol: 0.09, lfoHz: 0.06  },  // E3  — 9th (dreamy)
            { freq: 220,    vol: 0.05, lfoHz: 0.05  },  // A3  — upper 5th (air)
        ].forEach(({ freq, vol, lfoHz }) => {
            const o1 = audioCtx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
            const o2 = audioCtx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 1.0018;
            // Ultra-slow breath vibrato
            const lfo = audioCtx.createOscillator(); const lfoG = audioCtx.createGain();
            lfo.type = 'sine'; lfo.frequency.value = lfoHz;
            lfoG.gain.value = freq * 0.0012;
            lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency); lfo.start();
            const g = audioCtx.createGain(); g.gain.value = vol;
            o1.connect(g); o2.connect(g); g.connect(hp); o1.start(); o2.start();
        });

        /* ── Cinematic shimmer layer: upper chord tones routed only to reverb ──
           Creates the sense of a large, breathing space */
        [293.66, 349.23, 440, 523.25].forEach((freq, i) => {
            const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
            const lfo = audioCtx.createOscillator(); const lfoG = audioCtx.createGain();
            lfo.frequency.value = 0.04 + i * 0.015; lfoG.gain.value = freq * 0.0008;
            lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start();
            const g = audioCtx.createGain(); g.gain.value = 0.032;
            o.connect(g); g.connect(reverb); // pure reverb tail — no dry signal
            o.start();
        });

        // Gentle 5 s fade-in
        masterGain.gain.linearRampToValueAtTime(0.052, audioCtx.currentTime + 5);
    }

    document.addEventListener('click', () => startAudio(), { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
    document.addEventListener('click', () => { if (audioCtx) playClickSound(); });

    const muteBtn   = document.getElementById('mute-btn');
    const soundIcon = document.getElementById('sound-icon');
    if (muteBtn && soundIcon) {
        const mutedSVG   = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
        const unmutedSVG = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>`;
        muteBtn.addEventListener('click', () => {
            if (!audioCtx) { startAudio(); return; }
            muted = !muted;
            masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.052, audioCtx.currentTime + 0.5);
            soundIcon.innerHTML = muted ? mutedSVG : unmutedSVG;
        });
    }

    /* ─── GSAP SCROLL REVEALS ─── */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Grid elements are handled by their own stagger animations below — skip them here
        const GRID_ELS = '.pcard, .strat-card, .why-item, .sitem, .proj-card, .mcard';
        gsap.utils.toArray('.js-reveal').forEach(el => {
            if (el.matches(GRID_ELS)) return;
            gsap.fromTo(el,
                { y: 52, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.95, ease: 'power3.out',
                  scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } }
            );
        });

        // Grid stagger animations — use fromTo so elements animate TO visible state
        const pGrid = document.querySelector('.profiles-grid');
        if (pGrid) gsap.fromTo('.pcard', { y: 64, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.14, ease: 'power3.out', scrollTrigger: { trigger: pGrid, start: 'top 82%' } });

        const sGrid = document.querySelector('.strat-grid');
        if (sGrid) gsap.fromTo('.strat-card', { y: 64, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: sGrid, start: 'top 82%' } });

        const wGrid = document.querySelector('.why-grid');
        if (wGrid) gsap.fromTo('.why-item', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: wGrid, start: 'top 82%' } });

        const sbar = document.querySelector('.sbar');
        if (sbar) gsap.fromTo('.sitem', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger: sbar, start: 'top 95%' } });

        const projGrid = document.querySelector('.portfolio-grid');
        if (projGrid) gsap.fromTo('.proj-card', { y: 56, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.14, ease: 'power3.out', scrollTrigger: { trigger: projGrid, start: 'top 82%' } });

        const mGrid = document.querySelector('.markets-grid');
        if (mGrid) gsap.fromTo('.mcard', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.18, ease: 'power3.out', scrollTrigger: { trigger: mGrid, start: 'top 82%' } });

        const ctaEl = document.querySelector('.cta');
        if (ctaEl) gsap.to('.cta-wm', { xPercent: -8, ease: 'none', scrollTrigger: { trigger: ctaEl, start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* ─── STAT COUNTERS ─── */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        document.querySelectorAll('[data-target]').forEach(el => {
            const target  = parseFloat(el.dataset.target);
            const prefix  = el.dataset.prefix  || '';
            const suffix  = el.dataset.suffix  || '';
            const decimal = String(target).includes('.');
            ScrollTrigger.create({
                trigger: el, start: 'top 90%',
                onEnter: () => {
                    gsap.to({ v: 0 }, {
                        v: target, duration: 2.2, ease: 'power2.out',
                        onUpdate() { el.textContent = prefix + (decimal ? this.targets()[0].v.toFixed(1) : Math.round(this.targets()[0].v)) + suffix; }
                    });
                }
            });
        });
    }

    /* ─── 3D CARD TILT ─── */
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width  - 0.5;
            const y = (e.clientY - r.top)  / r.height - 0.5;
            card.style.transition = 'none';
            card.style.transform  = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.025)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.55s ease';
            card.style.transform  = 'perspective(900px) rotateY(0) rotateX(0) scale(1)';
        });
    });

    /* ─── MAGNETIC BUTTONS ─── */
    document.querySelectorAll('.btn, .nav-btn').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width  / 2) * 0.3;
            const dy = (e.clientY - r.top  - r.height / 2) * 0.3;
            btn.style.transform = `translate(${dx}px, ${dy}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        });
        btn.addEventListener('mouseenter', () => { btn.style.transition = 'none'; });
    });

    /* ─── SMOOTH ANCHOR SCROLL ─── */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const top = target.getBoundingClientRect().top + scrollY - 80;
            playNavSound();
            window.scrollTo({ top, behavior: 'smooth' });
            if (typeof ScrollTrigger !== 'undefined') {
                setTimeout(() => ScrollTrigger.refresh(), 800);
            }
        });
    });

    /* ─── FAQ ACCORDION ─── */
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item   = btn.closest('.faq-item');
            const answer = item.querySelector('.faq-a');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach(o => {
                o.classList.remove('open');
                o.querySelector('.faq-a').style.maxHeight = '0';
            });
            if (!isOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    /* ─── CONSULTATION WIZARD ─── */
    let wizData = {};
    function wizNext(step) {
        if (step === 1) {
            const t = document.querySelector('input[name="inv-type"]:checked');
            const g = document.querySelector('input[name="inv-goal"]:checked');
            wizData.type = t ? t.value : '—'; wizData.goal = g ? g.value : '—';
        } else if (step === 2) {
            wizData.budget  = document.getElementById('w-budget')?.value  || '—';
            wizData.horizon = document.getElementById('w-horizon')?.value || '—';
            wizData.risk    = document.getElementById('w-risk')?.value    || '—';
        } else if (step === 3) {
            const checked = [...document.querySelectorAll('input[name="prop-type"]:checked')].map(e => e.value);
            const loc = document.querySelector('input[name="location"]:checked');
            wizData.propTypes = checked.length ? checked.join(', ') : '—';
            wizData.location  = loc ? loc.value : '—';
            wizData.notes     = document.getElementById('w-notes')?.value || '—';
        } else if (step === 4) {
            wizData.fname   = document.getElementById('w-fname')?.value   || '—';
            wizData.lname   = document.getElementById('w-lname')?.value   || '—';
            wizData.email   = document.getElementById('w-email')?.value   || '—';
            wizData.phone   = document.getElementById('w-phone')?.value   || '—';
            wizData.country = document.getElementById('w-country')?.value || '—';
            wizData.date    = document.getElementById('w-date')?.value    || '—';
            buildSummary();
        }
        const cur = document.getElementById('ws-' + step);
        const nxt = document.getElementById('ws-' + (step + 1));
        if (cur) cur.classList.remove('active');
        if (nxt) nxt.classList.add('active');
        updateProgress(step + 1);
        const c = document.getElementById('consultation');
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function wizBack(step) {
        const cur = document.getElementById('ws-' + step);
        const prv = document.getElementById('ws-' + (step - 1));
        if (cur) cur.classList.remove('active');
        if (prv) prv.classList.add('active');
        updateProgress(step - 1);
    }
    function updateProgress(active) {
        document.querySelectorAll('.wp-step').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 === active) el.classList.add('active');
            else if (i + 1 < active) el.classList.add('done');
        });
    }
    function buildSummary() {
        const rows = [
            ['Investor Type', wizData.type], ['Goal', wizData.goal],
            ['Budget', wizData.budget], ['Horizon', wizData.horizon], ['Risk', wizData.risk],
            ['Property Types', wizData.propTypes], ['Location', wizData.location],
            ['Name', (wizData.fname || '') + ' ' + (wizData.lname || '')],
            ['Email', wizData.email], ['Phone', wizData.phone],
            ['Country', wizData.country], ['Preferred Date', wizData.date],
        ];
        const el = document.getElementById('wiz-summary');
        if (el) el.innerHTML = rows.map(([k, v]) => `<div class="ws-sum-row"><span>${k}</span><span>${v}</span></div>`).join('');
    }
    function wizSubmit() {
        const s5 = document.getElementById('ws-5');
        const succ = document.getElementById('wiz-success');
        const prog = document.getElementById('wiz-progress');
        if (s5) s5.classList.remove('active');
        if (succ) succ.classList.add('show');
        if (prog) prog.style.display = 'none';
    }
    document.querySelectorAll('.ws-radio').forEach(el => {
        el.addEventListener('click', () => {
            const input  = el.querySelector('input');
            const isMulti = el.dataset.multi === 'true';
            if (!isMulti) {
                document.querySelectorAll(`input[name="${input.name}"]`).forEach(i => i.closest('.ws-radio').classList.remove('selected'));
            }
            if (isMulti) {
                input.checked = !input.checked;
                el.classList.toggle('selected', input.checked);
            } else {
                input.checked = true;
                el.classList.add('selected');
            }
        });
    });
    window.wizNext = wizNext;
    window.wizBack = wizBack;
    window.wizSubmit = wizSubmit;

    /* ─── INVESTMENT CALCULATOR ─── */
    function fmtSAR(n) {
        if (n >= 1e9) return 'SAR ' + (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return 'SAR ' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return 'SAR ' + (n / 1e3).toFixed(0) + 'K';
        return 'SAR ' + Math.round(n);
    }
    function calcUpdate() {
        const inv    = parseFloat(document.getElementById('calc-inv')?.value)    || 1000000;
        const yrs    = parseFloat(document.getElementById('calc-years')?.value)  || 5;
        const growth = parseFloat(document.getElementById('calc-growth')?.value) || 12;
        const yld    = parseFloat(document.getElementById('calc-yield')?.value)  || 7.2;
        const capApp = inv * Math.pow(1 + growth / 100, yrs) - inv;
        const rental = inv * (yld / 100) * yrs;
        const total  = capApp + rental;
        const roi    = (total / inv) * 100;
        const capEl  = document.getElementById('calc-cap');
        const renEl  = document.getElementById('calc-rent');
        const totEl  = document.getElementById('calc-total');
        const roiEl  = document.getElementById('calc-roi');
        if (capEl) capEl.textContent   = fmtSAR(capApp);
        if (renEl) renEl.textContent   = fmtSAR(rental);
        if (totEl) totEl.textContent   = fmtSAR(total);
        if (roiEl) roiEl.textContent   = roi.toFixed(1) + '%';
    }
    ['calc-inv', 'calc-years', 'calc-growth', 'calc-yield'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcUpdate);
    });
    calcUpdate();

    /* ─── INVESTOR PROFILE CARD CLICKS (scroll to #consultation) ─── */
    document.querySelectorAll('.pcard').forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('.pcard-title')?.textContent.trim();
            const typeMap = { 'Foreign Investor': 'Foreign Individual', 'High-Net-Worth Individual': 'Foreign Individual', 'Emerging Investor': 'Foreign Individual' };
            const wizType = typeMap[title];
            if (wizType) {
                const radio = document.querySelector(`input[name="inv-type"][value="${wizType}"]`);
                if (radio) {
                    document.querySelectorAll('input[name="inv-type"]').forEach(r => r.closest('.ws-radio').classList.remove('selected'));
                    radio.checked = true;
                    radio.closest('.ws-radio').classList.add('selected');
                }
            }
            const consult = document.getElementById('consultation');
            if (consult) {
                const top = consult.getBoundingClientRect().top + window.scrollY - 80;
                playNavSound();
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

})();
