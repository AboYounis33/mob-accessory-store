import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector) => document.querySelector(selector);
let editingProduct = null;

function notify(message, isError = false) { const toast = $('#toast'); toast.textContent = message; toast.className = `toast show ${isError ? 'error' : ''}`; setTimeout(() => toast.className = 'toast', 2400); }
function setView(authenticated) { $('#loginView').classList.toggle('is-hidden', authenticated); $('#dashboardView').classList.toggle('is-hidden', !authenticated); }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

async function loadSettings() {
  const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
  if (error) throw error;
  const form = $('#settingsForm'); Object.entries(data).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
}

async function loadProducts() {
  const list = $('#productsList');
  const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<div class="error-box">${error.message}</div>`; return; }
  list.innerHTML = data.length ? data.map((product) => `<button class="product-row ${product.is_active ? '' : 'muted'}" data-id="${product.id}" type="button"><span class="product-thumb">${product.image_url ? `<img src="${product.image_url}" alt="" />` : '✦'}</span><span class="product-row-copy"><b>${product.name}</b><small>${product.category} · ${Number(product.price).toLocaleString('ar-EG')} ج.م</small></span><span class="product-state">${product.is_active ? 'ظاهر' : 'مخفي'} <i>↗</i></span></button>`).join('') : '<div class="empty-state">لسه مفيش منتجات. ابدأ بإضافة أول منتج.</div>';
}

function openEditor(product = null) {
  editingProduct = product; const form = $('#productForm'); form.reset(); form.elements.id.value = product?.id || ''; $('#editorTitle').textContent = product ? `تعديل: ${product.name}` : 'إضافة منتج جديد'; $('#deleteProductButton').classList.toggle('is-hidden', !product); if (product) Object.entries(product).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].type === 'checkbox' ? form.elements[key].checked = Boolean(value) : form.elements[key].value = value ?? ''; }); $('#productEditor').classList.remove('is-hidden'); $('#productEditor').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function closeEditor() { editingProduct = null; $('#productEditor').classList.add('is-hidden'); }

$('#loginForm').addEventListener('submit', async (event) => { event.preventDefault(); const message = $('#loginMessage'); message.textContent = 'جارٍ تسجيل الدخول…'; const { error } = await supabase.auth.signInWithPassword({ email: event.currentTarget.email.value, password: event.currentTarget.password.value }); if (error) { message.textContent = 'بيانات الدخول غير صحيحة أو المستخدم غير مُفعّل.'; return; } message.textContent = ''; setView(true); await Promise.all([loadSettings(), loadProducts()]); });
$('#logoutButton').addEventListener('click', async () => { await supabase.auth.signOut(); setView(false); });
$('#settingsForm').addEventListener('submit', async (event) => { event.preventDefault(); const status = $('#settingsStatus'); const values = formObject(event.currentTarget); delete values.id; values.updated_at = new Date().toISOString(); const { data: current } = await supabase.from('store_settings').select('id').limit(1).single(); const { error } = await supabase.from('store_settings').update(values).eq('id', current.id); status.textContent = error ? error.message : 'تم حفظ إعدادات المتجر بنجاح.'; if (!error) notify('اتحفظت إعدادات المتجر'); });
$('#productsList').addEventListener('click', async (event) => { const row = event.target.closest('[data-id]'); if (!row) return; const { data, error } = await supabase.from('products').select('*').eq('id', row.dataset.id).single(); if (!error) openEditor(data); });
$('#newProductButton').addEventListener('click', () => openEditor()); $('#cancelEditor').addEventListener('click', closeEditor);
$('#productForm').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const raw = formObject(form); const payload = { name: raw.name, short_name: raw.short_name || raw.name, slug: (raw.name || 'product').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now(), category: raw.category, price: Number(raw.price || 0), old_price: raw.old_price ? Number(raw.old_price) : null, color: raw.color || null, image_url: raw.image_url || null, description: raw.description || '', is_active: Boolean(raw.is_active), is_featured: Boolean(raw.is_featured), updated_at: new Date().toISOString() }; const id = raw.id; const result = id ? await supabase.from('products').update(payload).eq('id', id) : await supabase.from('products').insert(payload); if (result.error) { $('#productStatus').textContent = result.error.message; return; } notify(id ? 'تم تعديل المنتج' : 'تمت إضافة المنتج'); closeEditor(); await loadProducts(); });
$('#deleteProductButton').addEventListener('click', async () => { if (!editingProduct || !confirm(`حذف ${editingProduct.name}؟`)) return; const { error } = await supabase.from('products').delete().eq('id', editingProduct.id); if (error) { notify(error.message, true); return; } notify('تم حذف المنتج'); closeEditor(); await loadProducts(); });
supabase.auth.getSession().then(async ({ data: { session } }) => { setView(Boolean(session)); if (session) await Promise.all([loadSettings(), loadProducts()]); });
