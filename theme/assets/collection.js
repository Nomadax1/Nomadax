/* ==========================================================================
   Collection & search: facets via the Section Rendering API, sorting,
   view switching, pagination without full reloads.
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storage = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }
  };
  const VIEW_KEY = 'solenne:grid-view';

  class FacetFilters extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.section = (this.parentElement && this.parentElement.closest('[data-section-id]')) || this.closest('.shopify-section');
      this.results = this.section.querySelector('[data-results]');
      this.form = this.querySelector('[data-facets-form]');
      this.controller = null;
      this.bind();
      this.applyStoredView();
    }
    bind() {
      this.form.addEventListener('input', (e) => {
        if (e.target.matches('input[type="number"]')) { clearTimeout(this.priceTimer); this.priceTimer = setTimeout(() => this.apply(), 600); }
      });
      this.form.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"], [data-sort]')) this.apply();
      });
      this.form.addEventListener('submit', (e) => { e.preventDefault(); this.apply(); });
      this.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-facets-toggle]');
        if (toggle) { this.togglePanel(); return; }
        const remove = e.target.closest('[data-facet-remove], [data-facets-clear]');
        if (remove) { e.preventDefault(); this.load(remove.getAttribute('href')); return; }
        const cols = e.target.closest('[data-view-cols]');
        if (cols) { this.setView('cols', cols.dataset.viewCols); return; }
        const mobile = e.target.closest('[data-view-mobile]');
        if (mobile) { this.setView('mobile', mobile.dataset.viewMobile); }
      });
    }
    togglePanel(force) {
      const panel = this.querySelector('[data-facets-panel]');
      if (!panel) return;
      const open = typeof force === 'boolean' ? force : !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      $$('[data-facets-toggle][aria-expanded]', this).forEach(b => b.setAttribute('aria-expanded', open ? 'true' : 'false'));
      const mobile = window.matchMedia('(max-width: 749px)').matches;
      if (mobile) {
        document.documentElement.classList.toggle('is-locked', open);
        const scrim = $('[data-scrim]');
        if (scrim) { scrim.classList.toggle('is-open', open); if (open) scrim.addEventListener('click', () => this.togglePanel(false), { once: true }); }
      }
    }
    apply() {
      const params = new URLSearchParams();
      new FormData(this.form).forEach((v, k) => { if (v !== '') params.append(k, v); });
      const base = location.pathname;
      this.load(`${base}?${params.toString()}`);
    }
    async load(url, push = true) {
      const grid = this.section.querySelector('[data-product-grid]');
      grid && grid.classList.add('is-loading');
      if (this.controller) this.controller.abort();
      this.controller = new AbortController();
      const u = new URL(url, location.origin);
      u.searchParams.set('section_id', this.sectionId);
      try {
        const res = await fetch(u.toString(), { signal: this.controller.signal });
        const text = await res.text();
        const fresh = new DOMParser().parseFromString(text, 'text/html').querySelector('[data-results]');
        if (fresh && this.results) {
          const wasOpen = this.querySelector('[data-facets-panel]')?.classList.contains('is-open');
          this.results.replaceWith(fresh);
          this.results = fresh;
          const nextFacets = fresh.querySelector('facet-filters');
          if (nextFacets && wasOpen) nextFacets.togglePanel(true);
          document.dispatchEvent(new CustomEvent('theme:content', { detail: fresh }));
          if (window.theme && window.theme.wishlist) window.theme.wishlist.sync();
        }
        u.searchParams.delete('section_id');
        if (push) history.pushState({ url: u.toString() }, '', u.toString());
        const top = this.section.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY > top) window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      } catch (e) { if (e.name !== 'AbortError') location.href = url; }
    }
    setView(kind, value) {
      const grid = this.section.querySelector('[data-product-grid]');
      if (!grid) return;
      if (kind === 'cols') { grid.dataset.cols = value; grid.style.setProperty('--cols-desktop', value); grid.style.setProperty('--cols-tablet', Math.min(3, Number(value))); }
      else grid.dataset.colsMobile = value;
      const stored = storage.get(VIEW_KEY, {}); stored[kind] = value; storage.set(VIEW_KEY, stored);
      this.reflectView();
    }
    applyStoredView() {
      const stored = storage.get(VIEW_KEY, {});
      const grid = this.section.querySelector('[data-product-grid]');
      if (grid && stored.cols) { grid.dataset.cols = stored.cols; grid.style.setProperty('--cols-desktop', stored.cols); grid.style.setProperty('--cols-tablet', Math.min(3, Number(stored.cols))); }
      if (grid && stored.mobile) grid.dataset.colsMobile = stored.mobile;
      this.reflectView();
    }
    reflectView() {
      const grid = this.section.querySelector('[data-product-grid]');
      const cols = grid ? grid.dataset.cols : '3', mobile = grid ? grid.dataset.colsMobile : '2';
      $$('[data-view-cols]', this).forEach(b => b.setAttribute('aria-pressed', b.dataset.viewCols === cols ? 'true' : 'false'));
      $$('[data-view-mobile]', this).forEach(b => b.setAttribute('aria-pressed', b.dataset.viewMobile === mobile ? 'true' : 'false'));
    }
  }
  if (!customElements.get('facet-filters')) customElements.define('facet-filters', FacetFilters);

  /* Pagination links inside results load in place */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-pagination] a');
    if (!link) return;
    const facets = link.closest('[data-section-id]')?.querySelector('facet-filters');
    if (!facets) return;
    e.preventDefault();
    facets.load(link.getAttribute('href'));
  });
  window.addEventListener('popstate', (e) => {
    const facets = $('facet-filters');
    if (facets && e.state && e.state.url) facets.load(e.state.url, false);
    else if (facets) facets.load(location.href, false);
  });
})();
