'use strict';
const { db, initSchema, transaction } = require('./db');

const yaMusic = (q) => `https://music.yandex.ru/search?text=${encodeURIComponent(q)}`;
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// Первые шесть треков — из макета; остальные раскрываются кнопкой «Больше треков»
const tracks = [
  ['Улыбайся', 'IOWA', 'cover-iowa.webp', 1, ['без негатива']],
  ['Unstoppable', 'Sia', 'cover-sia.webp', 0, ['уверенность в победе']],
  ['Я тебя могну', 'ЦУЕФА', 'cover-tsuefa.webp', 0, ['уверенность']],
  ['Stronger', 'Kelly Clarkson', 'cover-stronger.webp', 1, ['не сдаваться', 'становиться сильнее после трудностей']],
  ['Я твой номер один', 'Дима Билан', 'cover-bilan.webp', 1, ['позитив', 'вера в лучшее']],
  ['Shape Of My Heart', 'Sting', 'cover-sting.webp', 0, ['ностальгия']],
  ['Don’t Stop Believin’', 'Journey', 'cover-demo-1.svg', 0, ['вера в лучшее']],
  ['Eye of the Tiger', 'Survivor', 'cover-demo-2.svg', 1, ['уверенность в победе']],
  ['Here Comes the Sun', 'The Beatles', 'cover-demo-3.svg', 0, ['позитив', 'ностальгия']],
  ['Three Little Birds', 'Bob Marley & The Wailers', 'cover-demo-4.svg', 0, ['без негатива']],
  ['Fix You', 'Coldplay', 'cover-demo-5.svg', 0, ['становиться сильнее после трудностей']],
  ['Dog Days Are Over', 'Florence + The Machine', 'cover-demo-6.svg', 1, ['не сдаваться', 'позитив']],
];

const videos = [
  ['podcast', 'Когда не хочется ничего делать и теряешь веру в себя, что это и как быть?', 'video-podcast.webp', '12:24',
    yt('Психиатр Про я ничего не хочу'), 1, ['психология', 'самопомощь']],
  ['music', 'Плейлист треков на фон', 'video-music.webp', null,
    yt('плейлист треков на фон для учёбы'), 0, ['настроение', 'отдых', 'ностальгия']],
];

const states = [
  ['отрицание', 'state-denial.webp'], ['гнев', 'state-anger.webp'], ['торг', 'scales.webp'],
  ['депрессия', 'state-depression.webp'], ['принятие', 'state-acceptance.webp'],
];

const tips = [
  ['Регулярные перерывы', 'Нельзя забывать в первую очередь о здоровье. Хорошо позанимался — не забыл о хорошем перерыве', 'icon-squiggle.png'],
  ['Качественный отдых', 'Занимайся в свободное от учебы время тем, что приносит истинное удовольствие', 'icon-smile.png'],
  ['Обращение к специалисту', 'Не стесняйся обратиться к психологу или психиатру, если понимаешь, что тебе сильно тяжело', 'icon-faces.png'],
  ['Наше сообщество', 'Поддержка — это важно, а особенно от людей, которые находятся в схожей с твоей ситуации', 'icon-star.png'],
];

const quotes = [
  'Людям нужны тяжёлые времена и трудные испытания, чтобы развить мускулы души',
  'Один шаг за раз — это тоже движение вперёд',
  'Усталость — не слабость, а сигнал сделать паузу',
  'Экзамен — это один день, а не оценка тебя как человека',
  'Просить о помощи — это нормально',
];

function seed() {
  initSchema();
  transaction(() => {
    const addTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const tagId = db.prepare('SELECT id FROM tags WHERE name = ?');
    const ensureTag = (n) => { addTag.run(n); return tagId.get(n).id; };

    const addTrack = db.prepare(`INSERT OR IGNORE INTO tracks
      (title, artist, cover, listen_url, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
    const getTrack = db.prepare('SELECT id FROM tracks WHERE title = ? AND artist = ?');
    const linkTrack = db.prepare('INSERT OR IGNORE INTO track_tags (track_id, tag_id) VALUES (?, ?)');
    tracks.forEach(([title, artist, cover, feat, tags], i) => {
      addTrack.run(title, artist, cover, yaMusic(`${artist} ${title}`), feat, i + 1);
      const id = getTrack.get(title, artist).id;
      tags.forEach((t) => linkTrack.run(id, ensureTag(t)));
    });

    const addVideo = db.prepare(`INSERT OR IGNORE INTO videos
      (kind, title, thumbnail, duration, watch_url, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const getVideo = db.prepare('SELECT id FROM videos WHERE title = ?');
    const linkVideo = db.prepare('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)');
    videos.forEach(([kind, title, thumb, dur, url, feat, tags], i) => {
      addVideo.run(kind, title, thumb, dur, url, feat, i + 1);
      const id = getVideo.get(title).id;
      tags.forEach((t) => linkVideo.run(id, ensureTag(t)));
    });

    const addState = db.prepare('INSERT OR IGNORE INTO emotional_states (title, image, sort_order) VALUES (?, ?, ?)');
    states.forEach(([t, img], i) => addState.run(t, img, i + 1));
    const addTip = db.prepare('INSERT OR IGNORE INTO tips (title, body, icon, sort_order) VALUES (?, ?, ?, ?)');
    tips.forEach(([t, b, ic], i) => addTip.run(t, b, ic, i + 1));
    const addQuote = db.prepare('INSERT OR IGNORE INTO quotes (text) VALUES (?)');
    quotes.forEach((q) => addQuote.run(q));
  });
}

module.exports = { seed };
if (require.main === module) {
  seed();
  console.log('База данных инициализирована и заполнена начальными данными.');
}
