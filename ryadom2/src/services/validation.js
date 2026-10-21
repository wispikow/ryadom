'use strict';

/** Проверка и нормализация данных формы обращения. */
function validateRequest(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const fullName = str(b.fullName).replace(/\s+/g, ' ');
  if (!fullName) errors.fullName = 'Укажи ФИО';
  else if (fullName.length < 2 || fullName.length > 120) errors.fullName = 'ФИО должно быть от 2 до 120 символов';
  else if (!/^[\p{L}][\p{L}\s'’.-]*$/u.test(fullName)) errors.fullName = 'ФИО может содержать только буквы, пробелы и дефис';

  const email = str(b.email).toLowerCase();
  if (!email) errors.email = 'Укажи почту';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Введи корректный адрес почты';

  const phoneRaw = str(b.phone);
  const phone = phoneRaw.replace(/[\s()-]/g, '');
  if (!phoneRaw) errors.phone = 'Укажи телефон';
  else if (!/^\+?\d{10,15}$/.test(phone)) errors.phone = 'Телефон: от 10 до 15 цифр, например +79991234567';

  let socialUrl = str(b.socialUrl);
  if (!socialUrl) errors.socialUrl = 'Укажи ссылку на соцсеть';
  else {
    if (!/^https?:\/\//i.test(socialUrl)) socialUrl = `https://${socialUrl}`;
    try {
      const u = new URL(socialUrl);
      if (!u.hostname.includes('.') || socialUrl.length > 300) throw new Error('bad');
      socialUrl = u.toString();
    } catch {
      errors.socialUrl = 'Введи корректную ссылку, например https://t.me/username';
    }
  }

  const message = str(b.message);
  if (!message) errors.message = 'Опиши свою проблему';
  else if (message.length < 10) errors.message = 'Опиши подробнее — минимум 10 символов';
  else if (message.length > 2000) errors.message = 'Максимум 2000 символов';

  return { errors, value: { fullName, email, phone, socialUrl, message } };
}

module.exports = { validateRequest };
