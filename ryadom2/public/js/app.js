'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /** Создаёт элемент; текст вставляется через textContent (без innerHTML) */
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role') n.setAttribute(k, v);
      else n[k] = v;
    }
    kids.flat().forEach((c) => c != null && n.append(c));
    return n;
  }

  /** Запрос к REST API; бросает ошибку с полями status/details */
  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(`/api${path}`, {
        headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
        ...opts,
      });
    } catch {
      const e = new Error('Нет связи с сервером. Проверь интернет и попробуй ещё раз.');
      e.network = true;
      throw e;
    }
    let data = null;
    if (res.status !== 204) { try { data = await res.json(); } catch { /* пустой ответ */ } }
    if (!res.ok) {
      const err = new Error((data && data.error && data.error.message) || 'Что-то пошло не так');
      err.status = res.status;
      err.details = data && data.error && data.error.details;
      throw err;
    }
    return data;
  }

  /** Состояние блока: загрузка / ошибка с кнопкой «Повторить» */
  const setBusy = (box, busy) => box.setAttribute('aria-busy', busy ? 'true' : 'false');
  function showError(box, text, retry) {
    setBusy(box, false);
    const btn = el('button', { type: 'button', text: 'Повторить' });
    btn.addEventListener('click', retry);
    box.replaceChildren(el('li', { class: 'state-msg state-msg--error' }, text, btn));
  }

  /* ---------- Навигация ---------- */
  const burger = $('.burger');
  const nav = $('#site-nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  const dropBtn = $('.nav__link--btn');
  const dropMenu = $('#drop-menu');
  function toggleDrop(open) {
    dropBtn.setAttribute('aria-expanded', open);
    dropMenu.hidden = !open;
  }
  dropBtn.addEventListener('click', () => toggleDrop(dropMenu.hidden));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__drop')) toggleDrop(false);
    if (e.target.closest('#site-nav a')) { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); toggleDrop(false); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!dropMenu.hidden) { toggleDrop(false); dropBtn.focus(); }
    if (!comboMenu.hidden) { toggleCombo(false); comboBtn.focus(); }
  });

  /* ---------- Эмоциональные состояния ---------- */
  const statesList = $('#states-list');
  async function loadStates() {
    setBusy(statesList, true);
    try {
      const { items } = await api('/states');
      statesList.replaceChildren(...items.map((s) => el('li', { class: 'state' },
        el('div', { class: 'state__box' }, el('img', { src: s.image, alt: '', loading: 'lazy' })),
        el('p', { class: 'state__name', text: s.title }))));
      setBusy(statesList, false);
    } catch (e) { showError(statesList, e.message, loadStates); }
  }

  /* ---------- Цитата ---------- */
  const quoteText = $('#quote-text');
  const quoteBtn = $('#quote-btn');
  const quoteStatus = $('#quote-status');
  let quoteId = 0;
  quoteBtn.addEventListener('click', async () => {
    quoteBtn.disabled = true; quoteStatus.textContent = '';
    try {
      let q = await api(`/quotes/random?exclude=${quoteId}`);
      if (q.text === quoteText.textContent.trim()) q = await api(`/quotes/random?exclude=${q.id}`);
      quoteId = q.id;
      quoteText.textContent = q.text;
    } catch (e) { quoteStatus.textContent = e.message; }
    finally { quoteBtn.disabled = false; }
  });

  /* ---------- Музыка ---------- */
  const tracksList = $('#tracks-list');
  const moreBtn = $('#tracks-more');
  const tracksStatus = $('#tracks-status');
  const PAGE = 6;
  let offset = 0;

  const trackCard = (t) => el('li', { class: `track${t.featured ? ' is-featured' : ''}` },
    el('img', { class: 'track__cover', src: t.cover, alt: `Обложка: ${t.artist} — ${t.title}`, loading: 'lazy' }),
    el('div', { class: 'track__head' }, el('h3', { class: 'track__title', text: `${t.title} - ${t.artist}` })),
    el('div', { class: 'track__foot' },
      el('ul', { class: 'tags', 'aria-label': 'Теги' }, t.tags.map((g) => el('li', { class: 'tag', text: g }))),
      el('a', { class: 'listen', href: t.listenUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Слушать «${t.title}» на Яндекс Музыке` },
        el('img', { src: '/assets/img/yamusic.webp', alt: '', width: 55, height: 55 }))));

  async function loadTracks(first = false) {
    moreBtn.disabled = true; tracksStatus.textContent = '';
    if (first) setBusy(tracksList, true);
    else moreBtn.textContent = 'Загружаем…';
    try {
      const data = await api(`/tracks?limit=${PAGE}&offset=${offset}`);
      const cards = data.items.map(trackCard);
      if (first) tracksList.replaceChildren(...cards); else tracksList.append(...cards);
      offset += data.items.length;
      setBusy(tracksList, false);
      moreBtn.textContent = 'Больше треков';
      if (data.hasMore) moreBtn.disabled = false;
      else { moreBtn.textContent = 'Это все треки'; tracksStatus.textContent = ''; }
    } catch (e) {
      moreBtn.textContent = 'Больше треков'; moreBtn.disabled = false;
      if (first) showError(tracksList, e.message, () => loadTracks(true));
      else tracksStatus.textContent = e.message;
    }
  }
  moreBtn.addEventListener('click', () => loadTracks(false));

  /* ---------- Видео + слайдер ---------- */
  const track = $('#videos-track');
  const prev = $('#video-prev');
  const next = $('#video-next');

  const videoCard = (v) => el('li', { class: `vcard${v.featured ? ' is-featured' : ''}` },
    v.thumbnail && el('a', { class: 'vcard__thumb', href: v.watchUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Смотреть: ${v.title}`, tabIndex: -1 },
      el('img', { src: v.thumbnail, alt: '', loading: 'lazy' })),
    el('p', { class: 'vcard__kind', text: v.kind === 'podcast' ? 'Podcast' : 'Music' }),
    el('h3', { class: 'vcard__title' }, el('a', { href: v.watchUrl, target: '_blank', rel: 'noopener noreferrer', text: v.title })),
    el('div', { class: 'vcard__foot' },
      el('ul', { class: 'tags', 'aria-label': 'Теги' }, v.tags.map((g) => el('li', { class: 'tag', text: g }))),
      el('a', { class: 'vcard__yt', href: v.watchUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Смотреть на YouTube' },
        el('img', { src: '/assets/img/youtube.webp', alt: '' }))));

  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }
  const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 14 : 300);
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  async function loadVideos() {
    setBusy(track, true);
    try {
      const { items } = await api('/videos');
      track.replaceChildren(...items.map(videoCard));
      setBusy(track, false);
      updateArrows();
    } catch (e) { showError(track, e.message, loadVideos); updateArrows(); }
  }

  /* ---------- Советы ---------- */
  const tipsList = $('#tips-list');
  async function loadTips() {
    setBusy(tipsList, true);
    try {
      const { items } = await api('/tips');
      tipsList.replaceChildren(...items.map((t) => el('li', { class: 'tip' },
        el('img', { class: 'tip__icon', src: t.icon, alt: '', loading: 'lazy' }),
        el('h3', { class: 'tip__title', text: t.title }),
        el('p', { class: 'tip__body', text: t.body }))));
      setBusy(tipsList, false);
    } catch (e) { showError(tipsList, e.message, loadTips); }
  }

  /* ---------- Выбор соцсети (подставляет префикс ссылки) ---------- */
  const comboBtn = $('.combo__btn');
  const comboMenu = $('#social-menu');
  const socialInput = $('#f-social');
  function toggleCombo(open) { comboBtn.setAttribute('aria-expanded', open); comboMenu.hidden = !open; }
  comboBtn.addEventListener('click', () => toggleCombo(comboMenu.hidden));
  comboMenu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-prefix]');
    if (!b) return;
    const prefixes = $$('button[data-prefix]', comboMenu).map((x) => x.dataset.prefix);
    const cur = socialInput.value.trim();
    if (!cur || prefixes.some((p) => cur === p || cur.startsWith(p))) {
      const tail = prefixes.reduce((v, p) => (v.startsWith(p) ? v.slice(p.length) : v), cur);
      socialInput.value = b.dataset.prefix + tail;
    } else socialInput.value = b.dataset.prefix;
    toggleCombo(false); socialInput.focus();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.combo')) toggleCombo(false); });

  /* ---------- Форма обращения ---------- */
  const form = $('#request-form');
  const sendBtn = $('#send-btn');
  const statusBox = $('#form-status');

  // Те же правила, что на сервере (сервер всё равно проверяет повторно)
  const rules = {
    fullName: (v) => !v ? 'Укажи ФИО' : v.length < 2 ? 'ФИО должно быть от 2 до 120 символов'
      : !/^[\p{L}][\p{L}\s'’.-]*$/u.test(v) ? 'ФИО может содержать только буквы, пробелы и дефис' : '',
    email: (v) => !v ? 'Укажи почту' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Введи корректный адрес почты' : '',
    phone: (v) => !v ? 'Укажи телефон' : !/^\+?\d{10,15}$/.test(v.replace(/[\s()-]/g, '')) ? 'Телефон: от 10 до 15 цифр, например +79991234567' : '',
    socialUrl: (v) => {
      if (!v) return 'Укажи ссылку на соцсеть';
      try { const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); return u.hostname.includes('.') ? '' : 'Введи корректную ссылку'; }
      catch { return 'Введи корректную ссылку, например https://t.me/username'; }
    },
    message: (v) => !v ? 'Опиши свою проблему' : v.length < 10 ? 'Опиши подробнее — минимум 10 символов' : v.length > 2000 ? 'Максимум 2000 символов' : '',
  };

  function setFieldError(name, msg) {
    const input = form.elements[name];
    const box = input.closest('.field');
    $(`#e-${name}`).textContent = msg || '';
    box.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  const status = (text, kind) => { statusBox.textContent = text; statusBox.className = `form__status${kind ? ` is-${kind}` : ''}`; };

  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => { if (input.value.trim()) setFieldError(name, rules[name](input.value.trim())); });
    input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) setFieldError(name, rules[name](input.value.trim())); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status('');
    const data = Object.fromEntries(Object.keys(rules).map((n) => [n, form.elements[n].value.trim()]));
    let firstBad = null;
    for (const n of Object.keys(rules)) {
      const msg = rules[n](data[n]);
      setFieldError(n, msg);
      if (msg && !firstBad) firstBad = form.elements[n];
    }
    if (firstBad) { firstBad.focus(); status('Проверь заполнение полей', 'error'); return; }

    sendBtn.disabled = true; form.setAttribute('aria-busy', 'true');
    status('Отправляем…');
    try {
      const res = await api('/requests', { method: 'POST', body: JSON.stringify(data) });
      form.reset();
      Object.keys(rules).forEach((n) => setFieldError(n, ''));
      status(res.message || 'Спасибо! Мы получили твоё обращение.', 'ok');
    } catch (err) {
      if (err.status === 400 && err.details) {
        let focused = false;
        for (const [n, msg] of Object.entries(err.details)) {
          if (form.elements[n]) { setFieldError(n, msg); if (!focused) { form.elements[n].focus(); focused = true; } }
        }
        status('Проверь заполнение полей', 'error');
      } else if (err.status === 429) status('Слишком много обращений. Попробуй чуть позже.', 'error');
      else status(err.message || 'Не удалось отправить. Попробуй ещё раз.', 'error');
    } finally { sendBtn.disabled = false; form.setAttribute('aria-busy', 'false'); }
  });

  /* ---------- Старт ---------- */
  loadStates(); loadTracks(true); loadVideos(); loadTips();
})();
