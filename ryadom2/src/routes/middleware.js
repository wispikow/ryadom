'use strict';
const crypto = require('node:crypto');
const { HttpError } = require('../controllers/httpError');

const adminToken = () => process.env.ADMIN_TOKEN || (process.env.NODE_ENV === 'production' ? null : 'ryadom-admin');

/** Доступ к управлению обращениями: заголовок Authorization: Bearer <ADMIN_TOKEN>. */
function requireAdmin(req, res, next) {
  const expected = adminToken();
  if (!expected) return next(new HttpError(503, 'admin_disabled', 'Админ-доступ не настроен (ADMIN_TOKEN)'));
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  const a = Buffer.from(m ? m[1] : '');
  const b = Buffer.from(expected);
  if (!m || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new HttpError(401, 'unauthorized', 'Нужен корректный токен администратора'));
  }
  next();
}

/** Простое ограничение частоты: не более max запросов за windowMs с одного IP. */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return next(new HttpError(429, 'too_many_requests', 'Слишком много обращений, попробуй чуть позже'));
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}

module.exports = { requireAdmin, rateLimit };
