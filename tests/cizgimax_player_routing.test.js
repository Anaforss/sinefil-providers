// Sanitized structure of a real user capture (Ben 10 2005 S1E1): 2 iframe servers,
// labels 'Dublaj - Dzen' and 'Vidmoly', src=/oynat/?t=<TOKEN>. Tokens/hosts below are SYNTHETIC.
// Fetch responses are synthetic mocks (site is behind a Cloudflare challenge for non-browser clients).
const assert = require('assert'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'providers/wekmed/cizgimax.js'), 'utf8');
const servers = [
  { type: 'iframe', src: '/oynat/?t=SYNTH_DZEN', label: 'Dublaj - Dzen', lang: 'dub', embedId: 1 },
  { type: 'iframe', src: '/oynat/?t=SYNTH_VIDMOLY', label: 'Vidmoly', lang: 'dub', embedId: 2 },
  { type: 'iframe', src: '/oynat/?t=SYNTH_OTHER', label: 'Bilinmeyen', lang: 'dub', embedId: 3 },
];
const page = '<script>var servers = JSON.parse(atob("' + Buffer.from(JSON.stringify(servers)).toString('base64') + '"));</script>';
const mod = { exports: {} };
const logs = [];
const respond = (url, body) => ({ ok: true, status: 200, url, text: () => Promise.resolve(body), json: () => Promise.resolve({}) });
// Standart DASH MPD (SENTETİK): öznitelik sırası farklı, kalite özniteliği yok, ses+video ayrı AdaptationSet
const MPD = '<?xml version="1.0"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static"><Period>' +
  '<AdaptationSet mimeType="audio/mp4"><Representation id="a" codecs="mp4a.40.2" bandwidth="128000"><BaseURL>a.mp4</BaseURL></Representation></AdaptationSet>' +
  '<AdaptationSet contentType="video"><Representation height="360" bandwidth="500000" id="v1" codecs="avc1.4d401e" mimeType="video/mp4"><BaseURL>v1.mp4</BaseURL></Representation>' +
  '<Representation id="v2" mimeType="video/mp4" codecs="avc1.4d401f" bandwidth="1500000" width="1280" height="720"><BaseURL>v2.mp4</BaseURL></Representation></AdaptationSet></Period></MPD>';
const fakeFetch = (u) => {
  if (u.indexOf('/ben-10-1-sezon-1-bolum-izle/') !== -1) return Promise.resolve(respond(u, page));
  if (u.indexOf('SYNTH_DZEN') !== -1) return Promise.resolve(respond('https://dzen.ru/embed/SYNTH', '"https://vd1.okcdn.ru/?dzen_dash=dash\\u0026x=1"'));
  if (u.indexOf('SYNTH_VIDMOLY') !== -1) return Promise.resolve(respond('https://vidmoly.to/embed-SYNTH.html', 'jwplayer().setup({sources:[{file:"https://cdn.example.invalid/hls/master.m3u8?t=1"}]})'));
  if (u.indexOf('SYNTH_OTHER') !== -1) return Promise.resolve(respond('https://unknown.example.invalid/embed/1', '<html></html>'));
  if (u.indexOf('okcdn.ru') !== -1) return Promise.resolve(respond(u, MPD));
  return Promise.reject(new Error('unexpected fetch ' + u.split('?')[0]));
};
new Function('module', 'fetch', 'console', 'globalThis', code)(mod, fakeFetch, { log: (m) => logs.push(m) }, {});
(async () => {
  // reach fetchEpisodeStreams through a function exposed by evaluating the source
  const f = new Function('fetch', 'console', 'module', code + '\nreturn fetchEpisodeStreams;')(fakeFetch, { log: (m) => logs.push(m) }, { exports: {} });
  const res = await f('https://cizgimax.online/ben-10-1-sezon-1-bolum-izle/');
  const titles = res.map(r => r.title);
  assert.ok(titles.some(t => /Dzen/.test(t)), 'Dzen stream missing: ' + JSON.stringify(titles));
  const v = res.find(r => /Vidmoly/.test(r.title));
  assert.ok(v, 'Vidmoly stream missing (iframes were all treated as Dzen): ' + JSON.stringify(titles));
  assert.ok(/\.m3u8/.test(v.url) && v.headers.Referer.indexOf('vidmoly.to') !== -1, 'vidmoly url/referer');
  assert.ok(!('Origin' in v.headers) || v.headers.Origin.indexOf('dzen') === -1, 'Vidmoly must not carry Dzen Origin');
  const d = res.find(r => /Dzen/.test(r.title));
  assert.strictEqual(d.url, 'https://vd1.okcdn.ru/?dzen_dash=dash&x=1', 'must return the real MPD url, \\u0026 decoded: ' + d.url);
  assert.strictEqual(d.quality, '720p');
  assert.strictEqual(d.headers.Referer, 'https://dzen.ru/');
  assert.strictEqual(d.headers.Origin, 'https://dzen.ru');
  assert.strictEqual(res.length, 2, 'unknown host must be ignored, got ' + res.length);
  assert.ok(!logs.join('\n').includes('SYNTH_'), 'logs must not contain tokens');
  console.log('OK', titles.join(' | '));
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
