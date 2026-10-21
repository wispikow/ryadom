'use strict';
const { db } = require('../database/db');

const STATUSES = ['new', 'in_progress', 'done'];

const map = (r) => ({
  id: r.id, fullName: r.full_name, email: r.email, phone: r.phone,
  socialUrl: r.social_url, message: r.message, status: r.status, createdAt: r.created_at,
});

function create(v) {
  const info = db.prepare(`INSERT INTO requests (full_name, email, phone, social_url, message)
    VALUES (?, ?, ?, ?, ?)`).run(v.fullName, v.email, v.phone, v.socialUrl, v.message);
  return map(db.prepare('SELECT * FROM requests WHERE id = ?').get(info.lastInsertRowid));
}

function list({ status, order }) {
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const rows = status
    ? db.prepare(`SELECT * FROM requests WHERE status = ? ORDER BY created_at ${dir}, id ${dir}`).all(status)
    : db.prepare(`SELECT * FROM requests ORDER BY created_at ${dir}, id ${dir}`).all();
  return rows.map(map);
}

function updateStatus(id, status) {
  const info = db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, id);
  return info.changes ? map(db.prepare('SELECT * FROM requests WHERE id = ?').get(id)) : null;
}

const remove = (id) => db.prepare('DELETE FROM requests WHERE id = ?').run(id).changes > 0;

module.exports = { create, list, updateStatus, remove, STATUSES };
