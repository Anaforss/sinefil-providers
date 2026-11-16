// SENTETİK yanıtlar (gerçek site yanıtı DEĞİL): .nl her isteğe 403 "error code: 1005" döndürürse
// sağlayıcı kör slug denemelerini sürdürmemeli; ilk erişim engelinde durmalı ve boş dönmeli.
const assert = require('assert'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(process.env.HDFC_CODE || path.join(__dirname, '..', 'providers/anthology/hdfilmcehennemi.js'), 'utf8');
const resp = (s, b, j) => ({ ok: s >= 200 && s < 300, status: s, text: async () => b, json: async () => j });
async function run(id, siteStatus) {
  const calls = [];
  const f = async (u) => {
    calls.push(u);
    if (u.includes('raw.githubusercontent.com')) return resp(404, '', {});
    if (u.includes('themoviedb.org')) return resp(200, '', { title: 'Başlangıç', original_title: 'Inception', release_date: '2010-07-16', imdb_id: 'tt1375666' });
    return resp(siteStatus, 'error code: 1005');
  };
  globalThis.TMDB_API_KEY = 'SYNTH';
  const m = { exports: {} };
  new Function('fetch', 'module', 'require', 'console', code)(f, m, undefined, { log() {} });
  const r = await m.exports.getStreams(id, 'movie');
  return { r, site: calls.filter(c => c.includes('hdfilmcehennemi.nl')).length };
}
(async () => {
  let x = await run('27205', 403);
  console.log('403 numeric TMDB: streams=' + x.r.length + ' siteRequests=' + x.site);
  assert.deepStrictEqual(x.r, []);
  assert.ok(x.site <= 1, 'erişim engelinde kör slug döngüsü sürdü: ' + x.site);
  x = await run('155', 403); // FILM_MAP'te bilinen vaka: tek sayfa isteği
  assert.deepStrictEqual(x.r, []); assert.ok(x.site <= 1);
  x = await run('27205', 404); // gerçek "bulunamadı" davranışı korunmalı: adaylar denenir
  assert.ok(x.site > 5, '404 durumunda aday denemesi korunmalı: ' + x.site);
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
