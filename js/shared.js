/**
 * Saddlepoint — Shared JS v2
 * Cursor · Audio · Nav · Page Transitions · GSAP Reveals · Charts · Calculator · Wizard · FAQ
 */
(function () {
    'use strict';

    /* ═══════════════════════════════════════════════
       PAGE TRANSITION — unseen.co-style green sweep
       Enter: overlay scaleY 1→0 (top origin, reveal)
       Exit:  overlay scaleY 0→1 (bottom origin, cover)
    ═══════════════════════════════════════════════ */
    // Inject overlay on every page
    const ptEl = document.createElement('div');
    ptEl.id = 'pt';
    document.body.prepend(ptEl);

    function ptEnter() {
        // Overlay starts covering (scaleY=1), then sweeps up to reveal
        gsap.set(ptEl, { scaleY: 1, transformOrigin: 'top center' });
        gsap.to(ptEl, {
            scaleY: 0, duration: 0.85,
            ease: 'expo.inOut',
            delay: 0.05
        });
    }

    function ptExit(href) {
        document.body.classList.add('pt-running');
        gsap.set(ptEl, { scaleY: 0, transformOrigin: 'bottom center' });
        gsap.to(ptEl, {
            scaleY: 1, duration: 0.65,
            ease: 'expo.inOut',
            onComplete: () => { window.location.href = href; }
        });
    }

    // Intercept internal navigation
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        // Skip: anchors, external, mailto, tel, blank target
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') ||
            href.startsWith('http') || link.target === '_blank') return;
        // Skip if same page (exact match)
        const current = window.location.pathname;
        const dest = href.split('#')[0] || '/';
        const destNorm = dest.endsWith('/') ? dest : dest + '/';
        const currNorm = current.endsWith('/') ? current : current + '/';
        if (destNorm === currNorm) {
            // If it has an anchor, let smooth scroll handle
            if (href.includes('#')) return;
        }
        e.preventDefault();
        ptExit(href);
    }, true);

    // Trigger entrance animation on load
    if (typeof gsap !== 'undefined') {
        ptEnter();
    } else {
        document.addEventListener('DOMContentLoaded', ptEnter);
    }

    /* ═══════════════════════════════════════════════
       CUSTOM CURSOR
    ═══════════════════════════════════════════════ */
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
        const bigEls = 'a,button,.sitem,.why-item,.mcard,.pcard,.mega-card,.proj-card,.vcard,.tstat,.mi-tab,.ws-radio,.strat-card,.faq-q,.comp-table tr';
        document.querySelectorAll(bigEls).forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cur-big'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cur-big'));
        });
    }

    /* ═══════════════════════════════════════════════
       LOADING SCREEN (home only)
    ═══════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════
       NAV SCROLL + ACTIVE LINK
    ═══════════════════════════════════════════════ */
    const nav = document.getElementById('nav');
    if (nav) {
        window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 64), { passive: true });
        // Set initial state if already scrolled (back navigation)
        if (scrollY > 64) nav.classList.add('scrolled');
    }
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
        const href = (a.getAttribute('href') || '').split('#')[0];
        const norm = href.endsWith('/') ? href : href + '/';
        const pnorm = path.endsWith('/') ? path : path + '/';
        if (norm === pnorm || (href === '/' && (path === '/' || path === ''))) {
            a.classList.add('active');
        }
    });

    /* ═══════════════════════════════════════════════
       HAMBURGER MENU
    ═══════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════
       AMBIENT AUDIO — Web Audio API Dm9 Pad
    ═══════════════════════════════════════════════ */
    let audioCtx = null, masterGain = null, muted = false;

    function playClickSound() {
        if (!audioCtx || muted) return;
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = 1046;
        env.gain.setValueAtTime(0.055, audioCtx.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
        osc.connect(env); env.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.07);
    }

    function startAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioCtx.destination);

        // Lush hall reverb
        const irLen = Math.floor(audioCtx.sampleRate * 5.0);
        const irBuf = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = irBuf.getChannelData(ch);
            for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.8);
        }
        const reverb = audioCtx.createConvolver(); reverb.buffer = irBuf;
        const revGain = audioCtx.createGain(); revGain.gain.value = 0.58;
        reverb.connect(revGain); revGain.connect(masterGain);

        const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 55; hp.Q.value = 0.6;
        const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 2400; lp.Q.value = 0.45;
        hp.connect(lp); lp.connect(masterGain); lp.connect(reverb);

        // Dm9 voicing: D2 F2 A2 C3 E3 A3
        [
            { freq: 73.42,  vol: 0.20, lfoHz: 0.07 },
            { freq: 87.31,  vol: 0.13, lfoHz: 0.09 },
            { freq: 110,    vol: 0.14, lfoHz: 0.11 },
            { freq: 130.81, vol: 0.11, lfoHz: 0.08 },
            { freq: 164.81, vol: 0.09, lfoHz: 0.06 },
            { freq: 220,    vol: 0.05, lfoHz: 0.05 },
        ].forEach(({ freq, vol, lfoHz }) => {
            const o1 = audioCtx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
            const o2 = audioCtx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 1.0018;
            const lfo = audioCtx.createOscillator(); const lfoG = audioCtx.createGain();
            lfo.type = 'sine'; lfo.frequency.value = lfoHz; lfoG.gain.value = freq * 0.0012;
            lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency); lfo.start();
            const g = audioCtx.createGain(); g.gain.value = vol;
            o1.connect(g); o2.connect(g); g.connect(hp); o1.start(); o2.start();
        });

        [293.66, 349.23, 440, 523.25].forEach((freq, i) => {
            const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
            const lfo = audioCtx.createOscillator(); const lfoG = audioCtx.createGain();
            lfo.frequency.value = 0.04 + i * 0.015; lfoG.gain.value = freq * 0.0008;
            lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start();
            const g = audioCtx.createGain(); g.gain.value = 0.032;
            o.connect(g); g.connect(reverb); o.start();
        });

        masterGain.gain.linearRampToValueAtTime(0.052, audioCtx.currentTime + 5);
    }

    document.addEventListener('click', () => startAudio(), { once: true });
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

    /* ═══════════════════════════════════════════════
       GSAP SCROLL REVEALS
    ═══════════════════════════════════════════════ */
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        gsap.defaults({ ease: 'expo.out' });

        if (prefersReducedMotion) {
            document.querySelectorAll('.js-reveal, .js-reveal-left').forEach(el => {
                gsap.set(el, { opacity: 1, y: 0, x: 0 });
            });
        } else {
            const GRID = '.pcard,.strat-card,.why-item,.sitem,.proj-card,.mcard,.vcard,.proof-item,.step-item,.mega-card,.legal-card';
            document.querySelectorAll('.js-reveal').forEach(el => {
                if (el.matches(GRID)) return;
                gsap.fromTo(el,
                    { y: 32, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out',
                      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' } }
                );
            });

            // Grids — staggered reveals
            const grids = [
                { sel: '.vision-grid', item: '.vcard',     dur: 1.2, stagger: 0.1  },
                { sel: '.profiles-grid', item: '.pcard',   dur: 1.2, stagger: 0.1  },
                { sel: '.strat-grid', item: '.strat-card', dur: 1.1, stagger: 0.09 },
                { sel: '.why-grid',   item: '.why-item',   dur: 0.9, stagger: 0.06 },
                { sel: '.sbar',       item: '.sitem',      dur: 0.75,stagger: 0.07 },
                { sel: '.mega-grid',  item: '.mega-card',  dur: 1.1, stagger: 0.12 },
                { sel: '.markets-grid', item: '.mcard',    dur: 1.2, stagger: 0.14 },
                { sel: '.proof-grid', item: '.proof-item', dur: 1.0, stagger: 0.09 },
                { sel: '.steps-grid', item: '.step-item',  dur: 0.9, stagger: 0.08 },
                { sel: '.legal-grid', item: '.legal-card', dur: 1.0, stagger: 0.09 },
                { sel: '.portfolio-grid', item: '.proj-card', dur: 1.0, stagger: 0.1 },
            ];
            grids.forEach(({ sel, item, dur, stagger }) => {
                const grid = document.querySelector(sel);
                if (!grid) return;
                gsap.fromTo(item,
                    { y: 40, opacity: 0 },
                    { y: 0, opacity: 1, duration: dur, stagger,
                      ease: 'expo.out',
                      scrollTrigger: { trigger: grid, start: 'top 84%' } }
                );
            });

            // CTA watermark parallax
            const ctaEl = document.querySelector('.cta');
            if (ctaEl) gsap.to('.cta-wm', { xPercent: -10, ease: 'none',
                scrollTrigger: { trigger: ctaEl, start: 'top bottom', end: 'bottom top', scrub: 1.2 } });
        }
    }

    /* ═══════════════════════════════════════════════
       STAT COUNTERS
    ═══════════════════════════════════════════════ */
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
                        v: target, duration: 2.4, ease: 'power2.out',
                        onUpdate() {
                            const v = this.targets()[0].v;
                            el.textContent = prefix + (decimal ? v.toFixed(1) : Math.round(v)) + suffix;
                        }
                    });
                }
            });
        });
    }

    /* ═══════════════════════════════════════════════
       3D CARD TILT
    ═══════════════════════════════════════════════ */
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width  - 0.5;
            const y = (e.clientY - r.top)  / r.height - 0.5;
            card.style.transition = 'none';
            card.style.transform  = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.55s ease';
            card.style.transform  = 'perspective(900px) rotateY(0) rotateX(0) scale(1)';
        });
    });

    /* ═══════════════════════════════════════════════
       MAGNETIC BUTTONS
    ═══════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════
       SMOOTH ANCHOR SCROLL
    ═══════════════════════════════════════════════ */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (typeof ScrollTrigger !== 'undefined') setTimeout(() => ScrollTrigger.refresh(), 600);
        });
    });

    /* ═══════════════════════════════════════════════
       FAQ ACCORDION
    ═══════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════
       MARKET INTELLIGENCE TABS
    ═══════════════════════════════════════════════ */
    document.querySelectorAll('.mi-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const city = tab.dataset.city;
            document.querySelectorAll('.mi-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.mi-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('panel-' + city);
            if (panel) panel.classList.add('active');
        });
    });

    /* ═══════════════════════════════════════════════
       CHART.JS — Market Comparison
    ═══════════════════════════════════════════════ */
    function initCharts() {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.color = 'rgba(255,255,255,0.55)';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 12;

        // Yield Comparison Chart
        const yieldCtx = document.getElementById('chart-yield');
        if (yieldCtx) {
            new Chart(yieldCtx, {
                type: 'bar',
                data: {
                    labels: ['Saudi Arabia', 'Dubai', 'Singapore', 'London', 'New York'],
                    datasets: [{
                        label: 'Average Rental Yield (%)',
                        data: [7.2, 5.8, 3.2, 3.5, 4.1],
                        backgroundColor: [
                            'rgba(0,165,80,0.85)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                        ],
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` ${c.raw}% avg. yield` } } },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { callback: v => v + '%' },
                            beginAtZero: true
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Capital Appreciation Chart
        const capCtx = document.getElementById('chart-cap');
        if (capCtx) {
            new Chart(capCtx, {
                type: 'bar',
                data: {
                    labels: ['Saudi Arabia', 'Dubai', 'Singapore', 'London', 'New York'],
                    datasets: [{
                        label: '5-Year Capital Appreciation (%)',
                        data: [42, 28, 22, 18, 24],
                        backgroundColor: [
                            'rgba(0,165,80,0.85)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                            'rgba(0,165,80,0.35)',
                        ],
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` ${c.raw}% over 5 years` } } },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { callback: v => v + '%' },
                            beginAtZero: true
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Price trends line chart
        const trendsCtx = document.getElementById('chart-trends');
        if (trendsCtx) {
            new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
                    datasets: [
                        {
                            label: 'Riyadh (SAR/sqm)',
                            data: [4800, 4950, 5600, 6800, 7600, 8200, 8500],
                            borderColor: 'rgba(0,165,80,1)',
                            backgroundColor: 'rgba(0,165,80,0.08)',
                            tension: 0.4, fill: true,
                            pointBackgroundColor: 'rgba(0,165,80,1)',
                            pointRadius: 4,
                        },
                        {
                            label: 'Jeddah (SAR/sqm)',
                            data: [4100, 4200, 4600, 5400, 6200, 6900, 7200],
                            borderColor: 'rgba(196,169,98,1)',
                            backgroundColor: 'rgba(196,169,98,0.06)',
                            tension: 0.4, fill: true,
                            pointBackgroundColor: 'rgba(196,169,98,1)',
                            pointRadius: 4,
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top',
                            labels: { color: 'rgba(255,255,255,0.65)', padding: 20, boxWidth: 12, borderRadius: 2 } },
                        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: SAR ${c.raw.toLocaleString()}/sqm` } }
                    },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { callback: v => 'SAR ' + v.toLocaleString() },
                        },
                        x: { grid: { color: 'rgba(255,255,255,0.04)' } }
                    }
                }
            });
        }
    }

    // Chart tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const grp = tab.dataset.group;
            document.querySelectorAll(`.chart-tab[data-group="${grp}"]`).forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            document.querySelectorAll(`[data-chartpanel]`).forEach(p => {
                p.style.display = p.dataset.chartpanel === target ? 'block' : 'none';
            });
        });
    });

    // Init charts when visible (intersection observer)
    if (typeof Chart !== 'undefined') {
        initCharts();
    } else {
        // Charts loaded via script tag — will call initCharts when ready
        window.addEventListener('chartjs-ready', initCharts);
    }

    /* ═══════════════════════════════════════════════
       COMPARISON TABLE — Animated bars
    ═══════════════════════════════════════════════ */
    if (typeof IntersectionObserver !== 'undefined') {
        const barObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.querySelectorAll('.comp-bar-fill[data-w]').forEach(bar => {
                    bar.style.width = bar.dataset.w;
                });
                barObs.unobserve(entry.target);
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('.comp-table-wrap').forEach(el => barObs.observe(el));
    }

    /* ═══════════════════════════════════════════════
       INVESTMENT CALCULATOR
    ═══════════════════════════════════════════════ */
    function fmtSAR(n) {
        if (n >= 1e9) return 'SAR ' + (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return 'SAR ' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return 'SAR ' + (n / 1e3).toFixed(0) + 'K';
        return 'SAR ' + Math.round(n);
    }

    function updateRangeGradient(input) {
        const min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
        const pct = ((val - min) / (max - min) * 100).toFixed(1) + '%';
        input.style.setProperty('--pct', pct);
    }

    function calcUpdate() {
        const inv    = parseFloat(document.getElementById('calc-inv')?.value)    || 1000000;
        const yrs    = parseFloat(document.getElementById('calc-years')?.value)  || 5;
        const growth = parseFloat(document.getElementById('calc-growth')?.value) || 12;
        const yld    = parseFloat(document.getElementById('calc-yield')?.value)  || 7.2;

        const capApp = inv * (Math.pow(1 + growth / 100, yrs) - 1);
        const rental = inv * (yld / 100) * yrs;
        const total  = capApp + rental;
        const roi    = (total / inv) * 100;

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('calc-cap',   fmtSAR(capApp));
        setEl('calc-rent',  fmtSAR(rental));
        setEl('calc-total', fmtSAR(total));
        setEl('calc-roi',   roi.toFixed(1) + '%');

        // Update display values
        const invDisp = document.getElementById('calc-inv-display');
        if (invDisp) invDisp.textContent = fmtSAR(inv);
        const yrsDisp = document.getElementById('calc-years-display');
        if (yrsDisp) yrsDisp.textContent = yrs + ' yrs';
        const grwDisp = document.getElementById('calc-growth-display');
        if (grwDisp) grwDisp.textContent = growth + '%';
        const yldDisp = document.getElementById('calc-yield-display');
        if (yldDisp) yldDisp.textContent = yld + '%';

        // ROI ring
        const ring = document.getElementById('calc-roi-ring');
        if (ring) {
            const deg = Math.min(roi / 150 * 360, 360);
            ring.style.background = `conic-gradient(var(--green) ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)`;
        }
    }

    ['calc-inv', 'calc-years', 'calc-growth', 'calc-yield'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { updateRangeGradient(el); calcUpdate(); });
        updateRangeGradient(el);
    });
    calcUpdate();

    /* ═══════════════════════════════════════════════
       CONSULTATION WIZARD
    ═══════════════════════════════════════════════ */
    let wizData = {};
    function wizNext(step) {
        if (step === 1) {
            const t = document.querySelector('input[name="inv-type"]:checked');
            const b = document.querySelector('input[name="inv-budget"]:checked');
            wizData.type = t ? t.value : '—'; wizData.budget = b ? b.value : '—';
        } else if (step === 2) {
            const h = document.querySelector('input[name="inv-horizon"]:checked');
            const g = [...document.querySelectorAll('input[name="inv-goal"]:checked')].map(e => e.value);
            const r = document.querySelector('input[name="inv-risk"]:checked');
            wizData.horizon = h ? h.value : '—';
            wizData.goals   = g.length ? g.join(', ') : '—';
            wizData.risk    = r ? r.value : '—';
        } else if (step === 3) {
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
        updateWizProgress(step + 1);
        const c = document.getElementById('consultation');
        if (c) setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
    function wizBack(step) {
        const cur = document.getElementById('ws-' + step);
        const prv = document.getElementById('ws-' + (step - 1));
        if (cur) cur.classList.remove('active');
        if (prv) prv.classList.add('active');
        updateWizProgress(step - 1);
    }
    function updateWizProgress(active) {
        document.querySelectorAll('.wp-step').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 === active) el.classList.add('active');
            else if (i + 1 < active) el.classList.add('done');
        });
    }
    function buildSummary() {
        const rows = [
            ['Investor Type', wizData.type], ['Budget', wizData.budget],
            ['Investment Horizon', wizData.horizon], ['Goals', wizData.goals], ['Risk Tolerance', wizData.risk],
            ['Name', (wizData.fname || '') + ' ' + (wizData.lname || '')],
            ['Email', wizData.email], ['Phone', wizData.phone],
            ['Country', wizData.country], ['Preferred Date', wizData.date],
        ];
        const el = document.getElementById('wiz-summary');
        if (el) el.innerHTML = rows.map(([k, v]) => `<div class="ws-sum-row"><span>${k}</span><span>${v}</span></div>`).join('');
    }
    function wizSubmit() {
        const s4 = document.getElementById('ws-4');
        const succ = document.getElementById('wiz-success');
        const prog = document.getElementById('wiz-progress');
        if (s4) s4.classList.remove('active');
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
            input.checked = isMulti ? !input.checked : true;
            if (isMulti) el.classList.toggle('selected', input.checked);
            else el.classList.add('selected');
        });
    });

    window.wizNext = wizNext;
    window.wizBack = wizBack;
    window.wizSubmit = wizSubmit;

    /* ═══════════════════════════════════════════════
       PROFILE CARD → CONSULTATION SCROLL
    ═══════════════════════════════════════════════ */
    document.querySelectorAll('.pcard').forEach(card => {
        card.addEventListener('click', () => {
            const consult = document.getElementById('consultation');
            if (consult) consult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* ═══════════════════════════════════════════════
       PAGE HERO TITLE — character-split animation
       Splits inner page titles into animating chars
    ═══════════════════════════════════════════════ */
    const pageHeroTitle = document.querySelector('.page-hero-title');
    if (pageHeroTitle && !prefersReducedMotion) {
        // Split HTML at <br> tags, animate each char independently
        const raw = pageHeroTitle.innerHTML;
        const lines = raw.split(/<br\s*\/?>/i);
        pageHeroTitle.innerHTML = lines.map((line, li) =>
            '<span class="ph-line">' +
            line.trim().split('').map((ch, ci) => {
                if (ch === ' ') return '&nbsp;';
                const delay = (li * 0.18 + ci * 0.038).toFixed(3);
                return `<span class="char" style="animation-delay:${delay}s">${ch}</span>`;
            }).join('') +
            '</span>'
        ).join('');
    }

    /* ═══════════════════════════════════════════════
       PAGE HERO PARALLAX — subtle depth on scroll
    ═══════════════════════════════════════════════ */
    const pageHeroBg = document.querySelector('.page-hero-bg');
    if (pageHeroBg && !prefersReducedMotion) {
        const heroEl = pageHeroBg.parentElement;
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            if (scrolled < heroEl.offsetHeight * 1.2) {
                pageHeroBg.style.transform = `translateY(${scrolled * 0.28}px)`;
            }
        }, { passive: true });
    }

    /* ═══════════════════════════════════════════════
       INNER PAGE EXTRA STAGGER GRIDS
    ═══════════════════════════════════════════════ */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {

        // Market Intelligence panels
        const miGrid = document.querySelector('.mi-panel-grid');
        if (miGrid) {
            gsap.fromTo(miGrid.querySelectorAll('div'),
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'expo.out',
                  scrollTrigger: { trigger: miGrid, start: 'top 88%' } }
            );
        }

        // Highlights list
        document.querySelectorAll('.mi-highlight-item').forEach((el, i) => {
            gsap.fromTo(el,
                { x: -20, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out', delay: i * 0.06,
                  scrollTrigger: { trigger: el.closest('.mi-highlights'), start: 'top 88%' } }
            );
        });

        // Timeline nodes — respect active/inactive dimming
        const timelineTrack = document.querySelector('.timeline-track');
        if (timelineTrack) {
            timelineTrack.querySelectorAll('.t-node').forEach((node, i) => {
                const finalOpacity = node.classList.contains('active') ? 1 : 0.35;
                gsap.fromTo(node,
                    { y: 28, opacity: 0 },
                    { y: 0, opacity: finalOpacity, duration: 0.7, delay: i * 0.07, ease: 'expo.out',
                      scrollTrigger: { trigger: timelineTrack, start: 'top 85%' } }
                );
            });
        }

        // Strategy detail sections — slide in alternating directions
        document.querySelectorAll('.strat-detail-grid').forEach(grid => {
            const isRev = grid.classList.contains('rev');
            const children = [...grid.children];
            children.forEach((child, i) => {
                const fromX = isRev ? (i === 0 ? 40 : -40) : (i === 0 ? -40 : 40);
                gsap.fromTo(child,
                    { x: fromX, opacity: 0 },
                    { x: 0, opacity: 1, duration: 1.1, ease: 'expo.out', delay: i * 0.12,
                      scrollTrigger: { trigger: grid, start: 'top 85%' } }
                );
            });
        });

        // Project hero grids on mega-projects page
        document.querySelectorAll('.proj-hero-grid').forEach(grid => {
            const isRev = grid.classList.contains('rev');
            const children = [...grid.children];
            children.forEach((child, i) => {
                const fromX = isRev ? (i === 0 ? 40 : -40) : (i === 0 ? -40 : 40);
                gsap.fromTo(child,
                    { x: fromX, opacity: 0 },
                    { x: 0, opacity: 1, duration: 1.1, ease: 'expo.out', delay: i * 0.1,
                      scrollTrigger: { trigger: grid, start: 'top 85%' } }
                );
            });
        });

        // Sub-project grids
        document.querySelectorAll('.sub-projects').forEach(grid => {
            gsap.fromTo(grid.querySelectorAll('.sub-project'),
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, stagger: 0.09, ease: 'expo.out',
                  scrollTrigger: { trigger: grid, start: 'top 88%' } }
            );
        });

        // Strategy detail visual panels
        document.querySelectorAll('.strat-detail-visual').forEach(el => {
            gsap.fromTo(el,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.0, ease: 'expo.out',
                  scrollTrigger: { trigger: el, start: 'top 87%' } }
            );
        });

        // KPI rows
        document.querySelectorAll('.proj-kpi-row, .strat-kpi-row').forEach(row => {
            gsap.fromTo(row.querySelectorAll('.proj-kpi, .strat-kpi'),
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: 'expo.out',
                  scrollTrigger: { trigger: row, start: 'top 90%' } }
            );
        });

        // Additional project cards on mega-projects
        const addlGrid = document.querySelector('.additional-grid');
        if (addlGrid) {
            gsap.fromTo(addlGrid.querySelectorAll('[style*="background:#1c1c1c"]'),
                { y: 32, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, ease: 'expo.out',
                  scrollTrigger: { trigger: addlGrid, start: 'top 85%' } }
            );
        }

        // Vision cards additional stagger (supplement existing)
        document.querySelectorAll('.vcard-stat').forEach((el, i) => {
            gsap.fromTo(el,
                { scaleX: 0, opacity: 0 },
                { scaleX: 1, opacity: 1, duration: 0.6, ease: 'expo.out', transformOrigin: 'left',
                  scrollTrigger: { trigger: el, start: 'top 90%' } }
            );
        });

        // FAQ items
        document.querySelectorAll('.faq-item').forEach((el, i) => {
            gsap.fromTo(el,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.65, ease: 'expo.out', delay: i * 0.05,
                  scrollTrigger: { trigger: el.closest('.faq-list') || el, start: 'top 88%' } }
            );
        });

        // Comparison table
        const compTable = document.querySelector('.comp-table-wrap');
        if (compTable) {
            gsap.fromTo(compTable,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.0, ease: 'expo.out',
                  scrollTrigger: { trigger: compTable, start: 'top 88%' } }
            );
        }
    }

})();
