import { categories, products, store } from './data.js';

const state = {
  category: 'الكل',
  cart: JSON.parse(localStorage.getItem('mobacc-cart') || '[]'),
  selectedProduct: null,
};

const $ = (selector) => document.querySelector(selector);
const money = (value) => `${value.toLocaleString('ar-EG')} <small>ج.م</small>`;
const productById = (id) => products.find((product) => product.id === id);

function persistCart() {
  localStorage.setItem('mobacc-cart', JSON.stringify(state.cart));
}

function getCartItems() {
  return state.cart.map((item) => ({ ...item, product: productById(item.id) })).filter((item) => item.product);
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal() {
  return getCartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderCategories() {
  $('#categoryList').innerHTML = categories.map((category) => `
    <button class="category-pill ${state.category === category ? 'active' : ''}" data-category="${category}" type="button">
      ${category === 'الكل' ? 'كل الاختيارات' : category}
    </button>`).join('');
}

function renderProducts() {
  const visible = state.category === 'الكل' ? products : products.filter((product) => product.category === state.category);
  $('#productGrid').innerHTML = visible.map((product, index) => `
    <article class="product-card ${index === 0 ? 'featured-card' : ''}" data-product-id="${product.id}">
      <button class="product-image-wrap" data-action="details" type="button" aria-label="عرض تفاصيل ${product.name}">
        <span class="product-badge">${product.badge}</span>
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span class="quick-view">عرض سريع ↗</span>
      </button>
      <div class="product-card-body">
        <div class="product-meta"><span>${product.category}</span><span class="product-rating">★ 4.9</span></div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-bottom"><div><strong>${money(product.price)}</strong><del>${product.oldPrice} ج.م</del></div><button class="add-button" data-action="add" type="button" aria-label="إضافة ${product.name} للسلة">+</button></div>
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
    $('#cartContent').innerHTML = `<div class="empty-cart"><div class="empty-cart-icon">🛒</div><h3>السلة لسه فاضية</h3><p>اختار حاجة تعجبك وهتظهر هنا.</p><a class="button button-primary" href="#products" id="shopNow">ابدأ التسوق <span>←</span></a></div>`;
    $('#checkoutArea').classList.add('is-hidden');
    return;
  }

  $('#checkoutArea').classList.remove('is-hidden');
  $('#cartContent').innerHTML = `<div class="cart-items">${items.map(({ product, quantity }) => `
    <div class="cart-item">
      <img src="${product.image}" alt="${product.name}" />
      <div class="cart-item-info"><span>${product.category}</span><h3>${product.shortName}</h3><strong>${money(product.price)}</strong></div>
      <div class="quantity-control"><button data-cart-action="decrease" data-id="${product.id}" type="button">−</button><b>${quantity}</b><button data-cart-action="increase" data-id="${product.id}" type="button">+</button></div>
      <button class="remove-item" data-cart-action="remove" data-id="${product.id}" aria-label="حذف ${product.name}" type="button">×</button>
    </div>`).join('')}</div><div class="cart-tip"><span>✦</span> تقدر تكتب اللون أو الموديل في الملاحظات قبل الإرسال.</div>`;
}

function addToCart(id, quantity = 1) {
  const found = state.cart.find((item) => item.id === id);
  if (found) found.quantity += quantity;
  else state.cart.push({ id, quantity });
  persistCart();
  renderCart();
  showToast('اتضاف للسلة بنجاح');
}

function updateQuantity(id, delta) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.id !== id);
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
  $('#modalBody').innerHTML = `<div class="modal-product"><div class="modal-image"><img src="${product.image}" alt="${product.name}" /></div><div class="modal-info"><span class="product-badge">${product.badge}</span><span class="section-kicker">${product.category}</span><h2>${product.name}</h2><p>${product.description}</p><div class="modal-price">${money(product.price)} <del>${product.oldPrice} ج.م</del></div><div class="modal-color"><span>اللون المتاح</span><b>${product.color}</b></div><div class="modal-actions"><div class="modal-quantity"><button data-modal-quantity="decrease" type="button">−</button><b id="modalQuantity">1</b><button data-modal-quantity="increase" type="button">+</button></div><button class="button button-primary" data-action="modal-add" type="button">أضف للسلة <span>←</span></button></div></div></div>`;
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
  const lines = items.map(({ product, quantity }) => `• ${product.name} — ${quantity} × ${product.price} ج.م = ${product.price * quantity} ج.م`);
  return [
    `طلب جديد من ${store.name}`,
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

$('#categoryList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
  $('#products').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#clearCategory').addEventListener('click', () => {
  state.category = 'الكل';
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
  window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});

renderCategories();
renderProducts();
renderCart();
