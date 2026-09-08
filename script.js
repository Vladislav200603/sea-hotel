/* Готова версія: меню, вибір номера та підготовка листа.
  Форма нічого не надсилає автоматично й не зберігає персональні дані. */
(() => {
  'use strict';
  const roomNames = { any: 'Допоможіть обрати', standard: 'Стандарт', suite: 'Люкс', family: 'Сімейний' };
  const recipient = 'vladvelikohatko@gmail.com';
  const dayMs = 86400000;

  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function dateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const timestamp = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
  }
  function addDay(value) {
    const timestamp = dateValue(value);
    return Number.isFinite(timestamp) ? new Date(timestamp + dayMs).toISOString().slice(0, 10) : '';
  }
  function nightsBetween(start, end) {
    return Math.round((dateValue(end) - dateValue(start)) / dayMs);
  }
  function nightLabel(number) {
    const last = number % 10;
    const lastTwo = number % 100;
    return last === 1 && lastTwo !== 11 ? 'ніч' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'ночі' : 'ночей';
  }
  function formatDate(value) {
    return value.split('-').reverse().join('.');
  }
  function createRequest(data) {
    const nights = nightsBetween(data.checkIn, data.checkOut);
    const body = [
      'Вітаю! Хочу уточнити можливість проживання в готелі «Морський».',
      '', 'Номер: ' + (roomNames[data.room] || roomNames.any),
      'Заїзд: ' + formatDate(data.checkIn), 'Виїзд: ' + formatDate(data.checkOut),
      'Тривалість: ' + nights + ' ' + nightLabel(nights),
      'Гостей, разом із дітьми: ' + data.guests,
      'Ім’я: ' + data.name.trim(), 'Email для відповіді: ' + data.email.trim(),
      data.message.trim() ? 'Побажання: ' + data.message.trim() : '',
      '', 'Підкажіть, будь ласка, наявність номерів, вартість та умови.',
      'Це запит, а не підтверджене бронювання.'
    ].filter((line) => line !== undefined).join('\n');
    return {
      body,
      href: 'mailto:' + recipient + '?subject=' + encodeURIComponent('Запит на проживання — Морський') + '&body=' + encodeURIComponent(body)
    };
  }

  // Чисті функції доступні тестам Node.js; у браузері змінні залишаються всередині блоку.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { localDate, dateValue, addDay, nightsBetween, nightLabel, createRequest };
  }
  if (typeof document === 'undefined') return;

  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const menuLabel = document.querySelector('.menu-label');
  const nav = document.querySelector('#site-nav');
  const mobile = window.matchMedia('(max-width: 1050px)');
  function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Закрити' : 'Меню';
    nav.hidden = mobile.matches && !open;
  }
  function syncMenu() {
    menuButton.hidden = !mobile.matches;
    setMenu(false);
  }
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobile.addEventListener('change', syncMenu);
  syncMenu();
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (!mobile.matches) return;
      setMenu(false);
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.matches && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (mobile.matches && !header.contains(event.target)) setMenu(false);
  });
  function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const form = document.querySelector('#booking-form');
  const room = document.querySelector('#room-type');
  const checkIn = document.querySelector('#check-in');
  const checkOut = document.querySelector('#check-out');
  const name = document.querySelector('#guest-name');
  const summary = document.querySelector('#booking-summary');
  const result = document.querySelector('#booking-result');
  const preview = document.querySelector('#email-preview');
  const copyStatus = document.querySelector('#copy-status');

  function updateDates() {
    const today = localDate();
    checkIn.min = today;
    checkOut.min = addDay(checkIn.value && checkIn.value >= today ? checkIn.value : today);
    checkIn.setCustomValidity(checkIn.value && checkIn.value < today ? 'Дата заїзду не може бути в минулому.' : '');
    const nights = nightsBetween(checkIn.value, checkOut.value);
    checkOut.setCustomValidity(checkOut.value && checkIn.value && (!Number.isFinite(nights) || nights < 1) ? 'Виїзд має бути щонайменше на один день пізніше заїзду.' : '');
    summary.textContent = Number.isFinite(nights) && nights > 0 && checkIn.value >= today
      ? formatDate(checkIn.value) + ' — ' + formatDate(checkOut.value) + ' · ' + nights + ' ' + nightLabel(nights)
      : 'Оберіть заїзд не раніше сьогодні та виїзд після заїзду.';
  }
  form.addEventListener('input', () => {
    result.hidden = true;
    copyStatus.textContent = '';
    name.setCustomValidity(name.value && !name.value.trim() ? 'Введіть ім’я, а не лише пробіли.' : '');
    updateDates();
  });
  form.addEventListener('change', () => { result.hidden = true; updateDates(); });
  document.querySelectorAll('[data-room]').forEach((link) => {
    link.addEventListener('click', () => {
      room.value = link.dataset.room;
      result.hidden = true;
      updateDates();
      room.focus({ preventScroll: true });
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateDates();
    name.setCustomValidity(!name.value.trim() ? 'Вкажіть ваше ім’я.' : '');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const request = createRequest(data);
    document.querySelector('#email-link').href = request.href;
    preview.value = request.body;
    copyStatus.textContent = '';
    result.hidden = false;
    result.focus();
  });
  document.querySelector('#copy-request').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(preview.value);
      copyStatus.textContent = 'Текст скопійовано. Вставте його в лист.';
    } catch {
      preview.focus();
      preview.select();
      copyStatus.textContent = 'Текст виділено. Оберіть «Копіювати» в меню пристрою.';
    }
  });
  window.addEventListener('pageshow', updateDates);
  updateDates();
  document.querySelector('#prepare-email').disabled = false;
})();
