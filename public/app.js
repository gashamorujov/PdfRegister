'use strict';
/* Sənəd Axını — client application (no inline handlers, all dynamic text escaped) */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Deployment-agnostic URL resolver: works at the domain root or under any sub-path (BASE_PATH). */
const BASE_URL = new URL('.', document.baseURI);
const STATIC_PUBLIC_PREFIX = $('meta[name="docflow-static-root"]')?.content || '';
const resolveUrl = url => {
  const raw = String(url ?? '');
  if (!raw) return raw;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) || /^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;
  try { return new URL(raw.replace(/^\/+/, ''), BASE_URL).href; } catch { return raw; }
};

/* ---------- Icons (24px grid, stroke based) ---------- */
const ICONS = {
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'image-plus': '<path d="M16 5h6M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

/* ---------- State ---------- */
const state = {
  screen: 'home',
  images: [],
  fullName: '',
  phone: '',
  facing: 'environment',
  stream: null,
  admin: false,
  view: { filter: '', q: '' },
  config: { limits: { maxImages: 20, maxUploadMb: 15 } }
};
let pollTimer = null;
let toastTimer = null;
let docsReq = 0;
let docsSig = '';
const urls = new Map();

/* ---------- Helpers ---------- */
const objUrl = file => { if (!urls.has(file)) urls.set(file, URL.createObjectURL(file)); return urls.get(file); };
const dropUrl = file => { const u = urls.get(file); if (u) { URL.revokeObjectURL(u); urls.delete(file); } };
const clearImages = () => { state.images.forEach(dropUrl); state.images = []; };
const fmtSize = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = iso => { const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const safePdf = p => (/^\/files\/[a-z0-9-]+\.pdf$/i.test(String(p || '')) ? resolveUrl(p) : '#');

function toast(message, type = '') {
  const el = $('#toast');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'error' ? icon('alert') : type === 'success' ? icon('check-circle') : ''}<span>${esc(message)}</span>`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

async function api(url, opt = {}) {
  let res;
  try { res = await fetch(resolveUrl(url), { credentials: 'include', ...opt }); }
  catch { throw Object.assign(new Error('Serverlə əlaqə qurulmadı. İnternet bağlantısını yoxlayın.'), { status: 0 }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Xəta baş verdi.'), { status: res.status });
  return data;
}
const send = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

function sendForm(url, fd, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', resolveUrl(url));
    x.withCredentials = true;
    x.responseType = 'json';
    x.timeout = 180000;
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      const d = x.response || {};
      if (x.status >= 200 && x.status < 300) resolve(d);
      else reject(Object.assign(new Error(d.error || 'Göndərmək mümkün olmadı. Yenidən cəhd edin.'), { status: x.status }));
    };
    x.onerror = () => reject(new Error('Serverlə əlaqə qurulmadı. İnternet bağlantısını yoxlayın.'));
    x.ontimeout = () => reject(new Error('Göndərmə çox uzun çəkdi. Bağlantınızı yoxlayıb yenidən cəhd edin.'));
    x.send(fd);
  });
}

function handleError(err) {
  if (err && err.status === 401 && state.admin) {
    state.admin = false;
    stopPolling();
    toast('Admin sessiyası bitib. Yenidən daxil olun.', 'error');
    home();
    return;
  }
  toast((err && err.message) || 'Xəta baş verdi.', 'error');
}
const guard = fn => async (...args) => { try { return await fn(...args); } catch (err) { handleError(err); } };

async function busy(btn, fn) {
  if (!btn) return fn();
  btn.disabled = true;
  btn.classList.add('is-loading');
  btn.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>');
  try { return await fn(); }
  finally {
    if (btn.isConnected) { btn.disabled = false; btn.classList.remove('is-loading'); $('.spinner', btn)?.remove(); }
  }
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'visually-hidden';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy') ? resolve() : reject(new Error('copy')); } catch (e) { reject(e); } finally { ta.remove(); }
  });
}

function formatFullName(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean)
    .map(word => word.split(/([-'])/).map(part => (part.length === 1 && /[-']/.test(part) ? part : part.charAt(0).toLocaleUpperCase('az-AZ') + part.slice(1).toLocaleLowerCase('az-AZ'))).join(''))
    .join(' ');
}
function parsePhone(value) {
  let local = String(value || '').replace(/\D/g, '');
  if (local.startsWith('994')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);
  if (!/^(10|50|51|55|60|70|77|99)\d{7}$/.test(local)) return null;
  return `+994 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

/* ---------- Shell ---------- */
function stopStream() { if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; } }
let adminEvents = null;
function stopPolling() { clearInterval(pollTimer); pollTimer = null; if (adminEvents) { adminEvents.close(); adminEvents = null; } }
function closeModal() { const m = $('.modal'); if (m) { const back = m._returnFocus; m.remove(); back?.focus?.(); } }

function shell(content, screen) {
  stopStream();
  stopPolling();
  closeModal();
  state.screen = screen;
  $('#app').innerHTML = `<div class="page">
    <header class="topbar"><div class="topbar-inner">
      <button type="button" class="brand" data-action="logo" aria-label="AGG"><span class="brand-mark">AGG</span><span class="brand-text">Sənəd Axını</span></button>
    </div></header>
    <main class="main" id="main">${content}</main>
  </div>`;
  window.scrollTo(0, 0);
}

function stepper(current) {
  const steps = ['Şəkillər', 'Məlumat', 'Yoxlama'];
  return `<ol class="stepper" aria-label="Addımlar">${steps.map((label, i) => {
    const n = i + 1;
    const cls = n < current ? 'done' : n === current ? 'current' : '';
    return `<li class="${cls}"${n === current ? ' aria-current="step"' : ''}>${n}. ${label}</li>`;
  }).join('')}</ol>`;
}

/* ---------- Modal helpers ---------- */
function openModal(html) {
  closeModal();
  const prev = document.activeElement;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" role="presentation"><div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">${html}</div></div>`);
  const m = $('.modal');
  m._returnFocus = prev;
  (m.querySelector('[autofocus]') || m.querySelector('input,button'))?.focus();
  return m;
}
function confirmDialog({ title, message, confirm = 'Təsdiqlə', danger = false }) {
  return new Promise(resolve => {
    const m = openModal(`<h2 id="modalTitle">${esc(title)}</h2><p class="muted">${esc(message)}</p>
      <div class="modal-actions"><button type="button" class="btn" data-modal="no" autofocus>Ləğv et</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal="yes">${esc(confirm)}</button></div>`);
    const done = v => { closeModal(); resolve(v); };
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-modal]');
      if (b) done(b.dataset.modal === 'yes');
      else if (e.target === m) done(false);
    });
    m._cancel = () => done(false);
  });
}

/* ---------- Home ---------- */
function home() {
  const n = state.images.length;
  shell(`
    ${n ? `<div class="resume" role="region" aria-label="Davam et">
      <div><strong>${n} şəkil hazırdır</strong><span class="muted small">Əvvəl əlavə etdiyiniz şəkillər saxlanılıb.</span></div>
      <div class="row start"><button type="button" class="btn btn-ghost btn-sm" data-action="clear">Təmizlə</button>
      <button type="button" class="btn btn-primary btn-sm" data-action="resume">Davam et ${icon('arrow-right', 'sm')}</button></div>
    </div>` : ''}
    <div class="actions">
      <button type="button" class="action is-primary" data-action="camera">
        <span class="action-icon">${icon('camera', 'lg')}</span>
        <span><span class="action-title">Şəklini çək</span><span class="action-desc">Kamera ilə sənədi çəkin</span></span>${icon('chevron', 'chev')}
      </button>
      <button type="button" class="action" data-action="gallery">
        <span class="action-icon">${icon('image', 'lg')}</span>
        <span><span class="action-title">Qalereyadan yüklə</span><span class="action-desc">Cihazınızdakı şəkilləri seçin</span></span>${icon('chevron', 'chev')}
      </button>
      <button type="button" class="action" data-action="samples">
        <span class="action-icon">${icon('file-text', 'lg')}</span>
        <span><span class="action-title">Nümunə</span><span class="action-desc">Düzgün çəkilmiş sənəd nümunələrinə baxın</span></span>${icon('chevron', 'chev')}
      </button>
    </div>`, 'home');
}

/* ---------- Image picking ---------- */
function addFiles(list) {
  const limits = state.config.limits;
  const files = [...list];
  const images = files.filter(f => /^image\/(jpeg|png|webp)$/.test(f.type) || (!f.type && /\.(jpe?g|png|webp)$/i.test(f.name)));
  if (images.length < files.length) toast('Yalnız JPG, PNG və ya WebP şəkilləri qəbul olunur.', 'error');
  const sized = images.filter(f => f.size <= limits.maxUploadMb * 1048576);
  if (sized.length < images.length) toast(`Hər şəkil ən çox ${limits.maxUploadMb} MB ola bilər.`, 'error');
  const room = limits.maxImages - state.images.length;
  if (sized.length > room) toast(`Ən çox ${limits.maxImages} şəkil göndərmək olar.`, 'error');
  const take = sized.slice(0, Math.max(room, 0));
  state.images.push(...take);
  return take.length;
}

/* ---------- Preview ---------- */
function preview() {
  if (!state.images.length) return home();
  const n = state.images.length;
  shell(`${stepper(1)}
    <div class="page-head"><div><h2>Şəkilləri yoxlayın</h2><p>${n} şəkil seçilib. Sıra PDF səhifələrinin ardıcıllığıdır.</p></div></div>
    <div class="photo-list" id="photos">${state.images.map((f, i) => `
      <article class="photo" draggable="true" data-i="${i}">
        <img src="${objUrl(f)}" alt="Şəkil ${i + 1}">
        <div class="photo-meta"><strong>Səhifə ${i + 1}</strong><span>${esc(fmtSize(f.size))}</span></div>
        <div class="photo-tools">
          <button type="button" class="btn btn-icon" data-action="photo-up" data-i="${i}" aria-label="Yuxarı daşı" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button type="button" class="btn btn-icon" data-action="photo-down" data-i="${i}" aria-label="Aşağı daşı" ${i === n - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <button type="button" class="btn btn-icon btn-danger" data-action="photo-del" data-i="${i}" aria-label="Şəkli sil">${icon('trash')}</button>
        </div>
      </article>`).join('')}
    </div>
    <div class="flow-actions">
      <button type="button" class="btn btn-ghost" data-action="home">${icon('arrow-left')} Geri</button>
      <button type="button" class="btn" data-action="gallery">${icon('image-plus')} Şəkil əlavə et</button>
      <button type="button" class="btn btn-primary grow" data-action="to-info">Təsdiq et və davam et ${icon('arrow-right')}</button>
    </div>`, 'preview');
}

/* ---------- Camera ---------- */
function camera() {
  shell(`
    <div class="page-head"><div><h2>Sənədi çərçivəyə yerləşdirin</h2><p>Sənəd tam görünsün və işıq yaxşı olsun.</p></div>
      <button type="button" class="btn btn-sm" data-action="cam-back">${icon('arrow-left', 'sm')} Geri</button></div>
    <div class="camera-card">
      <div class="camera-frame" id="camFrame">
        <video id="video" autoplay playsinline muted></video>
        <div class="viewfinder" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="camera-tip">Sənədin dörd kənarını çərçivəyə salın</div>
      </div>
      <div class="camera-bar">
        <div class="camera-status"><span class="live-dot" id="camDot"></span><span id="camStatus" role="status">Kamera hazırlanır…</span></div>
        <div class="camera-buttons">
          <button type="button" class="btn" data-action="cam-switch">${icon('refresh')} Kameranı dəyiş</button>
          <button type="button" class="btn btn-primary" data-action="cam-shot"><span class="shutter" aria-hidden="true"></span> Şəkil çək</button>
        </div>
      </div>
    </div>
    <section aria-labelledby="capTitle">
      <div class="capture-head"><h3 id="capTitle">Çəkilən şəkillər <span class="count" id="camCount">0</span></h3><span class="muted small">Lazım olmayanı silə bilərsiniz</span></div>
      <div class="capture-strip" id="camStrip"></div>
    </section>
    <div class="flow-actions"><button type="button" class="btn btn-primary grow" id="camDone" data-action="cam-done">Təsdiq et və davam et ${icon('arrow-right')}</button></div>`, 'camera');
  renderStrip();
  startStream();
}

function setCamStatus(text, ok) {
  const s = $('#camStatus'), d = $('#camDot');
  if (s) s.textContent = text;
  if (d) d.classList.toggle('offline', !ok);
}
function renderStrip() {
  const strip = $('#camStrip');
  if (!strip) return;
  $('#camCount').textContent = state.images.length;
  $('#camDone').disabled = !state.images.length;
  strip.innerHTML = state.images.length
    ? state.images.map((f, i) => `<figure class="capture-thumb"><img src="${objUrl(f)}" alt="Şəkil ${i + 1}"><span class="num">${i + 1}</span><button type="button" class="remove" data-action="cam-del" data-i="${i}" aria-label="${i + 1}-ci şəkli sil">${icon('x', 'sm')}</button></figure>`).join('')
    : `<div class="capture-empty">${icon('image-plus')}<span>Çəkilən şəkillər burada görünəcək</span></div>`;
}
async function startStream() {
  stopStream();
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: state.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e;
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    if (state.screen !== 'camera') { stream.getTracks().forEach(t => t.stop()); return; }
    state.stream = stream;
    const v = $('#video');
    v.srcObject = stream;
    await v.play().catch(() => {});
    setCamStatus('Kamera hazırdır. Sənədi çəkin.', true);
  } catch (e) {
    const msg = e.name === 'NotAllowedError' ? 'Kamera icazəsi verilməyib. Brauzer ayarlarında icazə verib yenidən yoxlayın.'
      : e.name === 'NotFoundError' ? 'Bu cihazda kamera tapılmadı. Qalereyadan istifadə edin.'
      : e.name === 'NotSupportedError' ? 'Kamera bu bağlantıda dəstəklənmir (HTTPS tələb olunur). Qalereyadan istifadə edin.'
      : 'Kamera açıla bilmədi. İcazəni yoxlayın və ya qalereyadan istifadə edin.';
    setCamStatus(msg, false);
  }
}
function takeShot() {
  const v = $('#video');
  if (!v || !v.videoWidth) return toast('Kamera hələ hazır deyil. Bir az gözləyin.', 'error');
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  c.toBlob(b => {
    if (!b) return toast('Şəkli yadda saxlamaq mümkün olmadı.', 'error');
    if (state.images.length >= state.config.limits.maxImages) return toast(`Ən çox ${state.config.limits.maxImages} şəkil göndərmək olar.`, 'error');
    state.images.push(new File([b], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    renderStrip();
    const f = $('#camFrame');
    f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
    setCamStatus(`${state.images.length} şəkil çəkilib. Davam edə bilərsiniz.`, true);
  }, 'image/jpeg', .92);
}

/* ---------- Info ---------- */
function info() {
  shell(`${stepper(2)}
    <div class="page-head"><div><h2>Məlumatlarınızı daxil edin</h2></div></div>
    <form class="card form" data-form="info" novalidate>
      <label class="field"><span>Tam ad</span>
        <input class="input" id="fullName" name="fullName" autocomplete="name" maxlength="120" placeholder="Məmmədov Məhəmməd Əli" value="${esc(state.fullName)}" aria-describedby="nameErr">
        <span class="field-error" id="nameErr"></span></label>
      <label class="field"><span>Əlaqə nömrəsi</span>
        <span class="input-group"><span class="prefix">+994</span>
        <input class="input" id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="50 123 45 67" value="${esc(state.phone.replace('+994 ', ''))}" aria-describedby="phoneErr"></span>
        <span class="field-error" id="phoneErr"></span></label>
      <div class="flow-actions tight">
        <button type="button" class="btn btn-ghost" data-action="to-preview">${icon('arrow-left')} Geri</button>
        <button type="submit" class="btn btn-primary grow">Yekun yoxlama ${icon('arrow-right')}</button>
      </div>
    </form>`, 'info');
}
function setFieldError(inputId, errId, msg) {
  const i = $('#' + inputId), e = $('#' + errId);
  e.textContent = msg || '';
  if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
}
function submitInfo() {
  const name = formatFullName($('#fullName').value);
  const phone = parsePhone($('#phone').value);
  state.fullName = name;
  if (phone) state.phone = phone;
  setFieldError('fullName', 'nameErr', name.length < 3 ? 'Tam adınızı daxil edin.' : '');
  setFieldError('phone', 'phoneErr', phone ? '' : 'Telefon nömrəsi düzgün deyil. Nümunə: 50 123 45 67');
  if (name.length < 3) return $('#fullName').focus();
  if (!phone) return $('#phone').focus();
  confirmPage();
}

/* ---------- Confirm & submit ---------- */
function confirmPage() {
  shell(`${stepper(3)}
    <div class="page-head"><div><h2>Göndərmədən əvvəl yoxlayın</h2></div></div>
    <div class="card">
      <dl class="summary">
        <div><dt>Tam ad</dt><dd>${esc(state.fullName)}</dd></div>
        <div><dt>Telefon</dt><dd>${esc(state.phone)}</dd></div>
        <div><dt>Şəkil sayı</dt><dd>${state.images.length}</dd></div>
      </dl>
      <div class="thumb-grid">${state.images.map((f, i) => `<div class="thumb"><img src="${objUrl(f)}" alt="Şəkil ${i + 1}"><span class="num">${i + 1}</span></div>`).join('')}</div>
    </div>
    <div id="sendProgress" hidden class="card"><div class="row"><strong id="sendLabel">Göndərilir…</strong><span class="muted small" id="sendPct">0%</span></div><div class="progress mt-2"><i id="sendBar"></i></div></div>
    <div class="flow-actions" id="confirmActions">
      <button type="button" class="btn btn-ghost" data-action="to-info">${icon('arrow-left')} Dəyiş</button>
      <button type="button" class="btn btn-primary grow" data-action="send">${icon('upload')} Sənədləri göndər</button>
    </div>`, 'confirm');
}
async function submitDocuments(btn) {
  const fd = new FormData();
  fd.append('fullName', state.fullName);
  fd.append('phone', state.phone);
  fd.append('courseCodes', '[]');
  state.images.forEach(f => fd.append('images', f));
  const box = $('#sendProgress'), bar = $('#sendBar'), pct = $('#sendPct'), label = $('#sendLabel');
  box.hidden = false;
  bar.style.width = '0%';
  const locks = $$('#confirmActions button');
  locks.forEach(b => { b.disabled = true; });
  try {
    await busy(btn, () => sendForm('/api/documents', fd, p => {
      const v = Math.round(p * 100);
      bar.style.width = v + '%'; pct.textContent = v + '%';
      if (v >= 100) { label.textContent = 'PDF hazırlanır…'; }
    }));
    clearImages();
    state.fullName = ''; state.phone = '';
    shell(`<div class="card success narrow">
      <div class="success-mark">${icon('check')}</div>
      <h2>Sənədləriniz uğurla yükləndi</h2>
      <p>PDF yaradıldı və qəbul üçün qeydə alındı.</p>
      <button type="button" class="btn btn-primary" data-action="home">Yeni sənəd göndər</button>
    </div>`, 'done');
  } catch (err) {
    box.hidden = true;
    locks.forEach(b => { if (b.isConnected) b.disabled = false; });
    toast(err.message, 'error');
  }
}

/* ---------- Samples (public) ---------- */
async function openSamples() {
  let d;
  try { d = await api('/api/samples'); } catch (err) { console.warn('Nümunə API-si əlçatan deyil:', err.message); }
  if (!Array.isArray(d?.samples)) {
    const files = [
      ['1791621827633.jpeg', 'Tibbi sertifikat'],
      ['1791621827645.jpeg', 'Şəxsiyyət vəsiqəsi — ön'],
      ['1791621827656.jpeg', 'Şəxsiyyət vəsiqəsi — arxa'],
      ['1791622170292.png', 'Tibbi müayinə nümunəsi'],
      ['1791622864723.jpg', 'Tibbi sertifikat'],
      ['1791622864731.jpg', 'Tibbi sertifikat çıxarışı'],
      ['1791622864741.jpeg', 'Bakalavr diplomu'],
      ['1791622864755.jpeg', 'Növbə motorçusu sertifikatı']
    ];
    const prefix = STATIC_PUBLIC_PREFIX;
    d = { samples: files.map(([file, title], order) => ({ title, order, src: `${prefix}/samples/${file}` })) };
  }
  shell(`<div class="page-head"><div><h2>Nümunələr</h2>${d.intro ? `<p>${esc(d.intro)}</p>` : ''}</div>
      <button type="button" class="btn btn-sm" data-action="home">${icon('arrow-left', 'sm')} Geri</button></div>
    <div class="stack narrow">${d.samples.length ? d.samples.map(x => `<figure class="sample-card"><img src="${esc(resolveUrl(x.src))}" alt="${esc(x.title)}" loading="lazy" decoding="async"><figcaption>${esc(x.title)}</figcaption></figure>`).join('')
      : `<div class="empty">${icon('inbox')}<span>Nümunə yoxdur.</span></div>`}</div>`, 'samples');
}

/* ---------- Admin: login ---------- */
async function loginModal() {
  if ($('#loginForm')) return;
  if (await adminDocs(true)) return;
  openModal(`<h2 id="modalTitle">Admin girişi</h2><p class="muted">İdarəetmə panelinə daxil olmaq üçün kodu yazın.</p>
    <form class="form" id="loginForm" data-form="login">
      <input class="input" id="adminCode" type="password" autocomplete="current-password" placeholder="Admin kodu" aria-label="Admin kodu" autofocus>
      <div class="modal-actions tight"><button type="button" class="btn" data-action="close-modal">Bağla</button>
      <button type="submit" class="btn btn-primary">${icon('lock')} Daxil ol</button></div>
    </form>`);
}
async function doLogin(form) {
  const btn = $('[type=submit]', form);
  await busy(btn, async () => {
    await api('/api/admin/login', send('POST', { code: $('#adminCode').value }));
    closeModal();
    await adminDocs();
  });
}

/* ---------- Admin: frame ---------- */
const ADMIN_TABS = [['docs', 'Sənədlər', 'file-text'], ['telegram', 'Telegram', 'send'], ['samples', 'Nümunələr', 'image'], ['security', 'Təhlükəsizlik', 'shield']];
function adminFrame(active, inner, screen) {
  state.admin = true;
  shell(`<div class="page-head"><div><h2>İdarəetmə paneli</h2></div>
      <button type="button" class="btn btn-sm" data-action="logout">${icon('log-out', 'sm')} Çıxış</button></div>
    <nav class="tabs" aria-label="İdarəetmə bölmələri">${ADMIN_TABS.map(([id, label, ic]) =>
      `<button type="button" class="tab" data-action="tab" data-tab="${id}" ${id === active ? 'aria-current="page"' : ''}>${icon(ic, 'sm')} ${label}</button>`).join('')}</nav>
    ${inner}`, screen);
}
const gotoTab = guard(tab => ({ docs: adminDocs, telegram: adminTelegram, samples: adminSamples, security: adminSecurity }[tab]()));

/* ---------- Admin: documents ---------- */
function docCard(d) {
  const approved = d.status === 'approved';
  const tg = d.telegram?.status;
  const tgBadge = tg === 'sync_error' ? `<span class="badge badge-error" title="${esc(d.telegram?.lastError || '')}">${icon('alert', 'sm')} Telegram xətası</span>`
    : tg === 'sent' ? '<span class="badge badge-neutral">Telegram-da</span>'
    : '<span class="badge badge-neutral">Telegram gözləyir</span>';
  const pdf = esc(safePdf(d.pdfPath));
  return `<article class="doc ${approved ? 'is-approved' : 'is-pending'}">
    <div class="row"><div><div class="doc-name">${esc(d.displayName)}</div><div class="doc-meta">${esc(d.phone)} · ${esc(fmtDate(d.createdAt))}</div></div>
      <div class="row start">${tgBadge}<span class="badge ${approved ? 'badge-approved' : 'badge-pending'}">${icon(approved ? 'check-circle' : 'clock', 'sm')} ${approved ? 'Təsdiqləndi' : 'Gözləmədə'}</span></div></div>
    <div class="chip-row">
      <button type="button" class="chip" data-action="copy" data-text="${esc(d.displayName)}"><small>Tam ad ${icon('copy', 'sm')}</small><span>${esc(d.displayName)}</span></button>
      <button type="button" class="chip" data-action="copy" data-text="${esc(d.phone)}"><small>Nömrə ${icon('copy', 'sm')}</small><span>${esc(d.phone)}</span></button>
    </div>
    <div class="doc-actions">
      <a class="btn btn-sm" href="${pdf}" target="_blank" rel="noopener">${icon('eye', 'sm')} Bax</a>
      <a class="btn btn-sm" href="${pdf}" download>${icon('download', 'sm')} Yüklə</a>
      ${approved ? '' : `<button type="button" class="btn btn-sm btn-accent" data-action="approve" data-id="${esc(d.id)}">${icon('check', 'sm')} Təsdiqlə</button>`}
      ${tg === 'sync_error' ? `<button type="button" class="btn btn-sm" data-action="retry-tg" data-id="${esc(d.id)}">${icon('refresh', 'sm')} Telegram-a yenidən göndər</button>` : ''}
      <button type="button" class="btn btn-sm btn-danger" data-action="delete-doc" data-id="${esc(d.id)}">${icon('trash', 'sm')} Sil</button>
    </div>
  </article>`;
}
const docsUrl = () => {
  const qs = new URLSearchParams();
  if (state.view.filter) qs.set('status', state.view.filter);
  if (state.view.q) qs.set('q', state.view.q);
  return '/api/admin/documents' + (qs.toString() ? `?${qs}` : '');
};
function renderDocs(list) {
  const box = $('#docs');
  if (!box) return;
  const sig = JSON.stringify(list);
  if (sig === docsSig) return;
  docsSig = sig;
  box.innerHTML = list.length ? list.map(docCard).join('') : `<div class="empty">${icon('inbox')}<span>Sənəd tapılmadı.</span></div>`;
}
async function refreshDocs(silent = false) {
  if (!$('#docs') || state.screen !== 'admin') return;
  const req = ++docsReq;
  try {
    const d = await api(docsUrl());
    if (req === docsReq) renderDocs(d.documents);
  } catch (err) {
    if (!silent || err.status === 401) throw err;
  }
}
async function adminDocs(silent = false) {
  let list;
  try { list = (await api(docsUrl())).documents; } catch (err) {
    state.admin = false;
    if (!silent) throw err;
    return false;
  }
  const seg = (value, label) => `<button type="button" class="segment" data-action="filter" data-value="${value}" aria-pressed="${state.view.filter === value}">${label}</button>`;
  adminFrame('docs', `<div class="toolbar">
      <div class="search">${icon('search')}<input class="input" id="search" type="search" placeholder="Ad və ya telefonla axtar" aria-label="Axtarış" value="${esc(state.view.q)}"></div>
      <div class="segments" role="group" aria-label="Status filtri">${seg('', 'Hamısı')}${seg('pending', 'Gözləmədə')}${seg('approved', 'Təsdiqləndi')}</div>
    </div>
    <section id="docs" class="doc-list" aria-live="polite"></section>`, 'admin');
  docsSig = '';
  renderDocs(list);
  adminEvents = new EventSource(resolveUrl('/api/admin/events'));
  adminEvents.addEventListener('documents', () => refreshDocs(true).catch(handleError));
  adminEvents.addEventListener('sync-error', () => { if (!pollTimer) pollTimer = setInterval(() => refreshDocs(true).catch(handleError), 5000); });
  adminEvents.onopen = () => { clearInterval(pollTimer); pollTimer = null; };
  adminEvents.onerror = () => { if (!pollTimer) pollTimer = setInterval(() => refreshDocs(true).catch(handleError), 5000); };
  return true;
}

/* ---------- Admin: Telegram ---------- */
const statusBadge = (ok, yes, no) => `<span class="badge ${ok ? 'badge-approved' : 'badge-pending'}">${ok ? yes : no}</span>`;
async function adminTelegram() {
  const [d, mt] = await Promise.all([api('/api/admin/telegram/status'), api('/api/admin/telegram/mtproto/status')]);
  const apiReady = mt.apiIdConfigured && mt.apiHashConfigured;
  adminFrame('telegram', `
    <section class="card">
      <div class="card-title">${icon('send')}<h3>Bot və kanal</h3></div>
      <dl class="kv">
        <div><dt>Saxlama yeri</dt><dd>Telegram kanalı</dd></div>
        <div><dt>Status</dt><dd>${statusBadge(d.configured, 'Konfiqurasiya olunub', 'Konfiqurasiya gözləyir')}</dd></div>
        <div><dt>Kanal ID-si</dt><dd>${esc(d.channelId || '—')}</dd></div>
        <div><dt>Bot tokeni</dt><dd>${d.tokenConfigured ? 'Qorunur' : 'Daxil edilməyib'}</dd></div>
        <div><dt>Avtomatik sinxron</dt><dd>${statusBadge(d.polling, 'Aktiv', 'Gözləyir')}</dd></div>
        <div><dt>Telegramdan import edilən PDF</dt><dd>${Number(d.importedCount) || 0}</dd></div>
      </dl>
      <form class="form mt-4" data-form="tg-config">
        <label class="field"><span>Telegram kanal ID-si</span><input class="input" id="tgChannel" placeholder="-1001234567890" value="${esc(d.channelId || '')}" autocomplete="off"></label>
        <label class="field"><span>Bot tokeni</span><input class="input" id="tgToken" type="password" placeholder="123456:ABC..." autocomplete="off"></label>
        <div class="doc-actions">
          <button type="submit" class="btn btn-primary">${icon('save')} Yadda saxla</button>
          <button type="button" class="btn" data-action="tg-check">${icon('check-circle')} Bağlantını yoxla</button>
          <button type="button" class="btn" data-action="tg-sync">${icon('refresh')} İndi sinxronlaşdır</button>
        </div>
      </form>
    </section>
    <section class="card">
      <div class="card-title">${icon('lock')}<h3>Telegram API konfiqurasiyası</h3><span class="badge ${apiReady ? 'badge-approved' : 'badge-pending'}">${apiReady ? 'Hazır' : 'Tələb olunur'}</span></div>
      <p class="muted small">API ID və API Hash məlumatlarını <b>my.telegram.org</b> saytından daxil edin. Serverdə şifrəli saxlanılır.</p>
      <form class="form mt-3" data-form="mt-api">
        <label class="field"><span>API ID</span><input class="input" id="mtApiId" inputmode="numeric" placeholder="12345678" autocomplete="off"></label>
        <label class="field"><span>API Hash</span><input class="input" id="mtApiHash" type="password" placeholder="API Hash" autocomplete="off"></label>
        <div><button type="submit" class="btn btn-primary">${icon('save')} API məlumatlarını yadda saxla</button></div>
      </form>
    </section>
    <section class="card">
      <div class="card-title">${icon('send')}<h3>Telegram hesabı</h3><span class="badge ${mt.authorized ? 'badge-approved' : 'badge-pending'}">${mt.authorized ? 'Hesab qoşulub' : mt.pending ? 'Təsdiq gözləyir' : 'Qoşulmayıb'}</span></div>
      <p class="muted small">Yalnız telefon nömrəsini yazın. Telegram kodu və 2FA parolu lazım olduqda növbəti mərhələdə görünəcək.</p>
      <form class="form mt-3" data-form="mt-phone">
        <label class="field"><span>Telefon nömrəsi</span><input class="input" id="mtPhone" type="tel" inputmode="tel" placeholder="+994501234567" value="${esc(mt.phone || '')}"></label>
        <div class="doc-actions">
          <button type="submit" class="btn btn-primary">${icon('send')} ${mt.pending ? 'Kodu yenidən göndər' : 'Telegram hesabını qoş'}</button>
          ${mt.authorized ? `<button type="button" class="btn" data-action="mt-sync">${icon('refresh')} Kanal tarixçəsini sinxronlaşdır</button><button type="button" class="btn btn-danger" data-action="mt-logout">${icon('log-out')} Hesabdan çıx</button>` : ''}
        </div>
      </form>
      ${mt.pending === 'code' ? `<form class="form mt-3" data-form="mt-code"><label class="field"><span>Telegram giriş kodu</span><input class="input" id="mtCode" inputmode="numeric" autocomplete="one-time-code" placeholder="Telegram kodu"></label><div><button type="submit" class="btn btn-accent">${icon('check')} Kodu təsdiqlə</button></div></form>` : ''}
      ${mt.pending === 'password' ? `<form class="form mt-3" data-form="mt-password"><label class="field"><span>Telegram 2FA parolu</span><input class="input" id="mtPassword" type="password" placeholder="2FA parolu" autocomplete="off"></label><div><button type="submit" class="btn btn-accent">${icon('check')} Parolu təsdiqlə</button></div></form>` : ''}
      ${mt.lastError ? `<p class="badge badge-error badge-wrap mt-3">${esc(mt.lastError)}</p>` : ''}
    </section>`, 'admin-telegram');
}

/* ---------- Admin: samples ---------- */
async function adminSamples() {
  const d = await api('/api/admin/samples');
  adminFrame('samples', `
    <div class="card row"><div><strong>Yeni nümunə</strong><div class="muted small">JPG, PNG və ya WebP şəkil əlavə edin.</div></div>
      <label class="btn btn-accent">${icon('upload')} Şəkil əlavə et<input id="sampleFile" type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden"></label></div>
    <div class="stack mt-3">${d.samples.length ? d.samples.map((x, i) => `
      <article class="card sample-admin">
        <img src="${esc(resolveUrl(x.src))}" alt="${esc(x.title)}" loading="lazy">
        <div class="form">
          <label class="field"><span>Başlıq</span><input class="input" data-title="${esc(x.id)}" value="${esc(x.title)}"></label>
          <div class="doc-actions">
            <button type="button" class="btn btn-sm btn-icon" data-action="sample-up" data-id="${esc(x.id)}" data-index="${i}" aria-label="Yuxarı daşı" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
            <button type="button" class="btn btn-sm btn-icon" data-action="sample-down" data-id="${esc(x.id)}" data-index="${i}" aria-label="Aşağı daşı" ${i === d.samples.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
            <button type="button" class="btn btn-sm btn-primary" data-action="sample-save" data-id="${esc(x.id)}">${icon('save', 'sm')} Yadda saxla</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="sample-del" data-id="${esc(x.id)}">${icon('trash', 'sm')} Sil</button>
          </div>
        </div>
      </article>`).join('') : `<div class="empty">${icon('inbox')}<span>Nümunə yoxdur.</span></div>`}</div>`, 'admin-samples');
  state._samples = d.samples;
}
async function moveSample(id, delta, index) {
  const items = state._samples || [];
  const target = Number(index) + delta;
  if (target < 0 || target >= items.length) return;
  const a = items[Number(index)], b = items[target];
  await api('/api/admin/samples/' + encodeURIComponent(a.id), send('PATCH', { order: b.order }));
  await api('/api/admin/samples/' + encodeURIComponent(b.id), send('PATCH', { order: a.order }));
  await adminSamples();
}

/* ---------- Admin: security ---------- */
function adminSecurity() {
  adminFrame('security', `<form class="card form narrow flush" data-form="change-code">
      <div class="card-title">${icon('lock')}<h3>Admin kodunu dəyiş</h3></div>
      <p class="muted small">Admin sessiyası 30 gün yadda saxlanılır. Kod dəyişdikdə növbəti girişlər yeni kodla olacaq.</p>
      <label class="field"><span>Cari admin kodu</span><input class="input" id="currentCode" type="password" autocomplete="current-password"></label>
      <label class="field"><span>Yeni admin kodu</span><input class="input" id="newCode" type="password" autocomplete="new-password"></label>
      <label class="field"><span>Yeni kodu təkrar yazın</span><input class="input" id="confirmCode" type="password" autocomplete="new-password"></label>
      <div><button type="submit" class="btn btn-primary">${icon('save')} Kodu dəyiş</button></div>
    </form>`, 'admin-security');
}

/* ---------- Event wiring ---------- */
let logoTaps = 0, logoTimer = null;
const actions = {
  logo() { logoTaps++; clearTimeout(logoTimer); logoTimer = setTimeout(() => { logoTaps = 0; }, 700); if (logoTaps >= 4) { logoTaps = 0; loginModal(); } },
  home: () => home(),
  camera: () => camera(),
  gallery: () => $('#picker').click(),
  samples: guard(openSamples),
  resume: () => preview(),
  clear() { clearImages(); home(); },
  'to-preview': () => preview(),
  'to-info': () => (state.images.length ? info() : toast('Əvvəlcə ən azı bir şəkil əlavə edin.', 'error')),
  send: (el) => submitDocuments(el),
  'photo-up'(el) { movePhoto(+el.dataset.i, -1); },
  'photo-down'(el) { movePhoto(+el.dataset.i, 1); },
  'photo-del'(el) { const [f] = state.images.splice(+el.dataset.i, 1); if (f) dropUrl(f); preview(); },
  'cam-back': () => home(),
  'cam-switch'() { state.facing = state.facing === 'environment' ? 'user' : 'environment'; startStream(); },
  'cam-shot': () => takeShot(),
  'cam-done': () => preview(),
  'cam-del'(el) { const [f] = state.images.splice(+el.dataset.i, 1); if (f) dropUrl(f); renderStrip(); toast('Şəkil silindi'); },
  'close-modal': () => closeModal(),
  tab: el => gotoTab(el.dataset.tab),
  logout: guard(async () => { try { await api('/api/admin/logout', send('POST')); } catch (e) { console.warn('Logout:', e.message); } state.admin = false; home(); }),
  filter(el) {
    state.view.filter = el.dataset.value;
    $$('[data-action="filter"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    refreshDocs().catch(handleError);
  },
  copy: el => copyText(el.dataset.text).then(() => toast('Kopyalandı', 'success'), () => toast('Kopyalamaq mümkün olmadı.', 'error')),
  approve: guard(async el => { await busy(el, () => api(`/api/admin/documents/${encodeURIComponent(el.dataset.id)}/approve`, send('PATCH'))); toast('Sənəd təsdiqləndi.', 'success'); await refreshDocs(); }),
  'delete-doc': guard(async el => {
    if (!await confirmDialog({ title: 'Sənəd silinsin?', message: 'Sənəd və PDF faylı həmişəlik silinəcək. Bu əməliyyatı geri qaytarmaq olmaz.', confirm: 'Sil', danger: true })) return;
    await api('/api/admin/documents/' + encodeURIComponent(el.dataset.id), send('DELETE'));
    toast('Sənəd silindi.', 'success');
    await refreshDocs();
  }),
  'retry-tg': guard(async el => { await busy(el, () => api('/api/admin/telegram/retry/' + encodeURIComponent(el.dataset.id), send('POST'))); toast('Telegram-a göndərildi.', 'success'); await refreshDocs(); }),
  'tg-check': guard(async el => { const r = await busy(el, () => api('/api/admin/telegram/check', send('POST'))); toast(`Bağlantı uğurludur: @${r.bot}, ${r.channel.title || r.channel.id}`, 'success'); }),
  'tg-sync': guard(async el => { const r = await busy(el, () => api('/api/admin/telegram/sync', send('POST'))); toast(`${r.imported || 0} yeni PDF import edildi`, 'success'); await adminTelegram(); }),
  'mt-sync': guard(async el => { const r = await busy(el, () => api('/api/admin/telegram/mtproto/sync', send('POST'))); toast(`${r.imported || 0} PDF import edildi`, 'success'); await adminTelegram(); }),
  'mt-logout': guard(async () => {
    if (!await confirmDialog({ title: 'Telegram hesabından çıxılsın?', message: 'Kanal tarixçəsi sinxronu yenidən qoşulana qədər dayanacaq.', confirm: 'Çıx', danger: true })) return;
    await api('/api/admin/telegram/mtproto/logout', send('POST'));
    await adminTelegram();
  }),
  'sample-up': guard(el => moveSample(el.dataset.id, -1, el.dataset.index)),
  'sample-down': guard(el => moveSample(el.dataset.id, 1, el.dataset.index)),
  'sample-save': guard(async el => {
    const input = $(`[data-title="${CSS.escape(el.dataset.id)}"]`);
    await busy(el, () => api('/api/admin/samples/' + encodeURIComponent(el.dataset.id), send('PATCH', { title: input.value })));
    toast('Nümunə yeniləndi', 'success');
  }),
  'sample-del': guard(async el => {
    if (!await confirmDialog({ title: 'Nümunə silinsin?', message: 'Bu nümunə istifadəçilərə göstərilməyəcək.', confirm: 'Sil', danger: true })) return;
    await api('/api/admin/samples/' + encodeURIComponent(el.dataset.id), send('DELETE'));
    await adminSamples();
  })
};

function movePhoto(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= state.images.length) return;
  [state.images[i], state.images[j]] = [state.images[j], state.images[i]];
  preview();
}

const forms = {
  info: () => submitInfo(),
  login: doLogin,
  'change-code': async form => {
    await busy($('[type=submit]', form), () => api('/api/admin/change-code', send('POST', { currentCode: $('#currentCode').value, newCode: $('#newCode').value, confirmCode: $('#confirmCode').value })));
    toast('Admin kodu dəyişdirildi', 'success');
    await adminDocs();
  },
  'tg-config': async form => {
    const r = await busy($('[type=submit]', form), () => api('/api/admin/telegram/config', send('POST', { channelId: $('#tgChannel').value, token: $('#tgToken').value })));
    toast(r.configured ? 'Konfiqurasiya yadda saxlanıldı.' : 'Kanal yadda saxlanıldı; bot tokeni hələ yoxdur.', 'success');
    await adminTelegram();
  },
  'mt-api': async form => {
    await busy($('[type=submit]', form), () => api('/api/admin/telegram/mtproto/config', send('POST', { apiId: $('#mtApiId').value, apiHash: $('#mtApiHash').value })));
    toast('API məlumatları şifrəli yadda saxlanıldı', 'success');
    await adminTelegram();
  },
  'mt-phone': async form => {
    await busy($('[type=submit]', form), () => api('/api/admin/telegram/mtproto/request-code', send('POST', { phone: $('#mtPhone').value })));
    toast('Telegram kodu göndərildi', 'success');
    await adminTelegram();
  },
  'mt-code': async form => {
    const r = await busy($('[type=submit]', form), () => api('/api/admin/telegram/mtproto/verify-code', send('POST', { code: $('#mtCode').value })));
    toast(r.needsPassword ? '2FA parolunu daxil edin' : 'Telegram hesabı qoşuldu', 'success');
    await adminTelegram();
  },
  'mt-password': async form => {
    await busy($('[type=submit]', form), () => api('/api/admin/telegram/mtproto/verify-password', send('POST', { password: $('#mtPassword').value })));
    toast('Telegram hesabı qoşuldu', 'success');
    await adminTelegram();
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  Promise.resolve(fn(el, e)).catch(handleError);
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms[form.dataset.form];
  if (fn) Promise.resolve(fn(form)).catch(handleError);
});
document.addEventListener('input', e => {
  if (e.target.id === 'search') {
    clearTimeout(e.target._t);
    e.target._t = setTimeout(() => { state.view.q = e.target.value.trim(); refreshDocs().catch(handleError); }, 250);
  } else if (e.target.id === 'fullName') {
    state.fullName = e.target.value;
  }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey && (e.key.toLowerCase() === 'q' || e.code === 'KeyQ'))) { e.preventDefault(); loginModal(); return; }
  const modal = $('.modal');
  if (!modal) return;
  if (e.key === 'Escape') { modal._cancel ? modal._cancel() : closeModal(); return; }
  if (e.key === 'Tab') {
    const f = $$('button:not([disabled]),input,a[href]', modal);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.addEventListener('click', e => { const m = $('.modal'); if (m && e.target === m && !m._cancel) closeModal(); });

/* Drag & drop reordering (desktop); touch users use the up/down buttons */
let dragFrom = null;
document.addEventListener('dragstart', e => {
  const p = e.target.closest?.('.photo');
  if (!p) return;
  dragFrom = +p.dataset.i;
  p.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragFrom));
});
document.addEventListener('dragover', e => {
  const p = e.target.closest?.('.photo');
  if (!p || dragFrom === null) return;
  e.preventDefault();
  $$('.photo.drop-target').forEach(x => x.classList.remove('drop-target'));
  p.classList.add('drop-target');
});
document.addEventListener('drop', e => {
  const p = e.target.closest?.('.photo');
  if (!p || dragFrom === null) return;
  e.preventDefault();
  const to = +p.dataset.i;
  const [m] = state.images.splice(dragFrom, 1);
  state.images.splice(to, 0, m);
  dragFrom = null;
  preview();
});
document.addEventListener('dragend', () => { dragFrom = null; $$('.photo.dragging,.photo.drop-target').forEach(x => x.classList.remove('dragging', 'drop-target')); });
window.addEventListener('pagehide', stopStream);

/* ---------- Init ---------- */
(async () => {
  const picker = document.createElement('input');
  picker.type = 'file'; picker.id = 'picker'; picker.multiple = true; picker.hidden = true;
  picker.accept = 'image/jpeg,image/png,image/webp';
  picker.addEventListener('change', () => {
    const added = addFiles(picker.files);
    picker.value = '';
    if (added && (state.screen === 'home' || state.screen === 'preview')) preview();
  });
  document.body.appendChild(picker);
  try {
    const cfg = await api('/api/config');
    if (cfg.limits) state.config.limits = { ...state.config.limits, ...cfg.limits };
  } catch (e) { console.warn('Config:', e.message); }
  home();
})();
