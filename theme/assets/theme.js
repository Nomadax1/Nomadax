/* ==========================================================================
   SOLENNE EDITORIAL — theme.js
   Global behaviour: header, mega menu, drawers, search, cart, wishlist,
   reveals, custom cursor, page transitions, drag carousel. No dependencies.
   ========================================================================== */
(() => {
  'use strict';

  const T = window.theme || {};
  const doc = document;
  const html = doc.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Utilities -------------------------------------------------- */
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const debounce = (fn, wait = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const formatMoney = (cents, format = T.moneyFormat || '€{{amount}}') => {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format;
    const formatWithDelimiters = (number, precision = 2, thousands = ',', decimal = '.') => {
      if (isNaN(number) || number == null) return '0';
      number = (number / 100.0).toFixed(precision);
      const parts = number.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    };
    const match = formatString.match(placeholderRegex);
    const key = match ? match[1] : 'amount';
    switch (key) {
      case 'amount': value = formatWithDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = formatWithDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = formatWithDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = formatWithDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = formatWithDelimiters(cents, 2, "'", '.'); break;
      case 'amount_no_decimals_with_space_separator': value = formatWithDelimiters(cents, 0, ' ', ''); break;
      case 'amount_with_space_separator': value = formatWithDelimiters(cents, 2, ' ', ','); break;
      default: value = formatWithDelimiters(cents, 2);
    }
    return formatString.replace(placeholderRegex, value);
  };

  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ } }
  };

  let toastTimer;
  const toast = (msg) => {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  };

  /* Focus trap + scroll lock shared by drawers, overlays and dialogs */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const trapFocus = (container) => {
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = $$(FOCUSABLE, container).filter(n => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  };
  let lockCount = 0;
  const lockScroll = (lock) => {
    lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
    html.classList.toggle('is-locked', lockCount > 0);
  };

  /* ---------- Layer manager (drawers / overlays) ------------------------- */
  const scrim = $('[data-scrim]');
  const layers = {
    current: null,
    release: null,
    lastFocus: null,
    open(el, { withScrim = true } = {}) {
      if (!el) return;
      if (this.current && this.current !== el) this.close(true);
      this.lastFocus = doc.activeElement;
      el.classList.add('is-open');
      if (withScrim && scrim) scrim.classList.add('is-open');
      lockScroll(true);
      this.current = el;
      this.release = trapFocus(el);
      $$(`[aria-controls="${el.id}"]`).forEach(b => b.setAttribute('aria-expanded', 'true'));
      const target = el.querySelector('[data-autofocus]') || el.querySelector(FOCUSABLE) || el;
      setTimeout(() => target.focus({ preventScroll: true }), 60);
      el.dispatchEvent(new CustomEvent('layer:open'));
    },
    close(silent) {
      const el = this.current;
      if (!el) return;
      el.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-open');
      lockScroll(false);
      if (this.release) this.release();
      $$(`[aria-controls="${el.id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
      this.current = null;
      if (!silent && this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
      el.dispatchEvent(new CustomEvent('layer:close'));
    }
  };
  on(scrim, 'click', () => layers.close());
  on(doc, 'keydown', (e) => { if (e.key === 'Escape') { layers.close(); closeMega(); } });
  on(doc, 'click', (e) => {
    const opener = e.target.closest('[data-open-drawer]');
    if (opener) { e.preventDefault(); layers.open(doc.getElementById(opener.dataset.openDrawer)); return; }
    if (e.target.closest('[data-drawer-close]')) { e.preventDefault(); layers.close(); return; }
  });

  /* ---------- Header ----------------------------------------------------- */
  const header = $('[data-header]');
  let lastY = window.scrollY;
  const onScroll = () => {
    if (!header) return;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (header.dataset.hideOnScroll === 'true') {
      header.classList.toggle('is-hidden', y > lastY && y > 320 && !header.classList.contains('is-menu-open'));
    }
    lastY = y;
  };
  on(window, 'scroll', onScroll, { passive: true });
  onScroll();

  /* Mega menu: hover intent on desktop, click/keyboard everywhere */
  let megaTimer;
  const closeMega = () => {
    $$('[data-mega].is-open').forEach(item => {
      item.classList.remove('is-open');
      const btn = $('[data-mega-toggle]', item);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    header && header.classList.remove('is-menu-open');
  };
  const openMega = (item) => {
    closeMega();
    item.classList.add('is-open');
    const btn = $('[data-mega-toggle]', item);
    if (btn) btn.setAttribute('aria-expanded', 'true');
    header && header.classList.add('is-menu-open');
  };
  $$('[data-mega]').forEach(item => {
    const btn = $('[data-mega-toggle]', item);
    on(btn, 'click', () => item.classList.contains('is-open') ? closeMega() : openMega(item));
    if (finePointer.matches) {
      on(item, 'pointerenter', () => { clearTimeout(megaTimer); megaTimer = setTimeout(() => openMega(item), 90); });
      on(item, 'pointerleave', () => { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 160); });
    }
    on(item, 'focusout', (e) => { if (!item.contains(e.relatedTarget)) closeMega(); });
  });
  on(doc, 'click', (e) => { if (!e.target.closest('[data-mega]') && !e.target.closest('[data-mega-toggle]')) closeMega(); });

  /* ---------- Search overlay -------------------------------------------- */
  const searchOverlay = $('[data-search-overlay]');
  const searchInput = $('[data-search-input]');
  const RECENT_KEY = 'solenne:recent-searches';
  const renderRecent = () => {
    const wrap = $('[data-search-recent]'), list = $('[data-search-recent-list]');
    if (!wrap || !list) return;
    const items = storage.get(RECENT_KEY, []);
    wrap.hidden = items.length === 0;
    list.innerHTML = items.map(t => `<button type="button" data-search-term="${t.replace(/"/g, '&quot;')}">${t}</button>`).join('');
  };
  const pushRecent = (term) => {
    term = term.trim();
    if (!term) return;
    const items = storage.get(RECENT_KEY, []).filter(t => t.toLowerCase() !== term.toLowerCase());
    items.unshift(term);
    storage.set(RECENT_KEY, items.slice(0, 6));
  };
  const openSearch = () => {
    if (!searchOverlay) return;
    layers.open(searchOverlay, { withScrim: false });
    renderRecent();
    setTimeout(() => searchInput && searchInput.focus(), 80);
  };
  on(doc, 'click', (e) => {
    if (e.target.closest('[data-open-search]')) { e.preventDefault(); openSearch(); }
    if (e.target.closest('[data-search-close]')) { e.preventDefault(); layers.close(); }
    const term = e.target.closest('[data-search-term]');
    if (term && searchInput) { searchInput.value = term.dataset.searchTerm; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); }
    if (e.target.closest('[data-search-clear-recent]')) { storage.set(RECENT_KEY, []); renderRecent(); }
    if (e.target.closest('[data-search-clear]') && searchInput) { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); }
  });
  on(doc, 'keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(doc.activeElement.tagName) && !doc.activeElement.isContentEditable) { e.preventDefault(); openSearch(); }
  });

  class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('[data-search-input]');
      this.results = this.querySelector('[data-search-results]');
      this.defaults = this.querySelector('[data-search-default]');
      this.clearBtn = this.querySelector('[data-search-clear]');
      this.form = this.querySelector('form');
      this.controller = null;
      this.cache = new Map();
      this.input.addEventListener('input', debounce(() => this.onInput(), 180));
      this.form.addEventListener('submit', () => pushRecent(this.input.value));
    }
    onInput() {
      const q = this.input.value.trim();
      if (this.clearBtn) this.clearBtn.hidden = q.length === 0;
      if (q.length < 2) { this.results.innerHTML = ''; this.defaults.hidden = false; this.input.setAttribute('aria-expanded', 'false'); return; }
      this.fetch(q);
    }
    async fetch(q) {
      if (this.controller) this.controller.abort();
      this.controller = new AbortController();
      if (this.cache.has(q)) { this.render(this.cache.get(q)); return; }
      const url = `${T.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product,collection,query&resources[limit]=6&resources[limit_scope]=each&resources[options][unavailable_products]=last&resources[options][fields]=title,product_type,variants.title,vendor,tag&section_id=predictive-search`;
      try {
        const res = await fetch(url, { signal: this.controller.signal });
        const text = await res.text();
        const markup = new DOMParser().parseFromString(text, 'text/html').querySelector('[data-predictive-payload]');
        const htmlOut = markup ? markup.outerHTML : '';
        this.cache.set(q, htmlOut);
        this.render(htmlOut);
      } catch (e) { if (e.name !== 'AbortError') console.warn(e); }
    }
    render(markup) {
      if (this.input.value.trim().length < 2) return;
      this.results.innerHTML = markup;
      this.defaults.hidden = markup.length > 0;
      this.input.setAttribute('aria-expanded', markup.length > 0 ? 'true' : 'false');
      $$('a', this.results).forEach(a => a.addEventListener('click', () => pushRecent(this.input.value)));
    }
  }
  if (!customElements.get('predictive-search')) customElements.define('predictive-search', PredictiveSearch);

  /* ---------- Cart API --------------------------------------------------- */
  const cartDrawer = $('#CartDrawer');
  const cartSectionId = cartDrawer ? cartDrawer.dataset.sectionId : null;
  const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };

  const updateCartUI = (cart, sections) => {
    if (cartDrawer && sections && sections[cartSectionId]) {
      const fresh = new DOMParser().parseFromString(sections[cartSectionId], 'text/html').querySelector('[data-cart-content]');
      const current = cartDrawer.querySelector('[data-cart-content]');
      if (fresh && current) current.replaceWith(fresh);
    }
    $$('[data-cart-count]').forEach(el => { el.textContent = cart.item_count; });
    $$('[data-cart-bubble]').forEach(el => {
      el.textContent = cart.item_count;
      el.classList.toggle('is-visible', cart.item_count > 0);
      el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop');
    });
    doc.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
  };

  const Cart = {
    async add(items, { open = true } = {}) {
      const body = { items: Array.isArray(items) ? items : [items] };
      if (cartSectionId) body.sections = cartSectionId;
      const res = await fetch(T.routes.cartAdd, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || T.strings.error);
      const cart = await this.refresh(data.sections);
      if (open && T.settings.cartType === 'drawer' && cartDrawer) layers.open(cartDrawer);
      else toast(T.strings.itemAdded);
      return cart;
    },
    async change(line, quantity) {
      const body = { line, quantity };
      if (cartSectionId) body.sections = cartSectionId;
      const res = await fetch(T.routes.cartChange, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
      const cart = await res.json();
      if (!res.ok) throw new Error(cart.description || T.strings.error);
      updateCartUI(cart, cart.sections);
      return cart;
    },
    async update(fields) {
      const body = { ...fields };
      if (cartSectionId) body.sections = cartSectionId;
      const res = await fetch(T.routes.cartUpdate, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
      const cart = await res.json();
      updateCartUI(cart, cart.sections);
      return cart;
    },
    async refresh(sections) {
      const res = await fetch(`${T.routes.cart}.js`, { headers: { Accept: 'application/json' } });
      const cart = await res.json();
      if (!sections && cartSectionId) {
        const r = await fetch(`${T.routes.root}?sections=${cartSectionId}`);
        sections = await r.json();
      }
      updateCartUI(cart, sections);
      return cart;
    }
  };
  window.theme.cart = Cart;
  window.theme.formatMoney = formatMoney;
  window.theme.toast = toast;
  window.theme.layers = layers;

  const setLoading = (btn, state) => { if (!btn) return; btn.classList.toggle('is-loading', state); btn.disabled = state; };

  on(doc, 'click', async (e) => {
    const openCart = e.target.closest('[data-open-cart]');
    if (openCart && T.settings.cartType === 'drawer' && cartDrawer) { e.preventDefault(); layers.open(cartDrawer); return; }

    const quick = e.target.closest('[data-quick-add-variant]');
    if (quick) {
      e.preventDefault();
      setLoading(quick, true);
      try { await Cart.add({ id: Number(quick.dataset.quickAddVariant), quantity: 1 }); }
      catch (err) { toast(err.message); }
      finally { setLoading(quick, false); }
      return;
    }

    const remove = e.target.closest('[data-cart-remove]');
    if (remove) {
      const item = remove.closest('[data-cart-item]');
      item && item.classList.add('is-removing');
      try { await Cart.change(Number(remove.dataset.line), 0); } catch (err) { toast(err.message); item && item.classList.remove('is-removing'); }
      return;
    }
    const minus = e.target.closest('[data-qty-minus]'), plus = e.target.closest('[data-qty-plus]');
    if (minus || plus) {
      const input = $('[data-qty-input]', (minus || plus).closest('[data-qty]'));
      if (!input) return;
      const next = Math.max(Number(input.min || 0), Number(input.value) + (plus ? 1 : -1));
      input.value = next;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  on(doc, 'change', async (e) => {
    const input = e.target.closest('[data-qty-input][data-line]');
    if (input) {
      const item = input.closest('[data-cart-item]');
      if (Number(input.value) === 0 && item) item.classList.add('is-removing');
      try { await Cart.change(Number(input.dataset.line), Number(input.value)); } catch (err) { toast(err.message); }
    }
    const note = e.target.closest('[data-cart-note]');
    if (note) Cart.update({ note: note.value });
    const loc = e.target.closest('[data-localization-select]');
    if (loc) loc.form.submit();
  });

  /* Product form (PDP, shop the look, wishlist) */
  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.button = this.querySelector('[type="submit"]');
      this.form && this.form.addEventListener('submit', (e) => this.submit(e));
    }
    async submit(e) {
      e.preventDefault();
      const fd = new FormData(this.form);
      const id = Number(fd.get('id'));
      if (!id) return;
      const props = {};
      fd.forEach((v, k) => { const m = k.match(/^properties\[(.+)\]$/); if (m && v) props[m[1]] = v; });
      const item = { id, quantity: Number(fd.get('quantity') || 1) };
      if (Object.keys(props).length) item.properties = props;
      if (fd.get('selling_plan')) item.selling_plan = Number(fd.get('selling_plan'));
      setLoading(this.button, true);
      try {
        await Cart.add(item);
        this.dispatchEvent(new CustomEvent('product:added', { bubbles: true, detail: item }));
      } catch (err) { toast(err.message); }
      finally { setLoading(this.button, false); }
    }
  }
  if (!customElements.get('product-form')) customElements.define('product-form', ProductForm);

  /* ---------- Wishlist (browser-stored) --------------------------------- */
  const WL_KEY = 'solenne:wishlist';
  const Wishlist = {
    get() { return storage.get(WL_KEY, []); },
    has(h) { return this.get().includes(h); },
    toggle(h) {
      const list = this.get();
      const i = list.indexOf(h);
      if (i > -1) list.splice(i, 1); else list.unshift(h);
      storage.set(WL_KEY, list);
      this.sync();
      return i === -1;
    },
    remove(h) { storage.set(WL_KEY, this.get().filter(x => x !== h)); this.sync(); },
    sync() {
      const list = this.get();
      $$('[data-wishlist-toggle]').forEach(btn => {
        const active = list.includes(btn.dataset.wishlistToggle);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      $$('[data-wishlist-bubble]').forEach(el => { el.textContent = list.length; el.classList.toggle('is-visible', list.length > 0); });
      $$('[data-wishlist-count]').forEach(el => { el.textContent = list.length; });
      doc.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { list } }));
    }
  };
  window.theme.wishlist = Wishlist;
  on(doc, 'click', (e) => {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    Wishlist.toggle(btn.dataset.wishlistToggle);
  });
  Wishlist.sync();
  doc.addEventListener('shopify:section:load', () => Wishlist.sync());

  class WishlistDrawer extends HTMLElement {
    connectedCallback() {
      this.list = this.querySelector('[data-wishlist-items]');
      this.empty = this.querySelector('[data-wishlist-empty]');
      this.count = this.querySelector('[data-wishlist-drawer-count]');
      this.addEventListener('layer:open', () => this.render());
      doc.addEventListener('wishlist:updated', () => { if (this.classList.contains('is-open')) this.render(); });
      this.addEventListener('click', async (e) => {
        const add = e.target.closest('[data-wl-add]');
        if (add) {
          const row = add.closest('[data-wl-item]');
          const select = row.querySelector('select');
          const id = select ? Number(select.value) : Number(add.dataset.wlAdd);
          setLoading(add, true);
          try { await Cart.add({ id, quantity: 1 }); } catch (err) { toast(err.message); } finally { setLoading(add, false); }
        }
        const rm = e.target.closest('[data-wl-remove]');
        if (rm) Wishlist.remove(rm.dataset.wlRemove);
      });
    }
    async render() {
      const handles = Wishlist.get();
      if (this.count) this.count.textContent = handles.length ? `(${handles.length})` : '';
      if (!handles.length) { this.list.innerHTML = ''; this.empty.hidden = false; return; }
      this.empty.hidden = true;
      const products = await Promise.all(handles.map(h => fetch(`${T.routes.root}products/${h}.js`).then(r => r.ok ? r.json() : null).catch(() => null)));
      this.list.innerHTML = products.map((p, i) => {
        const handle = handles[i];
        if (!p) return `<div class="wishlist-item" data-wl-item><div></div><div class="wishlist-item__body"><span class="muted text-sm">${T.strings.unavailable}</span><button type="button" class="cart-item__remove" data-wl-remove="${handle}">${T.strings.remove}</button></div></div>`;
        const img = p.featured_image ? `<img src="${p.featured_image.replace(/(\.[a-z]+)(\?|$)/i, '_300x$1$2')}" alt="" loading="lazy">` : '';
        const avail = p.variants.filter(v => v.available);
        let action;
        if (p.variants.length === 1) action = `<button type="button" class="btn btn--small" data-wl-add="${p.variants[0].id}" ${avail.length ? '' : 'disabled'}><span class="btn__label">${avail.length ? T.strings.wishlistAdd : T.strings.soldOut}</span><span class="btn__spinner"></span></button>`;
        else action = `<select class="select" aria-label="${T.strings.chooseSize}">${p.variants.map(v => `<option value="${v.id}" ${v.available ? '' : 'disabled'}>${v.title}${v.available ? '' : ' — ' + T.strings.soldOut}</option>`).join('')}</select><button type="button" class="btn btn--small" data-wl-add><span class="btn__label">${T.strings.wishlistAdd}</span><span class="btn__spinner"></span></button>`;
        return `<div class="wishlist-item" data-wl-item>
          <a class="media" href="${T.routes.root}products/${handle}" tabindex="-1">${img}</a>
          <div class="wishlist-item__body">
            <a class="wishlist-item__title" href="${T.routes.root}products/${handle}">${p.title}</a>
            <span class="wishlist-item__price">${formatMoney(p.price)}</span>
            <div class="wishlist-item__actions">${action}<button type="button" class="cart-item__remove" data-wl-remove="${handle}">${T.strings.remove}</button></div>
          </div></div>`;
      }).join('');
    }
  }
  if (!customElements.get('wishlist-drawer')) customElements.define('wishlist-drawer', WishlistDrawer);

  /* ---------- Scroll reveals -------------------------------------------- */
  const setupReveals = () => {
    if (!T.settings.reveals || reduced.matches || !('IntersectionObserver' in window)) { html.classList.add('no-reveal'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const observe = (root = doc) => $$('[data-reveal], .reveal-clip, [data-reveal-group]', root).forEach(el => io.observe(el));
    observe();
    doc.addEventListener('shopify:section:load', (e) => observe(e.target));
    doc.addEventListener('theme:content', (e) => observe(e.detail || doc));
  };
  setupReveals();

  /* ---------- Custom cursor --------------------------------------------- */
  const cursorEl = $('[data-cursor-el]');
  if (cursorEl && T.settings.cursor && finePointer.matches && !reduced.matches) {
    const label = $('.cursor__label', cursorEl);
    let x = 0, y = 0, cx = 0, cy = 0, raf = null, active = null;
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      cursorEl.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${active ? 1 : 0})`;
      raf = (Math.abs(x - cx) > 0.2 || Math.abs(y - cy) > 0.2 || active) ? requestAnimationFrame(loop) : null;
    };
    on(doc, 'pointermove', (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    on(doc, 'pointerover', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target === active) return;
      active = target;
      if (target) {
        label.textContent = target.dataset.cursor || T.strings.view;
        cursorEl.classList.toggle('cursor--inverse', target.dataset.cursorTheme === 'inverse');
        cursorEl.classList.add('is-active');
        html.classList.add('cursor-hidden');
        if (!raf) raf = requestAnimationFrame(loop);
      } else {
        cursorEl.classList.remove('is-active');
        html.classList.remove('cursor-hidden');
      }
    });
    on(doc, 'pointerleave', () => { active = null; cursorEl.classList.remove('is-active'); });
  }

  /* ---------- Page transitions ------------------------------------------ */
  if (T.settings.transitions && !reduced.matches) {
    const supportsVT = 'startViewTransition' in doc && CSS.supports('view-transition-name: x');
    on(doc, 'click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname && url.hash) return;
      if (url.pathname.startsWith('/cart') || url.pathname.startsWith('/checkout') || url.pathname.includes('/account')) return;
      const img = a.matches('[data-transition-image]') ? a.querySelector('img') : null;
      if (img) img.style.viewTransitionName = 'product-hero';
      if (supportsVT) return; /* Cross-document view transition handles the rest */
      e.preventDefault();
      html.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 240);
    });
    on(window, 'pageshow', (e) => { if (e.persisted) html.classList.remove('is-leaving'); });
  }

  /* ---------- Drag carousel --------------------------------------------- */
  class DragCarousel extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-track]') || this;
      this.focusMode = this.hasAttribute('data-focus');
      this.isDown = false; this.startX = 0; this.startScroll = 0; this.moved = false;
      if (finePointer.matches) {
        this.track.addEventListener('pointerdown', (e) => this.down(e));
        this.track.addEventListener('pointermove', (e) => this.move(e));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => this.track.addEventListener(ev, () => this.up()));
        this.track.addEventListener('click', (e) => { if (this.moved) { e.preventDefault(); e.stopPropagation(); } }, true);
      }
      this.track.addEventListener('scroll', () => this.onScroll(), { passive: true });
      this.querySelectorAll('[data-carousel-prev]').forEach(b => b.addEventListener('click', () => this.step(-1)));
      this.querySelectorAll('[data-carousel-next]').forEach(b => b.addEventListener('click', () => this.step(1)));
      requestAnimationFrame(() => this.onScroll());
      if (this.focusMode) {
        const first = this.track.children[Math.min(1, this.track.children.length - 1)];
        if (first && this.track.children.length > 2) this.track.scrollLeft = first.offsetLeft - (this.track.clientWidth - first.offsetWidth) / 2;
      }
    }
    down(e) { this.isDown = true; this.moved = false; this.startX = e.clientX; this.startScroll = this.track.scrollLeft; this.track.classList.add('is-dragging'); this.track.style.scrollSnapType = 'none'; }
    move(e) {
      if (!this.isDown) return;
      const dx = e.clientX - this.startX;
      if (Math.abs(dx) > 4) this.moved = true;
      this.track.scrollLeft = this.startScroll - dx;
    }
    up() {
      if (!this.isDown) return;
      this.isDown = false; this.track.classList.remove('is-dragging');
      this.track.style.scrollSnapType = '';
      setTimeout(() => { this.moved = false; }, 50);
    }
    step(dir) {
      const child = this.track.children[0];
      const w = child ? child.getBoundingClientRect().width + parseFloat(getComputedStyle(this.track).columnGap || 0) : this.track.clientWidth * 0.8;
      this.track.scrollBy({ left: dir * w, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
    onScroll() {
      if (!this.focusMode) return;
      const center = this.track.scrollLeft + this.track.clientWidth / 2;
      Array.from(this.track.children).forEach(item => {
        const mid = item.offsetLeft + item.offsetWidth / 2;
        const d = Math.min(1, Math.abs(center - mid) / (this.track.clientWidth * 0.6));
        item.style.setProperty('--focus', (1 - d).toFixed(3));
        item.classList.toggle('is-focus', d < 0.25);
      });
    }
  }
  if (!customElements.get('drag-carousel')) customElements.define('drag-carousel', DragCarousel);

  /* ---------- Misc ------------------------------------------------------- */
  /* Details accordions: close siblings inside [data-accordion-single] */
  on(doc, 'toggle', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    const group = d.closest('[data-accordion-single]');
    if (group) $$('details[open]', group).forEach(o => { if (o !== d) o.open = false; });
  }, true);

  /* Theme editor: keep header state & reveals sane */
  doc.addEventListener('shopify:section:select', (e) => { e.target.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in')); });
})();
