/* ==========================================================================
   Homepage interactions: hero scroll/cursor, collection story, category
   panels, horizontal gallery, shop the look, worn-your-way parallax.
   All scroll work is rAF-throttled and disabled under reduced motion.
   ========================================================================== */
(() => {
  'use strict';
  const T = window.theme || { settings: {} };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = () => window.matchMedia('(min-width: 990px)').matches;
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Shared scroll loop: registered callbacks run once per frame */
  const scrollFns = new Set();
  let ticking = false;
  const tick = () => { ticking = false; scrollFns.forEach(fn => fn()); };
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);

  /* ---------- Hero ------------------------------------------------------ */
  const initHero = (hero) => {
    if (reduced) return;
    const media = hero.querySelector('[data-hero-media]');
    const update = () => {
      const p = clamp(window.scrollY / (window.innerHeight * 0.85), 0, 1);
      hero.style.setProperty('--p', p.toFixed(3));
    };
    scrollFns.add(update); update();
    if (hero.dataset.parallax === 'true' && finePointer && media) {
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      const loop = () => {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        hero.style.setProperty('--mx', cx.toFixed(2) + 'px');
        hero.style.setProperty('--my', cy.toFixed(2) + 'px');
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
        ty = ((e.clientY - r.top) / r.height - 0.5) * -12;
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    }
  };
  $$('[data-hero]').forEach(initHero);

  /* ---------- Collection story ----------------------------------------- */
  const initStory = (story) => {
    const chapters = $$('[data-story-chapter]', story);
    const statements = $$('[data-story-statement]', story);
    const dots = $$('[data-story-dot]', story);
    if (!chapters.length || !('IntersectionObserver' in window)) return;
    const activate = (i) => {
      statements.forEach((s, j) => { s.classList.toggle('is-active', i === j); s.setAttribute('aria-hidden', i === j ? 'false' : 'true'); });
      dots.forEach((d, j) => d.classList.toggle('is-active', i === j));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) activate(Number(e.target.dataset.storyChapter)); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    chapters.forEach(c => io.observe(c));
  };
  $$('[data-story]').forEach(initStory);

  /* ---------- Category panels ------------------------------------------ */
  const initPanels = (wrap) => {
    const panels = $$('[data-panel]', wrap);
    const setActive = (p) => panels.forEach(x => x.classList.toggle('is-active', x === p));
    panels.forEach(p => {
      p.addEventListener('pointerenter', () => { if (desktop()) setActive(p); });
      p.addEventListener('focus', () => { if (desktop()) setActive(p); });
      /* On touch, first tap expands; second tap follows the link */
      p.addEventListener('click', (e) => {
        if (desktop() && !finePointer && !p.classList.contains('is-active')) { e.preventDefault(); setActive(p); }
      });
    });
  };
  $$('[data-panels]').forEach(initPanels);

  /* ---------- Horizontal gallery --------------------------------------- */
  const initHgal = (hgal) => {
    const track = hgal.querySelector('[data-hgal-track]');
    const viewport = hgal.querySelector('[data-hgal-viewport]');
    const progress = hgal.querySelector('[data-hgal-progress]');
    if (!track) return;
    let mode = null;
    const update = () => {
      if (mode !== 'scroll') return;
      const rect = hgal.getBoundingClientRect();
      const total = hgal.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / total, 0, 1);
      const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
      hgal.style.setProperty('--x', (-(max * p)).toFixed(1) + 'px');
      if (progress) progress.style.width = (p * 100).toFixed(1) + '%';
    };
    const setMode = () => {
      const next = (desktop() && !reduced && finePointer) ? 'scroll' : 'swipe';
      if (next === mode) return;
      mode = next;
      if (mode === 'scroll') { hgal.setAttribute('data-mode', 'scroll'); }
      else { hgal.removeAttribute('data-mode'); hgal.style.removeProperty('--x'); }
      update();
    };
    scrollFns.add(update);
    window.addEventListener('resize', setMode);
    if (viewport && progress) viewport.addEventListener('scroll', () => {
      if (mode === 'swipe') progress.style.width = ((viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth)) * 100).toFixed(1) + '%';
    }, { passive: true });
    setMode();
  };
  $$('[data-hgal]').forEach(initHgal);

  /* ---------- Bestsellers proxy arrows --------------------------------- */
  document.addEventListener('click', (e) => {
    const prev = e.target.closest('[data-carousel-prev-proxy]');
    const next = e.target.closest('[data-carousel-next-proxy]');
    if (!prev && !next) return;
    const section = (prev || next).closest('.shopify-section') || document;
    const carousel = section.querySelector('drag-carousel');
    if (carousel && carousel.step) carousel.step(prev ? -1 : 1);
  });

  /* ---------- Shop the look -------------------------------------------- */
  class ShopTheLook extends HTMLElement {
    connectedCallback() {
      this.hotspots = $$('[data-hotspot]', this);
      this.items = $$('[data-look-item]', this);
      this.total = this.querySelector('[data-look-total]');
      this.hotspots.forEach(h => {
        h.addEventListener('click', () => this.activate(Number(h.dataset.hotspot), true));
        if (finePointer) h.addEventListener('pointerenter', () => this.activate(Number(h.dataset.hotspot), false));
      });
      this.items.forEach(item => {
        item.addEventListener('pointerenter', () => this.activate(Number(item.dataset.lookItem), false));
        const select = item.querySelector('select[data-look-variant]');
        if (select) select.addEventListener('change', () => this.updateTotal());
        const add = item.querySelector('[data-look-add]');
        if (add) add.addEventListener('click', async () => {
          const id = this.variantId(item);
          if (!id) return;
          add.classList.add('is-loading'); add.disabled = true;
          try { await T.cart.add({ id, quantity: 1 }); } catch (err) { T.toast(err.message); }
          finally { add.classList.remove('is-loading'); add.disabled = false; }
        });
      });
      const all = this.querySelector('[data-look-add-all]');
      if (all) all.addEventListener('click', async () => {
        const items = this.items.map(i => this.variantId(i)).filter(Boolean).map(id => ({ id, quantity: 1 }));
        if (!items.length) return;
        all.classList.add('is-loading'); all.disabled = true;
        try { await T.cart.add(items); T.toast(T.strings.lookAdded); } catch (err) { T.toast(err.message); }
        finally { all.classList.remove('is-loading'); all.disabled = false; }
      });
      this.updateTotal();
    }
    variantId(item) {
      const field = item.querySelector('[data-look-variant]');
      if (!field) return null;
      if (field.tagName === 'SELECT') { const opt = field.selectedOptions[0]; return opt && !opt.disabled ? Number(opt.value) : null; }
      return Number(field.value);
    }
    updateTotal() {
      if (!this.total || !T.formatMoney) return;
      let sum = 0, any = false;
      this.items.forEach(item => {
        const field = item.querySelector('[data-look-variant]');
        if (!field) return;
        const price = field.tagName === 'SELECT' ? Number(field.selectedOptions[0]?.dataset.price || 0) : Number(field.dataset.price || 0);
        sum += price; any = true;
      });
      if (any) this.total.textContent = T.formatMoney(sum);
    }
    activate(i, scroll) {
      this.hotspots.forEach(h => h.classList.toggle('is-active', Number(h.dataset.hotspot) === i));
      this.items.forEach(item => item.classList.toggle('is-active', Number(item.dataset.lookItem) === i));
      const target = this.items[i];
      if (scroll && target) {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
        const focusable = target.querySelector('select, button, a');
        if (!desktop() && focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 400);
      }
    }
  }
  if (!customElements.get('shop-the-look')) customElements.define('shop-the-look', ShopTheLook);

  /* ---------- Worn your way parallax ----------------------------------- */
  const initWorn = (wrap) => {
    if (reduced || !desktop()) return;
    const tiles = $$('[data-parallax-speed]', wrap);
    const speeds = [0.04, -0.06, 0.09];
    const update = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      tiles.forEach(t => {
        const s = speeds[Number(t.dataset.parallaxSpeed) % speeds.length];
        t.style.transform = `translate3d(0, ${(center * s).toFixed(1)}px, 0)`;
      });
    };
    scrollFns.add(update); update();
  };
  $$('[data-worn]').forEach(initWorn);

  /* Theme editor: re-init when sections load */
  document.addEventListener('shopify:section:load', (e) => {
    $$('[data-hero]', e.target).forEach(initHero);
    $$('[data-story]', e.target).forEach(initStory);
    $$('[data-panels]', e.target).forEach(initPanels);
    $$('[data-hgal]', e.target).forEach(initHgal);
    $$('[data-worn]', e.target).forEach(initWorn);
  });
})();
