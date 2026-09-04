/* ==========================================================================
   Product page: variant selection, gallery sync, hover zoom, lightbox,
   sticky bar, size guide dialog, complete the look, recently viewed.
   ========================================================================== */
(() => {
  'use strict';
  const T = window.theme || { strings: {}, routes: {} };
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = () => window.matchMedia('(min-width: 990px)').matches;
  const storage = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }
  };

  /* ---------- Variant selector ------------------------------------------ */
  class VariantSelector extends HTMLElement {
    connectedCallback() {
      this.section = this.closest('[data-product]');
      this.variants = JSON.parse(this.querySelector('[data-variants-json]').textContent);
      this.mediaMap = JSON.parse(this.querySelector('[data-media-json]').textContent || '{}');
      this.inputs = $$('[data-option-input]', this);
      this.addEventListener('change', (e) => { if (e.target.matches('[data-option-input]')) this.onChange(); });
      this.updateAvailability();
    }
    selectedOptions() {
      const fieldsets = $$('[data-option-index]', this);
      return fieldsets.map(f => { const checked = f.querySelector('[data-option-input]:checked'); return checked ? checked.value : null; });
    }
    currentVariant(options = this.selectedOptions()) {
      return this.variants.find(v => options.every((o, i) => o === null || v.options[i] === o));
    }
    onChange() {
      const variant = this.currentVariant();
      this.updateAvailability();
      $$('[data-option-value]', this).forEach(el => { const i = Number(el.dataset.optionValue); const opt = this.selectedOptions()[i]; if (opt) el.textContent = opt; });
      const s = this.section;
      const idInput = $('[data-variant-id]', s);
      const atb = $('[data-add-to-bag]', s);
      const label = $('[data-atb-label]', s);
      const barAdd = $('[data-bar-add]', s);
      const barPrice = $('[data-bar-price]', s);
      const stock = $('[data-stock-note]', s);
      if (!variant) {
        atb.disabled = true; label.textContent = T.strings.unavailable;
        if (barAdd) { barAdd.disabled = true; barAdd.textContent = T.strings.unavailable; }
        return;
      }
      idInput.value = variant.id;
      atb.disabled = !variant.available;
      label.textContent = variant.available ? T.strings.addToBag : T.strings.soldOut;
      if (barAdd) { barAdd.disabled = !variant.available; barAdd.textContent = variant.available ? T.strings.addToBag : T.strings.soldOut; }
      if (barPrice) barPrice.textContent = T.formatMoney(variant.price);
      this.renderPrice(variant);
      if (stock) {
        const low = variant.available && variant.inventory_management && typeof variant.inventory_quantity === 'number' && variant.inventory_quantity > 0 && variant.inventory_quantity <= 3;
        stock.hidden = !low;
        if (low) stock.textContent = `${variant.inventory_quantity} left`;
      }
      const url = new URL(this.dataset.url, location.origin);
      url.searchParams.set('variant', variant.id);
      history.replaceState({}, '', url.toString());
      const mediaId = this.mediaMap[variant.id];
      if (mediaId) this.section.dispatchEvent(new CustomEvent('gallery:show', { detail: { mediaId } }));
    }
    renderPrice(variant) {
      const wrap = $('[data-price-wrap]', this.section);
      if (!wrap) return;
      const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
      wrap.innerHTML = `<span class="price${onSale ? ' price--sale' : ''}">${onSale
        ? `<span class="price__sale">${T.formatMoney(variant.price)}</span><s class="price__compare">${T.formatMoney(variant.compare_at_price)}</s>`
        : `<span class="price__regular">${T.formatMoney(variant.price)}</span>`}</span>`;
    }
    updateAvailability() {
      const selected = this.selectedOptions();
      $$('[data-option-index]', this).forEach((fieldset) => {
        const i = Number(fieldset.dataset.optionIndex);
        $$('[data-option-input]', fieldset).forEach(input => {
          const probe = selected.slice(); probe[i] = input.value;
          const available = this.variants.some(v => v.available && probe.every((o, j) => o === null || v.options[j] === o));
          const label = fieldset.querySelector(`label[for="${input.id}"]`);
          if (label) label.classList.toggle('is-unavailable', !available);
        });
      });
    }
  }
  if (!customElements.get('variant-selector')) customElements.define('variant-selector', VariantSelector);

  /* ---------- Gallery ---------------------------------------------------- */
  const initGallery = (section) => {
    const list = $('[data-media-list]', section);
    if (!list) return;
    const items = $$('[data-media]', list);
    const thumbs = $$('[data-thumb]', section);
    const counter = $('[data-media-index]', section);
    const setActive = (id) => {
      thumbs.forEach(t => { const on = t.dataset.thumb === String(id); t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      if (counter) { const idx = items.findIndex(i => i.dataset.media === String(id)); if (idx > -1) counter.textContent = idx + 1; }
    };
    const show = (id) => {
      const item = items.find(i => i.dataset.media === String(id));
      if (!item) return;
      if (desktop()) {
        const top = item.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) * 16 || 76) - 12;
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        list.scrollTo({ left: item.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
      }
      setActive(id);
    };
    section.addEventListener('gallery:show', (e) => show(e.detail.mediaId));
    thumbs.forEach(t => t.addEventListener('click', () => show(t.dataset.thumb)));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting && en.intersectionRatio > 0.5) setActive(en.target.dataset.media); });
      }, { root: desktop() ? null : list, threshold: [0.51] });
      items.forEach(i => io.observe(i));
    }
    /* Hover zoom (desktop) */
    if (finePointer) {
      $$('[data-zoom-trigger]', section).forEach(btn => {
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect();
          btn.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          btn.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
        btn.addEventListener('pointerenter', () => { if (!reduced) btn.classList.add('is-zooming'); });
        btn.addEventListener('pointerleave', () => btn.classList.remove('is-zooming'));
      });
    }
    /* Lightbox */
    const lightbox = $('[data-lightbox]', section);
    if (lightbox) {
      const track = $('[data-lightbox-track]', lightbox);
      const open = (index) => {
        T.layers.open(lightbox, { withScrim: false });
        const target = $(`[data-lightbox-item="${index}"]`, lightbox);
        if (target) track.scrollTop = target.offsetTop;
      };
      $$('[data-zoom-trigger]', section).forEach(btn => btn.addEventListener('click', () => open(btn.dataset.zoomTrigger)));
      $$('[data-lightbox-close], .lightbox__item img', lightbox).forEach(el => el.addEventListener('click', () => T.layers.close()));
    }
  };

  /* ---------- Sticky bar, dialogs, share -------------------------------- */
  const initExtras = (section) => {
    const bar = $('[data-sticky-bar]', section);
    const atb = $('[data-add-to-bag]', section);
    if (bar && atb && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting && en.boundingClientRect.top < 0;
        bar.classList.toggle('is-visible', show);
        bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      }, { threshold: 0 });
      io.observe(atb);
      $('[data-bar-add]', bar).addEventListener('click', () => atb.closest('form').requestSubmit());
    }
    section.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-dialog]');
      if (opener) { const d = document.getElementById(opener.dataset.openDialog); if (d) T.layers.open(d); }
      if (e.target.closest('[data-dialog-close]')) T.layers.close();
      const share = e.target.closest('[data-share]');
      if (share) {
        const data = { title: share.dataset.title, url: share.dataset.url };
        if (navigator.share) navigator.share(data).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(() => T.toast('Link copied'));
      }
    });
  };

  /* ---------- Recently viewed -------------------------------------------- */
  const RV_KEY = 'solenne:recently-viewed';
  const trackView = (handle) => {
    if (!handle) return;
    const list = storage.get(RV_KEY, []).filter(h => h !== handle);
    list.unshift(handle);
    storage.set(RV_KEY, list.slice(0, 16));
  };
  const cdnSize = (src, w) => src ? src.replace(/(\.[a-z]{3,4})(\?|$)/i, `_${w}x$1$2`) : '';
  const initRecent = async (section) => {
    const track = $('[data-recent-track]', section);
    const tpl = $('[data-recent-card]', section);
    if (!track || !tpl) return;
    const exclude = section.dataset.exclude;
    const limit = Number(section.dataset.limit || 8);
    const handles = storage.get(RV_KEY, []).filter(h => h !== exclude).slice(0, limit);
    if (!handles.length) return;
    const products = (await Promise.all(handles.map(h => fetch(`${T.routes.root}products/${h}.js`).then(r => r.ok ? r.json() : null).catch(() => null)))).filter(Boolean);
    if (!products.length) return;
    products.forEach(p => {
      const node = tpl.content.cloneNode(true);
      const links = $$('a', node);
      links.forEach(a => a.href = `${T.routes.root}products/${p.handle}`);
      const img = $('img', node);
      if (p.featured_image) { img.src = cdnSize(p.featured_image, 600); img.srcset = `${cdnSize(p.featured_image, 300)} 300w, ${cdnSize(p.featured_image, 600)} 600w`; img.sizes = '(min-width: 990px) 20vw, 50vw'; }
      img.alt = p.title;
      $('.product-card__title a', node).textContent = p.title;
      $('[data-price]', node).textContent = T.formatMoney(p.price);
      track.appendChild(node);
    });
    section.hidden = false;
    document.dispatchEvent(new CustomEvent('theme:content', { detail: section }));
  };

  /* ---------- Complete the look (recommendations) ----------------------- */
  const initRecommendations = async (section) => {
    const { sectionId, productId, limit, intent } = section.dataset;
    if (!productId) return;
    const load = async (i) => {
      const url = `${T.routes.recommendations}?section_id=${sectionId}&product_id=${productId}&limit=${limit}&intent=${i}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const html = new DOMParser().parseFromString(await res.text(), 'text/html');
      const inner = html.querySelector('[data-recommendations]');
      return inner && inner.querySelector('.product-card') ? inner.innerHTML : null;
    };
    try {
      let markup = await load(intent || 'related');
      if (!markup && intent === 'complementary') markup = await load('related');
      if (markup) {
        section.innerHTML = markup;
        document.dispatchEvent(new CustomEvent('theme:content', { detail: section }));
        if (T.wishlist) T.wishlist.sync();
      }
    } catch (e) { /* silent: recommendations are progressive */ }
  };

  /* ---------- Boot ------------------------------------------------------- */
  const boot = (root = document) => {
    $$('[data-product]', root).forEach(section => {
      initGallery(section);
      initExtras(section);
      trackView(section.dataset.handle);
    });
    $$('[data-recommendations]', root).forEach(initRecommendations);
    $$('[data-recently-viewed]', root).forEach(initRecent);
  };
  boot();
  document.addEventListener('shopify:section:load', (e) => boot(e.target));
})();
