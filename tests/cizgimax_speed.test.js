// Hız regresyonu: tercih edilen Dzen başarılı olunca Vidmoly hiç istenmemeli (istek sayısı + süre).
// Yanıtlar SENTETİK; gecikmeler kontrollü (Dzen 80 ms, Vidmoly 600 ms). Eski kod: CIZGIMAX_CODE ortam değişkeni.
const assert = require('assert'), fs = require('fs'), path = require('path');
const file = process.env.CIZGIMAX_CODE || path.join(__dirname, '..', 'providers/wekmed/cizgimax.js');
const code = fs.readFileSync(file, 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DZEN_MS = 80, VID_MS = 600;
const b64 = (servers) => '<script>var servers = JSON.parse(atob("' + Buffer.from(JSON.stringify(servers)).toString('base64') + '"));</script>';
const rep = (id, h) => '<Representation bandwidth="' + h * 1000 + '" id="' + id + '" mimeType="video/mp4" codecs="avc1.42c028" width="' + Math.round(h * 16 / 9) + '" height="' + h + '"><BaseURL>v' + id + '.mp4</BaseURL></Representation>';
const MPD = '<?xml version="1.0"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011"><Period><AdaptationSet contentType="audio"><Representation id="a" mimeType="audio/mp4" codecs="mp4a.40.2" bandwidth="64000"><BaseURL>a.mp4</BaseURL></Representation></AdaptationSet><AdaptationSet contentType="video">' + rep(1, 1080) + rep(2, 720) + '</AdaptationSet></Period></MPD>';
const BASE = 'https://vd1.okcdn.ru/?dzen_dash=dash&sig=SYNTH';
async function run(servers, opts) {
  opts = opts || {};
  const calls = [];
  const respond = (url, body) => ({ ok: true, status: 200, url, text: () => Promise.resolve(body) });
  const f = async (u) => {
    calls.push(u);
    if (u.indexOf('/b-1-sezon-1-bolum-izle/') !== -1) { await sleep(20); return respond(u, b64(servers)); }
    if (u.indexOf('SYNTH_DZEN') !== -1) { await sleep(DZEN_MS); if (opts.dzenFail) throw new Error('dzen down'); return respond('https://dzen.ru/embed/S', '"' + BASE + '"'); }
    if (u.indexOf('okcdn.ru') !== -1) return respond(u, MPD);
    if (u.indexOf('SYNTH_VIDMOLY') !== -1) { await sleep(VID_MS); return respond('https://vidmoly.to/embed-S.html', 'x({file:"https://cdn.example.invalid/m.m3u8?t=1"})'); }
    throw new Error('unexpected ' + u);
  };
  const fn = new Function('fetch', 'console', 'module', code + '\nreturn fetchEpisodeStreams;')(f, { log() {} }, { exports: {} });
  const t0 = process.hrtime.bigint();
  const res = await fn('https://cizgimax.online/b-1-sezon-1-bolum-izle/');
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { res, ms, vid: calls.filter(c => c.indexOf('SYNTH_VIDMOLY') !== -1).length, n: calls.length };
}
const dz = { type: 'iframe', src: '/oynat/?t=SYNTH_DZEN', label: 'Dublaj - Dzen' };
const vm = { type: 'iframe', src: '/oynat/?t=SYNTH_VIDMOLY', label: 'Vidmoly' };
(async () => {
  // Vidmoly sitede ÖNCE listelense bile Dzen tercih edilir
  let r = await run([vm, dz]);
  console.log('PERF healthy: ms=' + r.ms.toFixed(0) + ' requests=' + r.n + ' vidmolyRequests=' + r.vid + ' qualities=' + r.res.map(x => x.quality).join(','));
  assert.deepStrictEqual(r.res.map(x => x.quality), ['Auto', '1080p', '720p'], 'tüm gerçek kaliteler');
  assert.ok(r.res.every(x => /Dzen/.test(x.title)));
  assert.strictEqual(r.vid, 0, 'Dzen başarılıyken Vidmoly istenmemeli');
  assert.ok(r.ms < 300, 'Vidmoly beklenmemeli: ' + r.ms);
  assert.strictEqual(new Set(r.res.map(x => x.url)).size, 3);
  // Dzen düşerse Vidmoly yedeği
  r = await run([dz, vm], { dzenFail: true });
  console.log('PERF dzenFail: ms=' + r.ms.toFixed(0) + ' requests=' + r.n + ' vidmolyRequests=' + r.vid);
  assert.strictEqual(r.vid, 1); assert.strictEqual(r.res.length, 1); assert.ok(/\.m3u8/.test(r.res[0].url));
  // ikisi de düşerse boş
  const bad = { type: 'iframe', src: '/oynat/?t=SYNTH_DZEN', label: 'Dzen' };
  r = await run([bad], { dzenFail: true }); assert.deepStrictEqual(r.res, []);
  // yalnız Vidmoly
  r = await run([vm]); assert.strictEqual(r.res.length, 1); assert.strictEqual(r.vid, 1);
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
