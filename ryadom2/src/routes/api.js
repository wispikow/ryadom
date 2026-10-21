'use strict';
const express = require('express');
const content = require('../controllers/contentController');
const requests = require('../controllers/requestController');
const { requireAdmin, rateLimit } = require('./middleware');

const r = express.Router();
r.get('/health', (req, res) => res.json({ status: 'ok' }));
r.get('/tags', content.tags);
r.get('/tracks', content.tracks);
r.get('/tracks/:id', content.track);
r.get('/videos', content.videos);
r.get('/tips', content.tips);
r.get('/states', content.states);
r.get('/quotes/random', content.randomQuote);

r.post('/requests', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), requests.create);
r.get('/requests', requireAdmin, requests.list);
r.patch('/requests/:id', requireAdmin, requests.updateStatus);
r.delete('/requests/:id', requireAdmin, requests.remove);

module.exports = r;
