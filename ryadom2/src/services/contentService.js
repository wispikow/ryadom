'use strict';
const { db } = require('../database/db');

const trackTags = db.prepare('SELECT t.name FROM track_tags x JOIN tags t ON t.id = x.tag_id WHERE x.track_id = ? ORDER BY x.rowid');
const videoTags = db.prepare('SELECT t.name FROM video_tags x JOIN tags t ON t.id = x.tag_id WHERE x.video_id = ? ORDER BY x.rowid');

const mapTrack = (r) => ({
  id: r.id, title: r.title, artist: r.artist, cover: `/assets/img/${r.cover}`,
  listenUrl: r.listen_url, featured: !!r.is_featured,
  tags: trackTags.all(r.id).map((t) => t.name),
});

const listTags = () => db.prepare('SELECT id, name FROM tags ORDER BY name').all();

function listTracks({ tag, q, sort, limit, offset }) {
  const where = []; const params = [];
  if (tag) {
    where.push('t.id IN (SELECT tt.track_id FROM track_tags tt JOIN tags g ON g.id = tt.tag_id WHERE g.name = ?)');
    params.push(tag);
  }
  if (q) { where.push('(t.title LIKE ? OR t.artist LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = sort === 'title' ? 't.title COLLATE NOCASE ASC'
    : sort === 'artist' ? 't.artist COLLATE NOCASE ASC' : 't.sort_order ASC, t.id ASC';
  const total = db.prepare(`SELECT COUNT(*) c FROM tracks t ${w}`).get(...params).c;
  const rows = db.prepare(`SELECT t.* FROM tracks t ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { items: rows.map(mapTrack), total, limit, offset, hasMore: offset + rows.length < total };
}

function getTrack(id) {
  const r = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  return r ? mapTrack(r) : null;
}

function listVideos(kind) {
  const rows = kind
    ? db.prepare('SELECT * FROM videos WHERE kind = ? ORDER BY sort_order, id').all(kind)
    : db.prepare('SELECT * FROM videos ORDER BY sort_order, id').all();
  return rows.map((r) => ({
    id: r.id, kind: r.kind, title: r.title, thumbnail: `/assets/img/${r.thumbnail}`,
    duration: r.duration, watchUrl: r.watch_url, featured: !!r.is_featured,
    tags: videoTags.all(r.id).map((t) => t.name),
  }));
}

const listTips = () => db.prepare('SELECT * FROM tips ORDER BY sort_order, id').all()
  .map((r) => ({ id: r.id, title: r.title, body: r.body, icon: `/assets/img/${r.icon}` }));

const listStates = () => db.prepare('SELECT * FROM emotional_states ORDER BY sort_order, id').all()
  .map((r) => ({ id: r.id, title: r.title, image: `/assets/img/${r.image}` }));

function randomQuote(excludeId) {
  return db.prepare('SELECT id, text FROM quotes WHERE id != ? ORDER BY RANDOM() LIMIT 1').get(excludeId || 0)
    || db.prepare('SELECT id, text FROM quotes LIMIT 1').get() || null;
}

module.exports = { listTags, listTracks, getTrack, listVideos, listTips, listStates, randomQuote };
