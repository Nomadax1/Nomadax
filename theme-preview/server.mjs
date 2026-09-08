/* Local render harness: liquidjs + Shopify stubs + mock storefront API.
   Not part of the theme. Used only to preview and test the theme offline. */
import { Liquid, Tag, Value } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';

const THEME = new URL('../theme/', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4321);
const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));

/* ---------- Mock data ---------------------------------------------------- */
const money = (cents) => '€' + (cents / 100).toFixed(2).replace('.', ',');
const colors = ['Ivory', 'Ink', 'Oxblood', 'Sand', 'Olive'];
const sizes = ['XS', 'S', 'M', 'L', 'XL'];
const names = ['The Alba Dress', 'Noir Sculpt Top', 'Sienna Tailored Trouser', 'Élan Knit', 'Mara Oversized Blazer', 'Linea Satin Dress', 'Vera Wrap Skirt', 'Odette Silk Blouse', 'Cléa Column Dress', 'Rive Wide Trouser', 'Ines Knit Set', 'Sol Cropped Jacket'];
const types = ['Dresses', 'Tops', 'Bottoms', 'Knitwear', 'Outerwear', 'Dresses', 'Bottoms', 'Tops', 'Dresses', 'Bottoms', 'Sets', 'Outerwear'];
const handle = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const mkImage = (id, alt, hue) => ({ id, alt, src: `/img/${id}.svg`, width: 1200, height: 1600, aspect_ratio: 0.75, media_type: 'image', preview_image: { src: `/img/${id}.svg` }, hue });
const products = names.map((title, i) => {
  const pcolors = colors.slice(0, 2 + (i % 3));
  const variants = [];
  pcolors.forEach((c, ci) => sizes.forEach((s, si) => {
    const available = !((i + ci + si) % 7 === 3);
    variants.push({ id: 1000 + i * 100 + ci * 10 + si, title: `${c} / ${s}`, option1: c, option2: s, options: [c, s], available, price: 8900 + i * 1500, compare_at_price: i % 4 === 1 ? 12900 + i * 1500 : null, featured_media: { id: 500 + i * 10 + ci }, inventory_management: 'shopify', inventory_quantity: available ? (si === 2 ? 2 : 12) : 0, unit_price_measurement: null, sku: `SOL-${i}${ci}${si}` });
  }));
  const media = pcolors.map((c, ci) => mkImage(500 + i * 10 + ci, `${title} in ${c}`, (i * 47 + ci * 25) % 360));
  const firstAvail = variants.find(v => v.available) || variants[0];
  const p = {
    id: 1 + i, title, handle: handle(title), url: `/products/${handle(title)}`, vendor: 'Solenne', type: types[i], product_type: types[i], tags: i < 4 ? ['new'] : [],
    description: `<p>${title} in a sculpted cut with clean seams. Designed in Barcelona, made in Portugal in small runs.</p><ul><li>Hidden side zip</li><li>Fully lined</li><li>Model wears size S</li></ul>`,
    price: firstAvail.price, price_min: firstAvail.price, price_max: firstAvail.price, price_varies: false, compare_at_price: firstAvail.compare_at_price,
    available: variants.some(v => v.available), featured_media: media[0], featured_image: media[0].src, media, images: media.map(m => m.src),
    options: ['Colour', 'Size'], options_with_values: [{ name: 'Colour', position: 1, values: pcolors, selected_value: firstAvail.option1 }, { name: 'Size', position: 2, values: sizes, selected_value: firstAvail.option2 }],
    variants, selected_or_first_available_variant: firstAvail, first_available_variant: firstAvail, has_only_default_variant: false, metafields: { custom: {} }, collections: [],
  };
  if (i === 5) p.price_varies = true;
  return p;
});
const collectionDefs = [['all', 'All', products], ['new-in', 'New in', products.slice(0, 4)], ['dresses', 'Dresses', products.filter(p => p.type === 'Dresses')], ['tops', 'Tops', products.filter(p => p.type === 'Tops')], ['bottoms', 'Bottoms', products.filter(p => p.type === 'Bottoms')], ['sets', 'Sets', products.filter(p => p.type === 'Sets')], ['essentials', 'Essentials', products.slice(6)], ['outerwear', 'Outerwear', products.filter(p => p.type === 'Outerwear')], ['accessories', 'Accessories', products.slice(9)]];
const collections = collectionDefs.map(([h, t, ps], i) => ({ id: 10 + i, handle: h, title: t, url: `/collections/${h}`, description: i === 0 ? '<p>Every piece from the season, edited weekly.</p>' : '', image: null, featured_image: null, products: ps, products_count: ps.length, all_products_count: ps.length, sort_options: [{ value: 'manual', name: 'Featured' }, { value: 'created-descending', name: 'Newest' }, { value: 'price-ascending', name: 'Price, low to high' }, { value: 'price-descending', name: 'Price, high to low' }], default_sort_by: 'manual', sort_by: 'manual', filters: [] }));
products.forEach(p => { p.collections = collections.filter(c => c.handle !== 'all' && c.products.includes(p)); });
const byHandle = (h) => collections.find(c => c.handle === h);
const linkOf = (title, url, links = []) => ({ title, url, links, current: false, levels: links.length ? 1 : 0 });
const menus = {
  'main-menu': { handle: 'main-menu', links: [
    linkOf('New in', '/collections/new-in'),
    linkOf('Shop', '/collections/all', [
      linkOf('Clothing', '/collections/all', [linkOf('New in', '/collections/new-in'), linkOf('Dresses', '/collections/dresses'), linkOf('Tops', '/collections/tops'), linkOf('Bottoms', '/collections/bottoms'), linkOf('Sets', '/collections/sets'), linkOf('Outerwear', '/collections/outerwear'), linkOf('Accessories', '/collections/accessories')]),
      linkOf('Edits', '/collections/all', [linkOf('The Sculpt Edit', '/collections/all'), linkOf('Satin, after dark', '/collections/dresses'), linkOf('Essentials', '/collections/essentials')]),
    ]),
    linkOf('Collections', '/collections'),
    linkOf('Bestsellers', '/collections/all'),
    linkOf('About', '/pages/about'),
  ] },
  'footer': { handle: 'footer', links: [linkOf('Shipping', '/pages/shipping'), linkOf('Returns', '/pages/returns'), linkOf('Size guide', '/pages/size-guide'), linkOf('Contact', '/pages/contact')] },
};
const cart = { items: [], note: '', currency: { iso_code: 'EUR', symbol: '€' } };
const cartTotals = () => { cart.item_count = cart.items.reduce((a, i) => a + i.quantity, 0); cart.total_price = cart.items.reduce((a, i) => a + i.final_line_price, 0); cart.items_subtotal_price = cart.total_price; cart.cart_level_discount_applications = []; return cart; };
cartTotals();
const findVariant = (id) => { for (const p of products) { const v = p.variants.find(v => v.id === Number(id)); if (v) return { p, v }; } return null; };
const addItem = (id, qty) => {
  const f = findVariant(id); if (!f) throw new Error('Variant not found');
  const key = `${id}:x`;
  let line = cart.items.find(i => i.key === key);
  if (!line) { line = { key, id: f.v.id, variant_id: f.v.id, product_id: f.p.id, title: f.p.title, product: f.p, variant: f.v, url: f.p.url, image: f.p.media.find(m => m.id === f.v.featured_media.id) || f.p.featured_media, quantity: 0, price: f.v.price, original_price: f.v.price, final_price: f.v.price, options_with_values: [{ name: 'Colour', value: f.v.option1 }, { name: 'Size', value: f.v.option2 }], line_level_discount_allocations: [], variant_title: f.v.title, product_title: f.p.title, handle: f.p.handle, featured_image: { url: f.p.featured_media.src } }; cart.items.push(line); }
  line.quantity += qty; line.original_line_price = line.final_line_price = line.line_price = line.quantity * line.price;
  cartTotals();
};

/* ---------- Locale + settings ------------------------------------------- */
const locale = readJSON('locales/en.default.json');
const settingsSchema = readJSON('config/settings_schema.json');
const settingsDefaults = {};
settingsSchema.forEach(g => (g.settings || []).forEach(s => { if (s.id && s.default !== undefined) settingsDefaults[s.id] = s.default; }));
const settings = { ...settingsDefaults, ...readJSON('config/settings_data.json').current };
const hex = (h) => ({ red: parseInt(h.slice(1, 3), 16), green: parseInt(h.slice(3, 5), 16), blue: parseInt(h.slice(5, 7), 16), toString() { return h; } });
for (const k of Object.keys(settings)) if (typeof settings[k] === 'string' && /^#[0-9a-f]{6}$/i.test(settings[k])) settings[k] = hex(settings[k]);
const fontObj = (h) => ({ family: h.startsWith('instrument_serif') ? 'Instrument Serif' : 'Instrument Sans', fallback_families: h.includes('serif') ? 'serif' : 'sans-serif', weight: 400, style: 'normal', system: false, 'system?': false, toString() { return h; } });
settings.font_display = fontObj(settings.font_display); settings.font_body = fontObj(settings.font_body);
settings.logo = null; settings.logo_inverse = null; settings.favicon = null; settings.share_image = null;

/* ---------- Liquid engine ------------------------------------------------- */
const engine = new Liquid({ root: [THEME], partials: path.join(THEME, 'snippets'), extname: '.liquid', cache: false, jsTruthy: false, strictFilters: false, strictVariables: false, relativeReference: false, lenientIf: true, ownPropertyOnly: false });
const lookup = (key, obj) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const interp = (str, vars = {}) => String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
engine.registerFilter('t', function (key, ...args) {
  const vars = {}; for (let i = 0; i < args.length; i++) { const a = args[i]; if (Array.isArray(a)) vars[a[0]] = a[1]; }
  let v = lookup(key, locale);
  if (v && typeof v === 'object') v = vars.count === 1 ? v.one : v.other;
  return v === undefined ? `[${key}]` : interp(v, vars);
});
engine.registerFilter('money', (c) => money(Number(c) || 0));
engine.registerFilter('money_with_currency', (c) => money(Number(c) || 0) + ' EUR');
engine.registerFilter('money_without_currency', (c) => ((Number(c) || 0) / 100).toFixed(2));
engine.registerFilter('money_without_trailing_zeros', (c) => '€' + Math.round((Number(c) || 0) / 100));
engine.registerFilter('handle', (s) => handle(String(s)));
engine.registerFilter('handleize', (s) => handle(String(s)));
engine.registerFilter('at_most', (a, b) => Math.min(Number(a), Number(b)));
engine.registerFilter('at_least', (a, b) => Math.max(Number(a), Number(b)));
const imgSrc = (img) => (img && (img.src || (img.preview_image && img.preview_image.src))) || '';
engine.registerFilter('image_url', function (img, ...args) { const src = imgSrc(img); return src; });
engine.registerFilter('image_tag', function (src, ...args) {
  const o = {}; args.forEach(a => { if (Array.isArray(a)) o[a[0]] = a[1]; });
  const attrs = ['class', 'alt', 'loading', 'sizes', 'fetchpriority'].filter(k => o[k]).map(k => `${k}="${String(o[k]).replace(/"/g, '&quot;')}"`).join(' ');
  return `<img src="${src}" ${attrs} width="1200" height="1600">`;
});
engine.registerFilter('img_url', (img) => imgSrc(img));
engine.registerFilter('asset_url', (f) => `/assets/${f}`);
engine.registerFilter('shopify_asset_url', (f) => `/shopify-assets/${f}`);
engine.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
engine.registerFilter('script_tag', (u) => `<script src="${u}"></script>`);
engine.registerFilter('preload_tag', () => '');
engine.registerFilter('font_face', () => '');
engine.registerFilter('font_url', () => '');
engine.registerFilter('font_modify', (f) => f);
engine.registerFilter('placeholder_svg_tag', () => '<svg viewBox="0 0 1 1"></svg>');
engine.registerFilter('video_tag', () => '<video muted autoplay loop playsinline></video>');
engine.registerFilter('external_video_tag', () => '');
engine.registerFilter('model_viewer_tag', () => '');
engine.registerFilter('payment_type_svg_tag', () => '<svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="3" fill="#888"/></svg>');
engine.registerFilter('format_address', (a) => a ? `<p class="address">${a.name || ''}<br>${a.address1 || ''}</p>` : '');
engine.registerFilter('default_errors', () => '');
engine.registerFilter('metafield_tag', (m) => String(m));
engine.registerFilter('format_code', (c) => c);
engine.registerFilter('url_encode', (s) => encodeURIComponent(String(s ?? '')));
engine.registerFilter('default_pagination', () => '');
engine.registerFilter('date', function (d, ...args) { const dt = d === 'now' ? new Date() : new Date(d); if (isNaN(dt)) return d; return dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); });
engine.registerFilter('within', (u) => u);
engine.registerFilter('customer_login_link', () => '');

class SchemaTag extends Tag { constructor(t, r, l, p) { super(t, r, l, p); this.tokens = []; const s = (p || l.parser).parseStream(r); s.on('tag:endschema', () => s.stop()).on('template', () => {}).start(); } *render() { return ''; } }
class JavascriptTag extends Tag { constructor(t, r, l, p) { super(t, r, l, p); const s = (p || l.parser).parseStream(r); s.on('tag:endjavascript', () => s.stop()).on('template', () => {}).start(); } *render() { return ''; } }
class StyleTag extends Tag { constructor(t, r, l, p) { super(t, r, l, p); this.tpls = []; const s = (p || l.parser).parseStream(r); s.on('tag:endstyle', () => s.stop()).on('template', (tp) => this.tpls.push(tp)).start(); } *render(ctx, emitter) { emitter.write('<style>'); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); emitter.write('</style>'); } }
class FormTag extends Tag {
  constructor(t, r, l, p) { super(t, r, l, p); this.args = t.args; this.tpls = []; const s = (p || l.parser).parseStream(r); s.on('tag:endform', () => s.stop()).on('template', (tp) => this.tpls.push(tp)).start(); }
  *render(ctx, emitter) {
    const type = (this.args.match(/^'([^']+)'/) || [])[1] || 'form';
    const idm = this.args.match(/id:\s*(?:'([^']+)'|(\w+))/); let id = idm ? (idm[1] || (yield new Value(idm[2], this.liquid).value(ctx))) : `Form-${type}`;
    const cm = this.args.match(/class:\s*'([^']+)'/);
    emitter.write(`<form id="${id}" class="${cm ? cm[1] : ''}" method="post" action="/${type}" data-form-type="${type}">`);
    ctx.push({ form: { errors: null, 'posted_successfully?': false } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
}
class PaginateTag extends Tag {
  constructor(t, r, l, p) { super(t, r, l, p); this.args = t.args; this.tpls = []; const s = (p || l.parser).parseStream(r); s.on('tag:endpaginate', () => s.stop()).on('template', (tp) => this.tpls.push(tp)).start(); }
  *render(ctx, emitter) {
    const m = this.args.match(/^(.+?)\s+by\s+(.+)$/);
    const coll = yield new Value(m[1].trim(), this.liquid).value(ctx);
    const by = Number(yield new Value(m[2].trim(), this.liquid).value(ctx)) || 24;
    const page = Number(ctx.get(['request', 'page']) || 1);
    const all = Array.isArray(coll) ? coll : [];
    const pages = Math.max(1, Math.ceil(all.length / by));
    const slice = all.slice((page - 1) * by, page * by);
    /* Replace collection.products for the block scope */
    const target = m[1].trim().split('.');
    const paginate = { current_page: page, pages, previous: page > 1 ? { url: `?page=${page - 1}` } : null, next: page < pages ? { url: `?page=${page + 1}` } : null, parts: Array.from({ length: pages }, (_, i) => ({ title: i + 1, is_link: i + 1 !== page, url: `?page=${i + 1}` })) };
    const scope = { paginate };
    if (target.length === 2) { const parent = ctx.get([target[0]]); scope[target[0]] = { ...parent, [target[1]]: slice }; }
    ctx.push(scope);
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  }
}
class LayoutTag extends Tag { constructor(t, r, l, p) { super(t, r, l, p); } *render() { return ''; } }
class SectionTag extends Tag {
  constructor(t, r, l, p) { super(t, r, l, p); this.name = t.args.replace(/['"]/g, '').trim(); }
  *render(ctx, emitter) { emitter.write(yield renderSection(this.name, { id: this.name, settings: {}, blocks: [] }, ctx.getAll())); }
}
class SectionsTag extends Tag {
  constructor(t, r, l, p) { super(t, r, l, p); this.name = t.args.replace(/['"]/g, '').trim(); }
  *render(ctx, emitter) { emitter.write(yield renderGroup(this.name, ctx.getAll())); }
}
engine.registerTag('schema', SchemaTag); engine.registerTag('javascript', JavascriptTag); engine.registerTag('style', StyleTag); engine.registerTag('form', FormTag); engine.registerTag('paginate', PaginateTag); engine.registerTag('layout', LayoutTag); engine.registerTag('section', SectionTag); engine.registerTag('sections', SectionsTag);

/* ---------- Section rendering ------------------------------------------- */
const schemaCache = new Map();
const sectionSchema = (type) => {
  if (schemaCache.has(type)) return schemaCache.get(type);
  const src = read(`sections/${type}.liquid`);
  const m = src.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema = m ? JSON.parse(m[1]) : { settings: [] };
  schemaCache.set(type, schema); return schema;
};
const resolveSetting = (def, value) => {
  if (value === undefined || value === null) value = def.default;
  if (def.type === 'collection') return value ? byHandle(String(value)) || null : null;
  if (def.type === 'product') return value ? products.find(p => p.handle === value) || null : null;
  if (def.type === 'link_list') return menus[value] || menus['main-menu'];
  if (def.type === 'image_picker' || def.type === 'video' || def.type === 'page') return null;
  if (def.type === 'color' && value) return hex(value);
  if (def.type === 'url') return value || '';
  return value === undefined ? '' : value;
};
const buildSection = (id, type, data) => {
  const schema = sectionSchema(type);
  const settings = {};
  (schema.settings || []).forEach(d => { if (d.id) settings[d.id] = resolveSetting(d, (data.settings || {})[d.id]); });
  const blockDefs = Object.fromEntries((schema.blocks || []).map(b => [b.type, b]));
  const order = data.block_order || Object.keys(data.blocks || {});
  const blocks = order.map((bid, bi) => { const b = data.blocks[bid]; const def = blockDefs[b.type] || { settings: [] }; const bs = {}; (def.settings || []).forEach(d => { if (d.id) bs[d.id] = resolveSetting(d, (b.settings || {})[d.id]); }); if (b.type === 'hotspot' && !bs.product) bs.product = products[4 + bi]; if (type === 'horizontal-gallery' && b.type === 'product' && !bs.product) bs.product = products[6 + bi]; if (type === 'worn-your-way' && !bs.product) bs.product = products[bi]; return { id: bid, type: b.type, settings: bs, shopify_attributes: '' }; });
  return { id, type, settings, blocks, shopify_attributes: '' };
};
const renderSection = async (type, section, globals) => {
  const src = read(`sections/${type}.liquid`);
  const schema = sectionSchema(type);
  const html = await engine.parseAndRender(src, { section }, { globals });
  const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
  return `<div id="shopify-section-${section.id}" class="${cls}">${html}</div>`;
};
const renderGroup = async (name, globals) => {
  const g = readJSON(`sections/${name}.json`);
  let out = '';
  for (const id of g.order) { const d = g.sections[id]; out += await renderSection(d.type, buildSection(id, d.type, d), globals); }
  return out;
};
const renderTemplate = async (name, globals, layoutName = 'theme') => {
  const t = readJSON(`templates/${name}.json`);
  let content = '';
  for (const id of t.order) { const d = t.sections[id]; content += await renderSection(d.type, buildSection(id, d.type, d), globals); }
  const layout = read(`layout/${t.layout || layoutName}.liquid`);
  return engine.parseAndRender(layout, { content_for_layout: content, content_for_header: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap">' }, { globals });
};
const globalsFor = (url, extra = {}) => ({
  settings, shop: { name: 'Solenne', url: 'http://localhost', money_format: '€{{amount}}', money_with_currency_format: '€{{amount}} EUR', customer_accounts_enabled: true, enabled_payment_types: ['visa', 'master', 'american_express', 'paypal'], description: 'Contemporary womenswear', checkout: { guest_login: false } },
  cart: cartTotals(), routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', predictive_search_url: '/search/suggest', search_url: '/search', product_recommendations_url: '/recommendations/products', all_products_collection_url: '/collections/all', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register', account_logout_url: '/account/logout', account_addresses_url: '/account/addresses', collections_url: '/collections' },
  request: { locale: { iso_code: 'en', direction: 'ltr' }, page_type: extra.page_type || 'index', origin: 'http://localhost', page: Number(url.searchParams.get('page') || 1) },
  localization: { available_countries: [{ iso_code: 'ES', name: 'Spain', currency: { iso_code: 'EUR', symbol: '€' } }, { iso_code: 'FR', name: 'France', currency: { iso_code: 'EUR', symbol: '€' } }], country: { iso_code: 'ES' }, available_languages: [{ iso_code: 'en', endonym_name: 'English' }, { iso_code: 'es', endonym_name: 'Español' }], language: { iso_code: 'en' } },
  canonical_url: 'http://localhost' + url.pathname, page_title: 'Solenne', page_description: '', template: { suffix: null, name: extra.page_type || 'index' }, linklists: menus, collections, customer: null, all_country_option_tags: '<option>Spain</option>', ...extra,
});

/* ---------- Filtering (collection/search) ------------------------------ */
const buildFilters = (base, url) => {
  const p = url.searchParams;
  const active = { color: p.getAll('filter.v.option.colour'), size: p.getAll('filter.v.option.size'), gte: p.get('filter.v.price.gte'), lte: p.get('filter.v.price.lte'), avail: p.get('filter.v.availability') };
  let list = base.filter(pr => (!active.color.length || active.color.some(c => pr.options_with_values[0].values.includes(c))) && (!active.size.length || true) && (!active.gte || pr.price >= active.gte * 100) && (!active.lte || pr.price <= active.lte * 100) && (!active.avail || pr.available));
  const sort = p.get('sort_by') || 'manual';
  if (sort === 'price-ascending') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'price-descending') list = [...list].sort((a, b) => b.price - a.price);
  if (sort === 'created-descending') list = [...list].reverse();
  const rm = (k, v) => { const u = new URL(url); const vals = u.searchParams.getAll(k).filter(x => x !== v); u.searchParams.delete(k); vals.forEach(x => u.searchParams.append(k, x)); return u.pathname + u.search; };
  const filters = [
    { label: 'Colour', type: 'list', param_name: 'filter.v.option.colour', values: colors.map(c => ({ label: c, value: c, param_name: 'filter.v.option.colour', count: base.filter(pr => pr.options_with_values[0].values.includes(c)).length, active: active.color.includes(c), url_to_remove: rm('filter.v.option.colour', c) })), active_values: [] },
    { label: 'Size', type: 'list', param_name: 'filter.v.option.size', values: sizes.map(s => ({ label: s, value: s, param_name: 'filter.v.option.size', count: base.length, active: active.size.includes(s), url_to_remove: rm('filter.v.option.size', s) })), active_values: [] },
    { label: 'Price', type: 'price_range', param_name: 'filter.v.price', range_max: 30000, min_value: { param_name: 'filter.v.price.gte', value: active.gte ? active.gte * 100 : null }, max_value: { param_name: 'filter.v.price.lte', value: active.lte ? active.lte * 100 : null }, url_to_remove: rm('filter.v.price.gte', active.gte), active_values: [] },
    { label: 'Availability', type: 'boolean', param_name: 'filter.v.availability', true_value: { label: 'In stock', value: '1', param_name: 'filter.v.availability', count: base.filter(pr => pr.available).length, active: !!active.avail }, active_values: [] },
  ];
  filters.forEach(f => { if (f.type === 'list') f.active_values = f.values.filter(v => v.active); });
  return { list, filters, sort };
};

/* ---------- SVG image generator ----------------------------------------- */
const svgFor = (id) => {
  const n = Number(id.replace(/\D/g, '')) || 1;
  const hue = (n * 37) % 360; const l1 = 82 + (n % 3) * 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},18%,${l1}%)"/><stop offset="1" stop-color="hsl(${hue + 20},22%,${l1 - 24}%)"/></linearGradient></defs><rect width="600" height="800" fill="url(#g)"/><ellipse cx="300" cy="${300 + (n % 5) * 30}" rx="120" ry="170" fill="hsl(${hue + 40},20%,${l1 - 40}%)" opacity=".45"/><rect x="230" y="${420 + (n % 4) * 20}" width="140" height="320" rx="60" fill="hsl(${hue + 40},20%,${l1 - 50}%)" opacity=".5"/><text x="24" y="770" font-family="Georgia" font-size="18" fill="rgba(0,0,0,.45)" letter-spacing="2">LOOK ${String(n % 12 + 1).padStart(2, '0')}</text></svg>`;
};

/* ---------- HTTP server ------------------------------------------------- */
const send = (res, status, body, type = 'text/html; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type }); res.end(body); };
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', c => b += c); req.on('end', () => resolve(b)); });
const cartJSON = () => ({ ...cartTotals(), items: cart.items.map(i => ({ ...i, product: undefined, variant: undefined, image: i.image ? i.image.src : null })) });
const sectionsPayload = async (ids, url) => { const out = {}; for (const id of (ids || '').split(',').filter(Boolean)) { const type = id === 'cart-drawer' ? 'cart-drawer' : id; out[id] = await renderSection(type, { id, settings: type === 'cart-drawer' ? { recommendation_collection: byHandle('all'), empty_link: '' } : {}, blocks: [], shopify_attributes: '' }, globalsFor(url, {})); } return out; };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (p.startsWith('/assets/')) { const f = path.join(THEME, 'assets', path.basename(p)); if (!fs.existsSync(f)) return send(res, 404, 'nope', 'text/plain'); const t = f.endsWith('.css') ? 'text/css' : 'application/javascript'; return send(res, 200, fs.readFileSync(f), t); }
    if (p.startsWith('/img/')) return send(res, 200, svgFor(path.basename(p)), 'image/svg+xml');
    if (p.startsWith('/shopify-assets/')) return send(res, 200, '', 'application/javascript');
    if (p === '/cart.js') return send(res, 200, JSON.stringify(cartJSON()), 'application/json');
    if (p === '/cart/add' || p === '/cart/add.js') { const b = JSON.parse(await readBody(req) || '{}'); (b.items || [b]).forEach(i => addItem(i.id, i.quantity || 1)); const out = { items: b.items || [b] }; if (b.sections) out.sections = await sectionsPayload(b.sections, url); return send(res, 200, JSON.stringify(out), 'application/json'); }
    if (p === '/cart/change' || p === '/cart/change.js') { const b = JSON.parse(await readBody(req) || '{}'); const line = cart.items[b.line - 1]; if (line) { line.quantity = b.quantity; line.final_line_price = line.original_line_price = line.quantity * line.price; if (b.quantity === 0) cart.items.splice(b.line - 1, 1); } const out = cartJSON(); if (b.sections) out.sections = await sectionsPayload(b.sections, url); return send(res, 200, JSON.stringify(out), 'application/json'); }
    if (p === '/cart/update' || p === '/cart/update.js') { const b = JSON.parse(await readBody(req) || '{}'); if (b.note !== undefined) cart.note = b.note; const out = cartJSON(); if (b.sections) out.sections = await sectionsPayload(b.sections, url); return send(res, 200, JSON.stringify(out), 'application/json'); }
    if (url.searchParams.get('sections')) return send(res, 200, JSON.stringify(await sectionsPayload(url.searchParams.get('sections'), url)), 'application/json');
    if (p === '/search/suggest') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const found = products.filter(pr => pr.title.toLowerCase().includes(q) || pr.type.toLowerCase().includes(q)).slice(0, 6);
      const cols = collections.filter(c => c.title.toLowerCase().includes(q)).slice(0, 3);
      const ps = { performed: true, terms: q, resources: { products: found, collections: cols, queries: found.slice(0, 2).map(pr => ({ text: pr.title, styled_text: `<mark>${q}</mark>${pr.title.slice(q.length)}`, url: `/search?q=${encodeURIComponent(pr.title)}` })) } };
      return send(res, 200, await renderSection('predictive-search', { id: 'predictive-search', settings: {}, blocks: [] }, globalsFor(url, { predictive_search: ps })));
    }
    if (p === '/recommendations/products') {
      const pid = Number(url.searchParams.get('product_id')); const recs = products.filter(pr => pr.id !== pid).slice(0, Number(url.searchParams.get('limit') || 4));
      const sid = url.searchParams.get('section_id');
      const sec = buildSection(sid, 'product-recommendations', { settings: { eyebrow: 'Styled with', title: 'Complete the look', intent: 'related', limit: 4 }, blocks: {} });
      return send(res, 200, await renderSection('product-recommendations', sec, globalsFor(url, { product: products.find(pr => pr.id === pid), recommendations: { performed: true, products_count: recs.length, products: recs } })));
    }
    const sectionId = url.searchParams.get('section_id');
    if (p === '/' ) return send(res, 200, await renderTemplate('index', globalsFor(url, { page_type: 'index' })));
    if (p === '/collections') return send(res, 200, await renderTemplate('list-collections', globalsFor(url, { page_type: 'list-collections' })));
    if (p.startsWith('/collections/')) {
      const c = byHandle(p.split('/')[2]); if (!c) return send(res, 404, await renderTemplate('404', globalsFor(url, { page_type: '404' })));
      const { list, filters, sort } = buildFilters(c.products, url);
      const coll = { ...c, products: list, products_count: list.length, filters, sort_by: sort };
      const g = globalsFor(url, { page_type: 'collection', collection: coll });
      if (sectionId) { const t = readJSON('templates/collection.json'); const d = t.sections[Object.keys(t.sections).find(k => k === sectionId)]; return send(res, 200, await renderSection(d.type, buildSection(sectionId, d.type, d), g)); }
      return send(res, 200, await renderTemplate('collection', g));
    }
    if (p.startsWith('/products/')) {
      let h = p.split('/')[2]; const isJson = h.endsWith('.js'); h = h.replace(/\.js$/, '');
      const pr = products.find(x => x.handle === h); if (!pr) return send(res, 404, await renderTemplate('404', globalsFor(url, { page_type: '404' })));
      if (isJson) return send(res, 200, JSON.stringify({ ...pr, media: undefined, collections: undefined, featured_image: pr.featured_media.src, variants: pr.variants.map(v => ({ ...v, featured_media: undefined })) }), 'application/json');
      const vid = url.searchParams.get('variant'); const prod = { ...pr }; if (vid) { const v = pr.variants.find(x => x.id === Number(vid)); if (v) prod.selected_or_first_available_variant = v; }
      return send(res, 200, await renderTemplate('product', globalsFor(url, { page_type: 'product', product: prod, recommendations: { performed: false } })));
    }
    if (p === '/cart') return send(res, 200, await renderTemplate('cart', globalsFor(url, { page_type: 'cart' })));
    if (p === '/search') {
      const q = url.searchParams.get('q') || ''; const found = q ? products.filter(pr => pr.title.toLowerCase().includes(q.toLowerCase()) || pr.type.toLowerCase().includes(q.toLowerCase())) : [];
      const { list, filters, sort } = buildFilters(found, url);
      const search = { performed: !!q, terms: q, results: list.map(pr => ({ ...pr, object_type: 'product' })), results_count: list.length, filters, sort_options: collections[0].sort_options, default_sort_by: 'relevance', sort_by: sort, url: '/search' };
      const g = globalsFor(url, { page_type: 'search', search });
      if (sectionId) return send(res, 200, await renderSection('main-search', buildSection(sectionId, 'main-search', { settings: {}, blocks: {} }), g));
      return send(res, 200, await renderTemplate('search', g));
    }
    if (p.startsWith('/pages/')) return send(res, 200, await renderTemplate(p.includes('contact') ? 'page.contact' : 'page', globalsFor(url, { page_type: 'page', page: { title: 'About Solenne', content: '<p>Solenne is a womenswear studio founded in Barcelona in 2024. We design in small runs, cut close and finish by hand.</p><p>Every drop is limited to two hundred pieces.</p>' } })));
    if (p.startsWith('/account/login')) return send(res, 200, await renderTemplate('customers/login', globalsFor(url, { page_type: 'customers/login' })));
    return send(res, 404, await renderTemplate('404', globalsFor(url, { page_type: '404' })));
  } catch (e) { console.error('RENDER ERROR', p, e.message, e.stack?.split('\n').slice(0, 4).join('\n')); return send(res, 500, `<pre>${e.stack}</pre>`); }
}).listen(PORT, () => console.log('harness on', PORT));
