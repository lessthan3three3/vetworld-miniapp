// =====================================================================
// VETMIR MINI APP — клиентская логика + админка
// =====================================================================

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Адаптируем цвет шапки под бренд
  try {
    tg.setHeaderColor('#5E2A8E');
    tg.setBackgroundColor('#5E2A8E');
  } catch (e) {}
}

// ID администраторов клиники.
// ВАЖНО: реальная защита админ-функций — на бэкенде (см. bot.py is_admin
// и ADMIN_USER_IDS в .env). Здесь же мы просто скрываем UI-карточку
// для не-админов, чтобы не вводить в заблуждение. Если хакер откроет
// DevTools и удалит класс hidden — всё равно sendData будет отклонён
// сервером (там жёсткая проверка через config.is_admin).
//
// Способ узнать «я админ?»: бот формирует webapp URL с ?role=admin для
// своих сотрудников. Параметр приходит вместе со ссылкой и подделать
// его клиент сам не может (он не может изменить URL внутри Telegram
// reply-клавиатуры).
const urlParams = new URLSearchParams(window.location.search);
const isAdminHint = urlParams.get('role') === 'admin';

const me = tg?.initDataUnsafe?.user || {};
// isAdmin — это ТОЛЬКО подсказка для UI. Бэк всё равно проверяет.
const isAdmin = isAdminHint;

// URL REST API (передаётся ботом в query как ?api=...).
// Без него админка работает только в demo-режиме на localStorage.
const API_BASE = urlParams.get('api') || '';

// Telegram initData — передаётся в каждом запросе для подписи.
// Сервер проверяет HMAC через BOT_TOKEN.
const INIT_DATA = tg?.initData || '';

async function apiCall(path, options = {}) {
  if (!API_BASE) {
    throw new Error('API не сконфигурирован (нет ?api= в URL)');
  }
  const url = API_BASE.replace(/\/$/, '') + path;
  const headers = {
    'X-Telegram-Init-Data': INIT_DATA,
    ...(options.headers || {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    let text = '';
    try { text = await resp.text(); } catch (e) {}
    if (resp.status === 401) {
      throw new Error(
        INIT_DATA
          ? 'Сервер отверг подпись Telegram. Перезапусти Mini App.'
          : 'Откройте Mini App из Telegram (через бота), а не в обычном браузере.'
      );
    }
    if (resp.status === 403) {
      throw new Error('Нет прав администратора (только сотрудники клиники).');
    }
    throw new Error(`API ${resp.status}: ${text || resp.statusText}`);
  }
  return resp.json();
}

// =====================================================================
// СОСТОЯНИЕ
// =====================================================================
const state = {
  current: 'home',
  history: ['home'],
  // форма записи
  form: {
    serviceId: null,
    date: null,
    time: null,
    petName: '',
    species: '',
    clientName: '',
    phone: '',
  },
  // мои записи (хранятся локально в LocalStorage до отправки в бот)
  myBookings: loadLocalBookings(),
};

// =====================================================================
// НАВИГАЦИЯ ПО ЭКРАНАМ
// =====================================================================
function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (!el) { console.warn('no screen', name); return; }
  el.classList.add('active');
  state.current = name;
  if (state.history[state.history.length - 1] !== name) {
    state.history.push(name);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });

  // включаем/выключаем нативную BackButton телеги
  if (tg) {
    if (name === 'home') {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
    }
  }

  // лайтовая haptic-обратная связь
  tg?.HapticFeedback?.selectionChanged?.();
}
tg?.BackButton?.onClick(() => goBack());

function goBack(target) {
  if (target) {
    // Прямой возврат к указанному экрану
    state.history = ['home'];
    show(target);
    return;
  }
  state.history.pop(); // убрать текущий
  const prev = state.history[state.history.length - 1] || 'home';
  state.history.pop();
  show(prev);
}

document.addEventListener('click', (e) => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) { onGo(goBtn.dataset.go); return; }
  const backBtn = e.target.closest('[data-back]');
  if (backBtn) { goBack(backBtn.dataset.back); return; }
});

function onGo(target) {
  // Защита от попыток перейти в админку через DevTools.
  // Реальная защита всё равно на бэке, но здесь подстраховываемся.
  if ((target === 'admin' || target === 'calendar') && !isAdmin) {
    toast('Доступ только для администратора клиники', 'error');
    return;
  }
  switch (target) {
    case 'home': show('home'); break;
    case 'services': renderServices(); show('services'); break;
    case 'prep': renderPrepList(); show('prep'); break;
    case 'contacts': show('contacts'); break;
    case 'emergency': show('emergency'); break;
    case 'promo': show('promo'); break;
    case 'my-bookings': renderMyBookings(); show('my-bookings'); break;
    case 'book': startBooking(); break;
    case 'admin': renderAdminPanel(); show('admin'); break;
    case 'calendar': openCalendar(); break;
    default: show(target);
  }
}

// =====================================================================
// ГЛАВНАЯ — статус работы
// =====================================================================
function refreshHomeStatus() {
  const now = nowMsk();
  const hour = now.getHours();
  const status = document.getElementById('hero-status');
  if (!status) return;
  // Античный 18 — 24/7 экстренно. Условно «работаем» всегда.
  if (hour >= 9 && hour < 24) {
    status.textContent = '✅ работаем';
    status.classList.remove('closed');
  } else {
    status.textContent = '🌙 ночь · 24/7 на Античном';
    status.classList.add('closed');
  }
  document.getElementById('my-count').textContent =
    state.myBookings.length ? `${state.myBookings.length} активных` : 'нет записей';

  // Debug: видно в консоли DevTools и в логе
  console.log('[VetMir] isAdmin =', isAdmin, 'urlParams.role =',
    urlParams.get('role'), 'API_BASE =', API_BASE);

  if (isAdmin) {
    const section = document.getElementById('admin-section');
    if (section) section.classList.remove('hidden');
    console.log('[VetMir] admin section revealed');
  }
}

// =====================================================================
// УСЛУГИ
// =====================================================================
function renderServices(filterCat = 'all', containerId = 'services-list') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = (window.VM_SERVICES || [])
    .filter(s => filterCat === 'all' || s.category === filterCat);
  if (!items.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">😔</div>Услуги не найдены</div>`;
    return;
  }
  container.innerHTML = items.map(s => `
    <button class="service-item" data-service-id="${s.id}">
      <div class="service-info">
        <div class="service-cat-tag">${s.categoryLabel}</div>
        <div class="service-name">${escapeHtml(s.name)}</div>
        <div class="service-meta">~${s.duration} мин · ${speciesIcons(s.species)}</div>
      </div>
      <div class="service-price">${formatPrice(s.price)}</div>
    </button>
  `).join('');

  container.querySelectorAll('.service-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.serviceId;
      // На экране услуг — короткий просмотр + переход к записи.
      // На экране книжки — выбор услуги.
      if (state.current === 'book') {
        state.form.serviceId = sid;
        // species авто-проставляем если у услуги ровно 1 вид
        const svc = (window.VM_SERVICES || []).find(x => x.id === sid);
        if (svc && svc.species && svc.species.length === 1) {
          state.form.species = svc.species[0];
        }
        nextBookStep();
      } else {
        // на экране услуг — короткое подтверждение и переход к записи
        const svc = (window.VM_SERVICES || []).find(x => x.id === sid);
        tg?.HapticFeedback?.notificationOccurred?.('success');
        if (confirm(`${svc.name} — ${formatPrice(svc.price)}\n\nЗаписаться сейчас?`)) {
          startBooking(sid);
        }
      }
    });
  });
}

function speciesIcons(arr) {
  if (!arr || !arr.length) return '';
  const map = { dog: '🐕', cat: '🐈', ferret: '🦝', rabbit: '🐰', other: '🐾' };
  return arr.map(s => map[s] || '🐾').join(' ');
}
function formatPrice(p) {
  if (!p && p !== 0) return '';
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

document.querySelectorAll('#services-filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#services-filters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderServices(chip.dataset.cat);
  });
});

// =====================================================================
// ПОДГОТОВКА
// =====================================================================
function renderPrepList() {
  const container = document.getElementById('prep-list');
  const items = window.VM_PREP || [];
  container.innerHTML = items.map(p => `
    <button class="prep-item" data-prep-id="${p.id}">
      <div class="prep-icon">${prepIcon(p.id)}</div>
      <div class="prep-info">
        <div class="prep-title">${escapeHtml(p.title)}</div>
        <div class="prep-sub">${speciesIcons(p.species)}</div>
      </div>
      <div class="prep-arrow">›</div>
    </button>
  `).join('');
  container.querySelectorAll('.prep-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.prepId;
      const p = items.find(x => x.id === pid);
      document.getElementById('prep-detail-title').textContent = p.title;
      document.getElementById('prep-detail-body').textContent = p.content;
      show('prep-detail');
    });
  });
}
function prepIcon(id) {
  if (id.includes('surg')) return '🔪';
  if (id.includes('uzi')) return '📡';
  if (id.includes('echo')) return '❤️';
  if (id.includes('ct')) return '🧠';
  if (id.includes('endo')) return '🔍';
  if (id.includes('vac')) return '💉';
  if (id.includes('blood')) return '🩸';
  if (id.includes('dent')) return '🦷';
  return '📋';
}

// =====================================================================
// ЗАПИСЬ — пошаговый флоу
// =====================================================================
function startBooking(presetServiceId) {
  state.form = {
    serviceId: presetServiceId || null,
    date: null,
    time: null,
    petName: '',
    species: '',
    clientName: '',
    phone: '',
  };
  setStep(presetServiceId ? 2 : 1);
  show('book');
  if (presetServiceId) {
    renderDateGrid();
    renderTimeGrid();
    updateSelectedServicePill();
  } else {
    renderServices('all', 'book-services-list');
  }
}

function setStep(n) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step-' + i);
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    if (i === n) el.classList.add('active');
    document.getElementById('book-step-' + i).classList.toggle('hidden', i !== n);
  }
  if (tg) {
    if (n === 3) {
      tg.MainButton.setText('Подтвердить запись');
      tg.MainButton.color = '#FF7A33';
      tg.MainButton.textColor = '#FFFFFF';
      tg.MainButton.show();
      tg.MainButton.onClick(submitBooking);
    } else {
      tg.MainButton.hide();
    }
  }
}

function nextBookStep() {
  const cur = [1,2,3].find(i =>
    !document.getElementById('book-step-' + i).classList.contains('hidden'));
  if (cur === 1) {
    if (!state.form.serviceId) { toast('Выберите услугу', 'error'); return; }
    setStep(2);
    updateSelectedServicePill();
    renderDateGrid();
    renderTimeGrid();
  } else if (cur === 2) {
    if (!state.form.date) { toast('Выберите дату', 'error'); return; }
    if (!state.form.time) { toast('Выберите время', 'error'); return; }
    setStep(3);
    updateSelectedServicePill();
    updateSummary();
  }
}

function updateSelectedServicePill() {
  const svc = (window.VM_SERVICES || []).find(s => s.id === state.form.serviceId);
  if (!svc) return;
  const text = `${svc.name} · ${formatPrice(svc.price)}`;
  document.getElementById('selected-service-pill').textContent = text;
  document.getElementById('selected-service-pill-3').textContent = text;
}

// Календарь — 14 ближайших дней (по МСК)
function renderDateGrid() {
  const grid = document.getElementById('date-grid');
  const today = nowMsk();
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  const wd = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];
  const mon = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  grid.innerHTML = days.map(d => {
    const iso = isoDate(d);
    const isSel = iso === state.form.date;
    return `<button class="date-cell ${isSel ? 'selected' : ''}" data-date="${iso}">
      <div class="date-cell-wd">${wd[d.getDay()]}</div>
      <div class="date-cell-day">${d.getDate()}</div>
      <div class="date-cell-mon">${mon[d.getMonth()]}</div>
    </button>`;
  }).join('');
  grid.querySelectorAll('.date-cell').forEach(c => {
    c.addEventListener('click', () => {
      state.form.date = c.dataset.date;
      grid.querySelectorAll('.date-cell').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      tg?.HapticFeedback?.selectionChanged?.();
      // Сразу пере-рендерим время (на случай если выбран сегодняшний день —
      // надо отключить уже прошедшие слоты)
      renderTimeGrid();
      // Если время уже выбрано и оно ещё валидно — переходим автоматически
      if (state.form.time && !isPastTime(state.form.date, state.form.time)) {
        setTimeout(nextBookStep, 250);
      } else {
        // если время было прошедшим — сбрасываем
        if (state.form.time && isPastTime(state.form.date, state.form.time)) {
          state.form.time = null;
        }
      }
    });
  });
}

// Прошло ли время по МСК (для конкретного ISO-дня)?
function isPastTime(dateIso, timeStr) {
  if (!dateIso || !timeStr) return false;
  const todayIso = todayMskIso();
  if (dateIso > todayIso) return false;   // будущий день — всегда ОК
  if (dateIso < todayIso) return true;    // прошедший день — всё нельзя
  // Сегодня — сравниваем время
  const now = nowMsk();
  const [h, m] = timeStr.split(':').map(Number);
  const slotMin = h * 60 + m;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Дополнительный буфер 30 минут — нельзя записаться на «через 5 минут»
  return slotMin <= nowMin + 30;
}

// Сетка времени — 9:00 ... 19:00 с шагом 30 минут
function renderTimeGrid() {
  // Покажем юзеру текущее время по МСК — для проверки и для контекста
  const hint = document.getElementById('msk-now-hint');
  if (hint) {
    const n = nowMsk();
    hint.textContent = `🕒 Сейчас в Севастополе: ${pad(n.getHours())}:${pad(n.getMinutes())} (МСК)`;
  }
  const grid = document.getElementById('time-grid');
  const slots = [];
  for (let h = 9; h < 19; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  const todayIso = todayMskIso();
  const isToday = state.form.date === todayIso;
  grid.innerHTML = slots.map(t => {
    const isSel = t === state.form.time;
    const past = isPastTime(state.form.date, t);
    const cls = [
      'time-cell',
      isSel ? 'selected' : '',
      past ? 'disabled' : '',
    ].filter(Boolean).join(' ');
    return `<button class="${cls}" data-time="${t}" ${past ? 'disabled' : ''}>${t}</button>`;
  }).join('');
  // Если сегодня и нет ни одного доступного слота — подсказка
  if (isToday) {
    const allDisabled = slots.every(t => isPastTime(state.form.date, t));
    if (allDisabled) {
      grid.innerHTML = `<div class="empty" style="grid-column: 1/-1;">
        На сегодня свободных слотов уже нет. Выберите завтра или позже.
      </div>`;
    }
  }
  grid.querySelectorAll('.time-cell:not(.disabled)').forEach(c => {
    c.addEventListener('click', () => {
      state.form.time = c.dataset.time;
      grid.querySelectorAll('.time-cell').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      tg?.HapticFeedback?.selectionChanged?.();
      if (state.form.date) {
        setTimeout(nextBookStep, 250);
      }
    });
  });
}

// Шаг 3 — слежение за полями + сводка
['inp-pet','inp-client','inp-phone'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSummary);
});
document.querySelectorAll('input[name="species"]').forEach(r =>
  r.addEventListener('change', updateSummary));

function updateSummary() {
  state.form.petName = document.getElementById('inp-pet').value.trim();
  state.form.clientName = document.getElementById('inp-client').value.trim();
  state.form.phone = document.getElementById('inp-phone').value.trim();
  const speciesEl = document.querySelector('input[name="species"]:checked');
  state.form.species = speciesEl ? speciesEl.value : '';

  const valid = isFormValid();
  document.getElementById('summary-card').classList.toggle('hidden', !valid);

  if (valid) {
    const svc = (window.VM_SERVICES || []).find(s => s.id === state.form.serviceId);
    document.getElementById('sum-service').textContent =
      `${svc.name} · ${formatPrice(svc.price)}`;
    document.getElementById('sum-date').textContent = formatDate(state.form.date);
    document.getElementById('sum-time').textContent = state.form.time;
    document.getElementById('sum-pet').textContent = state.form.petName;
    document.getElementById('sum-client').textContent = state.form.clientName;
    document.getElementById('sum-phone').textContent = state.form.phone;
  }

  // MainButton — активна только при заполненной форме
  if (tg) {
    if (valid) tg.MainButton.enable();
    else tg.MainButton.disable();
  }
}

function isFormValid() {
  const f = state.form;
  if (!f.serviceId || !f.date || !f.time) return false;
  if (!f.petName || f.petName.length < 2) return false;
  if (!f.species) return false;
  if (!f.clientName || !/[А-ЯЁA-Z][а-яёa-z\-]{1,30}/.test(f.clientName)) return false;
  // телефон обязателен — мин 10 цифр
  const digits = (f.phone || '').replace(/\D/g, '');
  if (digits.length < 10) return false;
  return true;
}

function submitBooking() {
  if (!isFormValid()) {
    toast('Заполните все поля', 'error');
    return;
  }
  const f = state.form;
  const svc = (window.VM_SERVICES || []).find(s => s.id === f.serviceId);

  const payload = {
    type: 'book_appointment',
    service: svc.name,
    species: f.species,
    pet_name: f.petName,
    date: f.date,
    time: f.time,
    client_name: f.clientName,
    phone: f.phone,
  };

  // Сохраняем локально (отображается в «Мои записи» сразу же).
  const localId = 'L' + Date.now();
  state.myBookings.push({
    id: localId,
    status: 'pending',
    ...payload,
    createdAt: new Date().toISOString(),
  });
  saveLocalBookings();

  // Отправляем в бот через WebApp.sendData (бот получает в @bot.message(F.web_app_data))
  if (tg && tg.sendData) {
    try {
      tg.sendData(JSON.stringify(payload));
      // sendData закрывает WebApp автоматически — но toast не успеет показаться,
      // поэтому показываем popup
      tg.HapticFeedback.notificationOccurred('success');
    } catch (e) {
      console.error('sendData failed', e);
      toast('Не удалось отправить запись', 'error');
    }
  } else {
    // Веб-демо без Telegram
    toast('Запись отправлена (demo)', 'success');
    show('home');
  }
}

// =====================================================================
// МОИ ЗАПИСИ
// =====================================================================
function loadLocalBookings() {
  try {
    const raw = localStorage.getItem('vm_bookings');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) { return []; }
}
function saveLocalBookings() {
  try { localStorage.setItem('vm_bookings', JSON.stringify(state.myBookings)); }
  catch (e) {}
}

function renderMyBookings() {
  const container = document.getElementById('my-bookings-list');
  if (!state.myBookings.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        У вас пока нет записей.
        <br><br>
        <button class="cta primary" data-go="book" style="display:inline-flex; margin: 12px 0 0;">
          <span class="cta-icon">📅</span><span><span class="cta-title">Записаться</span></span>
        </button>
      </div>`;
    return;
  }
  // Сортируем по дате+времени
  const items = [...state.myBookings].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time));
  container.innerHTML = items.map(b => `
    <div class="booking-item ${b.status === 'cancelled' ? 'cancelled' : ''}">
      <div class="booking-head">
        <div>
          <div class="booking-id">№${escapeHtml(b.id)}</div>
          <div class="booking-service">${escapeHtml(b.service)}</div>
        </div>
        <div class="booking-status ${b.status}">${statusLabel(b.status)}</div>
      </div>
      <div class="booking-meta">
        <span>📅 ${formatDate(b.date)}</span>
        <span>⏰ ${b.time}</span>
        <span>${speciesIcons([b.species])} ${escapeHtml(b.pet_name)}</span>
      </div>
      ${b.status === 'pending' ? `
        <div class="booking-actions">
          <button class="btn-action danger" data-cancel-id="${b.id}">Отменить</button>
        </div>` : ''}
    </div>
  `).join('');
  container.querySelectorAll('[data-cancel-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Отменить эту запись?')) return;
      const bk = state.myBookings.find(x => x.id === btn.dataset.cancelId);
      if (bk) {
        bk.status = 'cancelled';
        saveLocalBookings();
        // Уведомляем бота
        tg?.sendData?.(JSON.stringify({
          type: 'cancel_appointment',
          local_id: bk.id, client_name: bk.client_name,
        }));
        renderMyBookings();
        toast('Запись отменена', 'success');
      }
    });
  });
}
function statusLabel(s) {
  return { pending: 'Ожидает', done: 'Готово', cancelled: 'Отменена' }[s] || s;
}

// =====================================================================
// АДМИН-ПАНЕЛЬ
// =====================================================================
function renderAdminPanel() {
  // Запрашиваем список записей у бота
  tg?.sendData?.(JSON.stringify({ type: 'admin_get_bookings' }));
  // Бот ответит сообщением, которое мы получим через initData при следующем
  // открытии. Для демо — рисуем mock из локальных записей всех юзеров.
  const all = state.myBookings;
  const today = todayMskIso();
  const tomorrow = isoDate(mskAddDays(1));
  const weekEnd = isoDate(mskAddDays(7));
  document.getElementById('stat-today').textContent =
    all.filter(b => b.date === today && b.status !== 'cancelled').length;
  document.getElementById('stat-tomorrow').textContent =
    all.filter(b => b.date === tomorrow && b.status !== 'cancelled').length;
  document.getElementById('stat-week').textContent =
    all.filter(b => b.date <= weekEnd && b.status !== 'cancelled').length;
  renderAdminList('upcoming');
}

document.querySelectorAll('[data-admin-filter]').forEach(b =>
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-admin-filter]').forEach(x =>
      x.classList.remove('active'));
    b.classList.add('active');
    renderAdminList(b.dataset.adminFilter);
  }));

function renderAdminList(filter) {
  const container = document.getElementById('admin-list');
  let items = state.myBookings;
  const today = todayMskIso();
  if (filter === 'upcoming')
    items = items.filter(b => b.date >= today && b.status !== 'cancelled');
  else if (filter === 'today')
    items = items.filter(b => b.date === today);
  else if (filter === 'cancelled')
    items = items.filter(b => b.status === 'cancelled');
  // 'all' — все
  items = items.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

  if (!items.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>Записей нет</div>`;
    return;
  }
  container.innerHTML = items.map(b => `
    <div class="booking-item ${b.status === 'cancelled' ? 'cancelled' : (b.status === 'done' ? 'done' : '')}">
      <div class="booking-head">
        <div>
          <div class="booking-id">№${escapeHtml(b.id)} · ${escapeHtml(b.client_name)}</div>
          <div class="booking-service">${escapeHtml(b.service)}</div>
        </div>
        <div class="booking-status ${b.status}">${statusLabel(b.status)}</div>
      </div>
      <div class="booking-meta">
        <span>📅 ${formatDate(b.date)}</span>
        <span>⏰ ${b.time}</span>
        <span>${speciesIcons([b.species])} ${escapeHtml(b.pet_name)}</span>
        <span>📞 <a href="tel:${b.phone.replace(/\\D/g,'')}">${escapeHtml(b.phone)}</a></span>
      </div>
      <div class="booking-actions">
        <button class="btn-action success" data-done-id="${b.id}">Пришёл</button>
        <button class="btn-action" data-resched-id="${b.id}">Перенести</button>
        <button class="btn-action danger" data-admin-cancel="${b.id}">Отмена</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('[data-done-id]').forEach(btn =>
    btn.addEventListener('click', () => adminAction(btn.dataset.doneId, 'done')));
  container.querySelectorAll('[data-admin-cancel]').forEach(btn =>
    btn.addEventListener('click', () => adminAction(btn.dataset.adminCancel, 'cancelled')));
  container.querySelectorAll('[data-resched-id]').forEach(btn =>
    btn.addEventListener('click', () => {
      alert('Перенос: попросите клиента написать боту «перенести запись на ...»');
    }));
}

function adminAction(id, newStatus) {
  const bk = state.myBookings.find(x => x.id === id);
  if (!bk) return;
  bk.status = newStatus;
  saveLocalBookings();
  tg?.sendData?.(JSON.stringify({
    type: 'admin_update', booking_id: id, status: newStatus,
  }));
  renderAdminPanel();
  toast({done: 'Отмечено: пришёл', cancelled: 'Запись отменена'}[newStatus] || 'OK', 'success');
}

// =====================================================================
// ВРЕМЯ ПО МСК (UTC+3) — клиника в Севастополе работает по МСК.
// Не использовать new Date() напрямую — это локальное время клиента,
// которое может быть в любой таймзоне.
// =====================================================================
const MSK_OFFSET_MIN = 3 * 60;  // UTC+3

function nowMsk() {
  // Считаем «текущий момент в МСК», возвращая Date с компонентами
  // в МСК (а не реальный UTC сдвиг). Это нужно чтобы isoDate()/getDate()
  // возвращали день по МСК.
  const utcNow = Date.now();
  return new Date(utcNow + MSK_OFFSET_MIN * 60 * 1000 +
                  new Date().getTimezoneOffset() * 60 * 1000);
}

function todayMskIso() {
  return isoDate(nowMsk());
}

function mskAddDays(n) {
  const d = nowMsk();
  d.setDate(d.getDate() + n);
  return d;
}


// =====================================================================
// УТИЛИТЫ
// =====================================================================
function escapeHtml(s) {
  return String(s || '').replace(/[<>&"']/g, c =>
    ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}
function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(d.getDate() + n); return r; }
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayMskIso();
  const tomorrow = isoDate(mskAddDays(1));
  if (iso === today) return 'Сегодня';
  if (iso === tomorrow) return 'Завтра';
  const wd = ['вс','пн','вт','ср','чт','пт','сб'];
  const mon = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${d} ${mon[m-1]} (${wd[date.getDay()]})`;
}
function toast(msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast ' + (kind || '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// Чипсы внутри формы записи
document.querySelectorAll('#screen-book .filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#screen-book .filters .chip').forEach(c =>
      c.classList.remove('active'));
    chip.classList.add('active');
    renderServices(chip.dataset.cat, 'book-services-list');
  });
});

// =====================================================================
// КАЛЕНДАРЬ (АДМИН) — месяц + клик по дню
// =====================================================================
const cal = {
  year: nowMsk().getFullYear(),
  month: nowMsk().getMonth(),  // 0..11
  summary: {},                    // { "2026-05-22": {pending,done,cancelled} }
};

const RU_MONTHS_FULL = [
  'январь','февраль','март','апрель','май','июнь',
  'июль','август','сентябрь','октябрь','ноябрь','декабрь',
];

document.getElementById('cal-prev').addEventListener('click', () => {
  cal.month--;
  if (cal.month < 0) { cal.month = 11; cal.year--; }
  loadAndRenderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  cal.month++;
  if (cal.month > 11) { cal.month = 0; cal.year++; }
  loadAndRenderCalendar();
});

async function openCalendar() {
  show('calendar');
  await loadAndRenderCalendar();
}

async function loadAndRenderCalendar() {
  const monthName = RU_MONTHS_FULL[cal.month];
  document.getElementById('cal-month-label').textContent =
    `${monthName} ${cal.year}`;
  document.getElementById('cal-title').textContent = 'Календарь';

  // Запросим сводку на месяц у API
  const first = `${cal.year}-${pad(cal.month + 1)}-01`;
  const lastDay = new Date(cal.year, cal.month + 1, 0).getDate();
  const last = `${cal.year}-${pad(cal.month + 1)}-${pad(lastDay)}`;
  cal.summary = {};
  if (!API_BASE) {
    toast('API недоступен (открой через Telegram-бот)', 'error');
  } else if (!INIT_DATA) {
    toast('Демо-режим без авторизации Telegram', 'error');
  } else {
    try {
      const data = await apiCall(
        `/admin/calendar?from=${first}&to=${last}`);
      cal.summary = data.days || {};
    } catch (e) {
      console.error('cal load failed', e);
      toast('Не удалось загрузить календарь: ' + e.message, 'error');
    }
  }
  renderCalendarGrid();
}

function renderCalendarGrid() {
  const grid = document.getElementById('cal-grid');
  // Какой день недели у 1-го числа (0=ВС … 6=СБ); сделаем понедельник=0
  const firstDow = (new Date(cal.year, cal.month, 1).getDay() + 6) % 7;
  const lastDay = new Date(cal.year, cal.month + 1, 0).getDate();
  const todayIso = todayMskIso();

  let html = '';
  // Пустые ячейки в начале
  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-cell empty"></div>';
  }
  for (let d = 1; d <= lastDay; d++) {
    const iso = `${cal.year}-${pad(cal.month + 1)}-${pad(d)}`;
    const sum = cal.summary[iso];
    const dow = new Date(cal.year, cal.month, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isToday = iso === todayIso;
    const total = sum ? (sum.pending || 0) + (sum.done || 0) + (sum.cancelled || 0) : 0;
    const cls = [
      'cal-cell',
      isToday ? 'today' : '',
      isWeekend && !isToday ? 'weekend' : '',
      total > 0 ? 'has-bookings' : '',
    ].filter(Boolean).join(' ');
    let dots = '';
    if (sum) {
      if (sum.pending) dots += `<span class="cal-dot pending"></span>`;
      if (sum.done) dots += `<span class="cal-dot done"></span>`;
      if (sum.cancelled) dots += `<span class="cal-dot cancelled"></span>`;
    }
    const counter = total > 0 ? `<div class="cal-count">${total}</div>` : '';
    html += `<div class="${cls}" data-day-iso="${iso}">
      ${counter}
      <div class="cal-day-num">${d}</div>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-cell[data-day-iso]').forEach(c =>
    c.addEventListener('click', () => openDay(c.dataset.dayIso)));
}

async function openDay(iso) {
  document.getElementById('day-title').textContent =
    `${formatDate(iso)} · записи`;
  const list = document.getElementById('day-list');
  list.innerHTML = '<div class="empty">Загружаем…</div>';
  show('day');
  try {
    const data = await apiCall(`/admin/day/${iso}`);
    renderDayList(data.items || [], iso);
  } catch (e) {
    list.innerHTML = `<div class="empty">Ошибка: ${escapeHtml(e.message)}</div>`;
  }
}

function renderDayList(items, iso) {
  const list = document.getElementById('day-list');
  if (!items.length) {
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">📭</div>
      На ${formatDate(iso)} записей нет
    </div>`;
    return;
  }
  list.innerHTML = items.map(b => `
    <div class="booking-item ${b.status === 'cancelled' ? 'cancelled' : (b.status === 'done' ? 'done' : '')}">
      <div class="booking-head">
        <div>
          <div class="booking-id">№${b.id} · ${escapeHtml(b.client_name)}</div>
          <div class="booking-service">${escapeHtml(b.service)}</div>
        </div>
        <div class="booking-status ${b.status}">${statusLabel(b.status)}</div>
      </div>
      <div class="booking-meta">
        <span>⏰ ${b.time}</span>
        <span>${speciesIcons([b.species])} ${escapeHtml(b.pet_name)}</span>
        <span>📞 <a href="tel:${(b.phone||'').replace(/\D/g,'')}">${escapeHtml(b.phone)}</a></span>
      </div>
      ${b.status !== 'cancelled' && b.status !== 'done' ? `
      <div class="booking-actions">
        <button class="btn-action success" data-api-done="${b.id}">✓ Пришёл</button>
        <button class="btn-action danger" data-api-cancel="${b.id}">✕ Отмена</button>
      </div>` : ''}
    </div>
  `).join('');
  list.querySelectorAll('[data-api-done]').forEach(btn =>
    btn.addEventListener('click', () => apiSetStatus(btn.dataset.apiDone, 'done', iso)));
  list.querySelectorAll('[data-api-cancel]').forEach(btn =>
    btn.addEventListener('click', () => apiSetStatus(btn.dataset.apiCancel, 'cancelled', iso)));
}

async function apiSetStatus(bookingId, status, iso) {
  try {
    await apiCall('/admin/status', {
      method: 'POST',
      body: JSON.stringify({ booking_id: Number(bookingId), status }),
    });
    tg?.HapticFeedback?.notificationOccurred?.('success');
    toast(status === 'done' ? '✓ Отмечено' : '✕ Отменено', 'success');
    // Перезагружаем день
    await openDay(iso);
    // Обновим кэш сводки на месяц
    cal.summary = {};
  } catch (e) {
    toast('Ошибка: ' + e.message, 'error');
  }
}


// =====================================================================
// СТАРТ
// =====================================================================
refreshHomeStatus();
