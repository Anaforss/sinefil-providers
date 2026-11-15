// Kalite seçimi: Dzen MPD'deki GERÇEK yükseklikler başına bir giriş; her biri farklı istek (fragment) taşır.
// MPD'ler SENTETİK (ffmpeg testsrc ile üretilmiş fixture'ın yapısı); ağ yanıtları mock.
const assert = require('assert'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'providers/wekmed/cizgimax.js'), 'utf8');
const servers = [{ type: 'iframe', src: '/oynat/?t=SYNTH_DZEN', label: 'Dublaj - Dzen', embedId: 1 }];
const page = '<script>var servers = JSON.parse(atob("' + Buffer.from(JSON.stringify(servers)).toString('base64') + '"));</script>';
const rep = (id, h, bw, codec) => '<Representation bandwidth="' + bw + '" id="' + id + '" mimeType="video/mp4" codecs="' + (codec || 'avc1.42c028') + '" width="' + Math.round(h * 16 / 9) + '" height="' + h + '"><BaseURL>v' + id + '.mp4</BaseURL></Representation>';
const AUDIO = '<AdaptationSet contentType="audio"><Representation id="a" mimeType="audio/mp4" codecs="mp4a.40.2" bandwidth="64000"><BaseURL>a.mp4</BaseURL></Representation></AdaptationSet>';
const mpd = (reps, audio) => '<?xml version="1.0"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static"><Period>' + (audio === false ? '' : AUDIO) + '<AdaptationSet contentType="video">' + reps + '</AdaptationSet></Period></MPD>';
const BASE = 'https://vd1.okcdn.ru/?dzen_dash=dash&sig=SYNTH';
async function run(xml) {
  const respond = (url, body) => ({ ok: true, status: 200, url, text: () => Promise.resolve(body) });
  const f = (u) => {
    if (u.indexOf('/b-1-sezon-1-bolum-izle/') !== -1) return Promise.resolve(respond(u, page));
    if (u.indexOf('SYNTH_DZEN') !== -1) return Promise.resolve(respond('https://dzen.ru/embed/S', '"' + BASE + '"'));
    if (u.indexOf('okcdn.ru') !== -1) return Promise.resolve(respond(u, xml));
    return Promise.reject(new Error('unexpected ' + u));
  };
  const fn = new Function('fetch', 'console', 'module', code + '\nreturn fetchEpisodeStreams;')(f, { log() {} }, { exports: {} });
  return fn('https://cizgimax.online/b-1-sezon-1-bolum-izle/');
}
const q = (r) => r.map(x => x.quality);
(async () => {
  // 1) 1080+720+480: Auto + üç gerçek yükseklik; her biri farklı URL (fragment ile), sorgu/imza korunur
  let r = await run(mpd(rep(1, 1080, 1500000) + rep(2, 720, 900000) + rep(3, 480, 400000)));
  assert.deepStrictEqual(q(r), ['Auto', '1080p', '720p', '480p'], JSON.stringify(q(r)));
  assert.strictEqual(r[0].url, BASE, 'Auto = özgün MPD, değiştirilmemiş');
  assert.strictEqual(r[2].url, BASE + '#sinefil-video-height=720');
  assert.strictEqual(r[1].url, BASE + '#sinefil-video-height=1080');
  assert.strictEqual(new Set(r.map(x => x.url)).size, 4, 'her kalite farklı istek taşımalı');
  assert.ok(r.every(x => x.headers.Referer === 'https://dzen.ru/' && x.headers.Origin === 'https://dzen.ru'));
  assert.ok(new Set(r.map(x => x.title)).size === 4, 'başlıklar benzersiz');
  assert.ok(/720p/.test(r[2].title));
  // 2) Sadece 720: 1080 uydurulmaz
  r = await run(mpd(rep(1, 720, 900000) + rep(2, 360, 300000)));
  assert.deepStrictEqual(q(r), ['Auto', '720p', '360p']);
  assert.ok(!r.some(x => /1080/.test(x.quality + x.url)));
  // 3) Tek yükseklik: tek giriş, fragment yok (seçilecek bir şey yok)
  r = await run(mpd(rep(1, 720, 900000)));
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].quality, '720p'); assert.strictEqual(r[0].url, BASE);
  // 4) Aynı yükseklik iki codec: tek giriş (yineleme yok)
  r = await run(mpd(rep(1, 1080, 1500000, 'avc1.640028') + rep(2, 1080, 900000, 'hev1.1.6.L120') + rep(3, 720, 500000)));
  assert.deepStrictEqual(q(r), ['Auto', '1080p', '720p']);
  // 5) Ses AdaptationSet'i yok: yine de kalite girişleri (sessiz kaynak uydurulmaz ama ses silinmez — MPD olduğu gibi)
  r = await run(mpd(rep(1, 1080, 1500000) + rep(2, 720, 900000), false));
  assert.deepStrictEqual(q(r), ['Auto', '1080p', '720p']);
  // 6) Öznitelik sırası farklı + yalnız height ile (mimeType yok) ayrıştırma
  r = await run('<MPD><Period><AdaptationSet mimeType="audio/mp4"><Representation id="a" bandwidth="1"/></AdaptationSet><AdaptationSet><Representation height="1080" bandwidth="9" codecs="avc1.1"/><Representation codecs="avc1.2" bandwidth="5" height="720"/></AdaptationSet></Period></MPD>');
  assert.deepStrictEqual(q(r), ['Auto', '1080p', '720p']);
  console.log('OK quality');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
