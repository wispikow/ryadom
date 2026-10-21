'use strict';
const path = require('node:path');
const express = require('express');
const { seed } = require('./src/database/seed');
const api = require('./src/routes/api');

seed();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Маршрут не найден' } }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Единый формат ошибок: 400 (в т.ч. битый JSON), 401, 404, 413, 429, 500
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') err = Object.assign(err, { status: 400, code: 'bad_json', message: 'Некорректный JSON' });
  if (err.type === 'entity.too.large') err = Object.assign(err, { status: 413, code: 'too_large', message: 'Слишком большой запрос' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: {
      code: err.code || 'internal_error',
      message: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
      ...(err.details && { details: err.details }),
    },
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`«Рядом» запущен: http://localhost:${PORT}`));
module.exports = app;
