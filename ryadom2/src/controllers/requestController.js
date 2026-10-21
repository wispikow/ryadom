'use strict';
const svc = require('../services/requestService');
const { validateRequest } = require('../services/validation');
const { HttpError } = require('./httpError');

const idOf = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'bad_request', 'Некорректный id');
  return id;
};

exports.create = (req, res) => {
  const { errors, value } = validateRequest(req.body);
  if (Object.keys(errors).length) throw new HttpError(400, 'validation_error', 'Проверь заполнение полей', errors);
  const r = svc.create(value);
  res.status(201).json({ success: true, id: r.id, message: 'Спасибо! Мы получили твоё обращение.' });
};

exports.list = (req, res) => {
  const { status, order } = req.query;
  if (status !== undefined && !svc.STATUSES.includes(status)) {
    throw new HttpError(400, 'bad_request', `status: ${svc.STATUSES.join(' | ')}`);
  }
  res.json({ items: svc.list({ status, order }) });
};

exports.updateStatus = (req, res) => {
  const status = req.body && req.body.status;
  if (!svc.STATUSES.includes(status)) {
    throw new HttpError(400, 'validation_error', 'Некорректный статус', { status: `Допустимо: ${svc.STATUSES.join(', ')}` });
  }
  const r = svc.updateStatus(idOf(req), status);
  if (!r) throw new HttpError(404, 'not_found', 'Обращение не найдено');
  res.json(r);
};

exports.remove = (req, res) => {
  if (!svc.remove(idOf(req))) throw new HttpError(404, 'not_found', 'Обращение не найдено');
  res.status(204).end();
};
