'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite'); // встроенный SQLite (Node.js 22.5+)

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'ryadom.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/** Создаёт таблицы, если их ещё нет (идемпотентно). */
function initSchema() {
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}

/** Выполняет fn внутри транзакции: при ошибке все изменения откатываются. */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Схема создаётся при подключении, чтобы подготовленные запросы в сервисах находили таблицы
initSchema();

module.exports = { db, initSchema, transaction, DB_PATH };
