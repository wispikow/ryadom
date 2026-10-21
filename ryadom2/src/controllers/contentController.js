'use strict';
const svc = require('../services/contentService');
const { HttpError } = require('./httpError');

const int = (v, def, min, max) => {
  if (v === undefined) return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, 'bad_request', `Параметр должен быть целым числом от ${min} до ${max}`);
  }
  return n;
};

exports.tags = (req, res) => res.json({ items: svc.listTags() });

exports.tracks = (req, res) => {
  const { tag, q, sort } = req.query;
  if (sort !== undefined && !['order', 'title', 'artist'].includes(sort)) {
    throw new HttpError(400, 'bad_request', 'sort: order | title | artist');
  }
  res.json(svc.listTracks({
    tag: typeof tag === 'string' ? tag : undefined,
    q: typeof q === 'string' ? q.slice(0, 100) : undefined,
    sort,
    limit: int(req.query.limit, 6, 1, 50),
    offset: int(req.query.offset, 0, 0, 100000),
  }));
};

exports.track = (req, res) => {
  const t = svc.getTrack(Number(req.params.id));
  if (!t) throw new HttpError(404, 'not_found', 'Трек не найден');
  res.json(t);
};

exports.videos = (req, res) => {
  const { kind } = req.query;
  if (kind !== undefined && !['podcast', 'music'].includes(kind)) {
    throw new HttpError(400, 'bad_request', 'kind: podcast | music');
  }
  res.json({ items: svc.listVideos(kind) });
};

exports.tips = (req, res) => res.json({ items: svc.listTips() });
exports.states = (req, res) => res.json({ items: svc.listStates() });

exports.randomQuote = (req, res) => {
  const q = svc.randomQuote(int(req.query.exclude, 0, 0, 1e9));
  if (!q) throw new HttpError(404, 'not_found', 'Цитат пока нет');
  res.json(q);
};
