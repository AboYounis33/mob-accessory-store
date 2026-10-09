import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
import { store as defaultStore } from './data.js';

const ALL = 'الكل';

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem('mobacc-cart') || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Number(item.quantity) > 0) : [];
  } catch {
    return [];
  }
}

const state = {
  category: ALL,
  products: [],
  status: 'loading', // loading | ready | error
  store: { ...defaultStore },
  cart: loadCart(),
  selectedProduct: null,
};

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const num = (value) => Number(value || 0);
const money = (value) => `${num(value).toLocaleString('ar-EG')} <small>ج.م</small>`;
const oldPriceHtml = (product) => (product.old_price ? `<del>${num(product.old_price).toLocaleString('ar-EG')} ج.م</del>` : '');
const safeUrl = (value) => (/^(https:\/\/|\/)/i.test(String(value || '')) ? String(value) : '');
const waNumber = () => String(state.store.whatsapp || '').replace(/\D/g, '');
const productById = (id) => state.products.find((product) => String(product.id) === String(id));
const categoryList = () => [ALL, ...new Set(state.products.map((product) => product.category).filter(Boolean))];

function imageHtml(product) {
  const url = safeUrl(product.image_url);
  return url
    ? `<img src='${esc(url)}' alt='${esc(product.name)}' loading='lazy' />`
    : `<span class='img-placeholder' aria-hidden='true'>✦</span>`;
}

async function api(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function persistCart() {
  localStorage.setItem('mobacc-cart', JSON.stringify(state.cart));
}

function getCartItems() {
  return state.cart.map((item) => ({ ...item, product: productById(item.id) })).filter((item) => item.product);
}

function cartCount() {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal() {
  return getCartItems().reduce((sum, item) => sum + num(item.product.price) * item.quantity, 0);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function applyStore() {
  const { displayPhone, tagline } = state.store;
  const link = `https://wa.me/${waNumber()}`;
  document.querySelectorAll('[data-store-phone]').forEach((el) => { el.textContent = displayPhone; });
  document.querySelectorAll('[data-store-tagline]').forEach((el) => { el.textContent = tagline; });
  document.querySelectorAll('[data-store-wa]').forEach((el) => { el.href = link; });
}

function renderCategories() {
  const list = categoryList();
  $('#categoryStrip').classList.toggle('is-hidden', list.length < 2);
  $('#categoryList').innerHTML = list.map((category) => `
    <button class='category-pill ${state.category === category ? 'active' : ''}' data-category='${esc(category)}' type='button'>
      ${category === ALL ? 'كل الاختيارات' : esc(category)}
    </button>`).join('');
}

function renderProducts() {
  const grid = $('#productGrid');
  if (state.status === 'loading') {
    grid.innerHTML = `<div class='grid-message'>بنحمّل المنتجات…</div>`;
    return;
  }
  if (state.status === 'error') {
    grid.innerHTML = `<div class='grid-message'>مش قادرين نحمّل المنتجات دلوقتي. جرّب تاني بعد شوية.</div>`;
    return;
  }
  const visible = state.category === ALL ? state.products : state.products.filter((product) => product.category === state.category);
  if (!visible.length) {
    grid.innerHTML = `<div class='grid-message'>المنتجات هتتضاف قريب. كلّمنا على واتساب لو محتاج حاجة معينة.</div>`;
    return;
  }
  grid.innerHTML = visible.map((product, index) => `
    <article class='product-card ${index === 0 ? 'featured-card' : ''}' data-product-id='${esc(product.id)}'>
      <button class='product-image-wrap' data-action='details' type='button' aria-label='عرض تفاصيل ${esc(product.name)}'>
        ${product.is_featured ? `<span class='product-badge'>مميز</span>` : ''}
        ${imageHtml(product)}
        <span class='quick-view'>عرض سريع ↗</span>
      </button>
      <div class='product-card-body'>
        <div class='product-meta'><span>${esc(product.category)}</span></div>
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description)}</p>
        <div class='product-bottom'><div><strong>${money(product.price)}</strong>${oldPriceHtml(product)}</div><button class='add-button' data-action='add' type='button' aria-label='إضافة ${esc(product.name)} للسلة'>+</button></div>
      </div>
    </article>`).join('');
}

function renderCart() {
  const items = getCartItems();
  const count = cartCount();
  $('#cartCount').textContent = count;
  $('#drawerCount').textContent = count;
  $('#cartTotal').innerHTML = money(cartTotal());

  if (!items.length) {
    $('#cartContent').innerHTML = `<div class='empty-cart'><div class='empty-cart-icon'>🛒</div><h3>السلة لسه فاضية</h3><p>اختار حاجة تعجبك وهتظهر هنا.</p><a class='button button-primary' href='#products' id='shopNow'>ابدأ التسوق <span>←</span></a></div>`;
    $('#checkoutArea').classList.add('is-hidden');
    return;
  }

  $('#checkoutArea').classList.remove('is-hidden');
  $('#cartContent').innerHTML = `<div class='cart-items'>${items.map(({ product, quantity }) => `
    <div class='cart-item'>
      ${imageHtml(product)}
      <div class='cart-item-info'><span>${esc(product.category)}</span><h3>${esc(product.short_name || product.name)}</h3><strong>${money(product.price)}</strong></div>
      <div class='quantity-control'><button data-cart-action='decrease' data-id='${esc(product.id)}' type='button'>−</button><b>${quantity}</b><button data-cart-action='increase' data-id='${esc(product.id)}' type='button'>+</button></div>
      <button class='remove-item' data-cart-action='remove' data-id='${esc(product.id)}' aria-label='حذف ${esc(product.name)}' type='button'>×</button>
    </div>`).join('')}</div><div class='cart-tip'><span>✦</span> تقدر تكتب اللون أو الموديل في الملاحظات قبل الإرسال.</div>`;
}

function addToCart(id, quantity = 1) {
  const found = state.cart.find((item) => String(item.id) === String(id));
  if (found) found.quantity += quantity;
  else state.cart.push({ id, quantity });
  persistCart();
  renderCart();
  showToast('اتضاف للسلة بنجاح');
}

function updateQuantity(id, delta) {
  const item = state.cart.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((entry) => String(entry.id) !== String(id));
  persistCart();
  renderCart();
}

function openCart() {
  $('#cartDrawer').classList.add('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'false');
  $('#drawerBackdrop').classList.add('visible');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  $('#cartDrawer').classList.remove('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'true');
  $('#drawerBackdrop').classList.remove('visible');
  document.body.classList.remove('no-scroll');
}

function openProduct(id) {
  const product = productById(id);
  if (!product) return;
  state.selectedProduct = product;
  $('#modalBody').innerHTML = `<div class='modal-product'><div class='modal-image'>${imageHtml(product)}</div><div class='modal-info'>${product.is_featured ? `<span class='product-badge'>مميز</span>` : ''}<span class='section-kicker'>${esc(product.category)}</span><h2>${esc(product.name)}</h2><p>${esc(product.description)}</p><div class='modal-price'>${money(product.price)} ${oldPriceHtml(product)}</div>${product.color ? `<div class='modal-color'><span>اللون المتاح</span><b>${esc(product.color)}</b></div>` : ''}<div class='modal-actions'><div class='modal-quantity'><button data-modal-quantity='decrease' type='button'>−</button><b id='modalQuantity'>1</b><button data-modal-quantity='increase' type='button'>+</button></div><button class='button button-primary' data-action='modal-add' type='button'>أضف للسلة <span>←</span></button></div></div></div>`;
  $('#productModal').classList.add('open');
  $('#productModal').setAttribute('aria-hidden', 'false');
  $('#modalBackdrop').classList.add('visible');
  document.body.classList.add('no-scroll');
}

function closeProduct() {
  $('#productModal').classList.remove('open');
  $('#productModal').setAttribute('aria-hidden', 'true');
  $('#modalBackdrop').classList.remove('visible');
  document.body.classList.remove('no-scroll');
  state.selectedProduct = null;
}

function createWhatsappMessage(form) {
  const data = new FormData(form);
  const items = getCartItems();
  const lines = items.map(({ product, quantity }) => `• ${product.name} — ${quantity} × ${num(product.price)} ج.م = ${num(product.price) * quantity} ج.م`);
  return [
    `طلب جديد من ${state.store.name}`,
    '',
    `الاسم: ${data.get('name')}`,
    `رقم الموبايل: ${data.get('phone')}`,
    `العنوان / الملاحظات: ${data.get('notes') || 'لا توجد'}`,
    '',
    'المنتجات:',
    ...lines,
    '',
    `الإجمالي: ${cartTotal()} ج.م`,
  ].join('\n');
}

async function loadData() {
  const [settingsResult, productsResult] = await Promise.allSettled([
    api('store_settings?select=store_name,tagline,display_phone,whatsapp&limit=1'),
    api('products?select=id,name,short_name,category,price,old_price,color,image_url,description,is_featured&is_active=eq.true&order=sort_order.asc.nullslast,created_at.desc'),
  ]);

  if (settingsResult.status === 'fulfilled' && settingsResult.value[0]) {
    const settings = settingsResult.value[0];
    state.store = {
      name: settings.store_name || defaultStore.name,
      tagline: settings.tagline || defaultStore.tagline,
      displayPhone: settings.display_phone || defaultStore.displayPhone,
      whatsapp: settings.whatsapp || defaultStore.whatsapp,
    };
  }

  if (productsResult.status === 'fulfilled') {
    state.products = productsResult.value;
    state.status = 'ready';
    state.cart = state.cart.filter((item) => productById(item.id));
    persistCart();
  } else {
    state.status = 'error';
  }

  applyStore();
  renderCategories();
  renderProducts();
  renderCart();
}

$('#categoryList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
  $('#products').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#clearCategory').addEventListener('click', () => {
  state.category = ALL;
  renderCategories();
  renderProducts();
});

$('#productGrid').addEventListener('click', (event) => {
  const card = event.target.closest('[data-product-id]');
  if (!card) return;
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'add') addToCart(card.dataset.productId);
  else if (action === 'details' || event.target.closest('.product-card-body')) openProduct(card.dataset.productId);
});

$('#cartContent').addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const { cartAction, id } = button.dataset;
  if (cartAction === 'increase') updateQuantity(id, 1);
  if (cartAction === 'decrease') updateQuantity(id, -1);
  if (cartAction === 'remove') updateQuantity(id, -999);
});

$('#cartButton').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#drawerBackdrop').addEventListener('click', closeCart);
$('#closeModal').addEventListener('click', closeProduct);
$('#modalBackdrop').addEventListener('click', closeProduct);

document.addEventListener('click', (event) => {
  const modalQuantityButton = event.target.closest('[data-modal-quantity]');
  if (modalQuantityButton) {
    const quantity = $('#modalQuantity');
    const next = Math.max(1, Number(quantity.textContent) + (modalQuantityButton.dataset.modalQuantity === 'increase' ? 1 : -1));
    quantity.textContent = next;
  }
  if (event.target.closest('[data-action="modal-add"]') && state.selectedProduct) {
    addToCart(state.selectedProduct.id, Number($('#modalQuantity').textContent));
    closeProduct();
    openCart();
  }
  if (event.target.id === 'shopNow') closeCart();
});

$('#checkoutForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!getCartItems().length) return;
  const message = createWhatsappMessage(event.currentTarget);
  window.open(`https://wa.me/${waNumber()}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});

renderCategories();
renderProducts();
renderCart();
loadData();
