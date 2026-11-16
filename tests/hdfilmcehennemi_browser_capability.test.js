// SENTETİK: sahte __sinefil_resolve_browser_page yeteneği; gerçek site yanıtı DEĞİL.
const assert = require('assert'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(process.env.HDFC_CODE || path.join(__dirname, '..', 'providers/anthology/hdfilmcehennemi.js'), 'utf8');
const resp = (s, b) => ({ ok: s >= 200 && s < 300, status: s, text: async () => b, json: async () => ({}) });
async function run(cap, id) {
  const calls = [], pages = [];
  const f = async (u) => { calls.push(u); return resp(u.includes('raw.githubusercontent') ? 404 : 403, ''); };
  const m = { exports: {} };
  const args = ['fetch', 'module', 'require', 'console'], vals = [f, m, undefined, { log() {} }];
  if (cap) { args.push('__sinefil_resolve_browser_page'); vals.push(async (u) => { pages.push(u); return cap(u); }); }
  new Function(...args, code)(...vals);
  const r = await m.exports.getStreams(id || '155', 'movie');
  return { r, calls: calls.filter(c => !c.includes('raw.githubusercontent')), pages };
}
(async () => {
  // eski istemci: işlev yok -> düz HTTP (403 -> [])
  let x = await run(null);
  assert.deepStrictEqual(x.r, []); assert.ok(x.calls.length >= 1);
  // disabled/unsupported -> HTTP geri dönüşü
  for (const st of ['disabled', 'unsupported']) {
    x = await run(async () => JSON.stringify({ status: st }));
    assert.strictEqual(x.pages.length, 1); assert.ok(x.calls.length >= 1, st + ' HTTP geri dönüşü yok');
  }
  // candidate -> akış, HTTP'ye HİÇ gitmez, bilinen slug sayfası verilir
  x = await run(async () => JSON.stringify({ status: 'candidate', url: 'https://hdfilmcehennemi.mobi/v/m.m3u8' }));
  assert.strictEqual(x.calls.length, 0, 'korumalı sayfa HTTP ile çekilmemeli');
  assert.strictEqual(x.pages[0], 'https://www.hdfilmcehennemi.nl/batman-kara-sovalye-hd-film-izle-hdf-hdf-7/');
  assert.strictEqual(x.r.length, 1); assert.ok(x.r[0].url.startsWith('https://hdfilmcehennemi.mobi/v/m.m3u8'));
  assert.ok(x.r[0].headers && x.r[0].headers.Referer);
  // challenge/timeout/blocked/nomedia -> [] ve HTTP'ye gidilmez
  for (const st of ['challenge', 'timeout', 'blocked', 'nomedia']) {
    x = await run(async () => JSON.stringify({ status: st }));
    assert.deepStrictEqual(x.r, []); assert.strictEqual(x.calls.length, 0, st);
  }
  // bozuk JSON / atılan hata -> HTTP geri dönüşü, çökme yok
  x = await run(async () => { throw new Error('x'); });
  assert.deepStrictEqual(x.r, []);
  // bilinmeyen film (TMDB yok) -> sayfa yok, yetenek çağrılmaz
  x = await run(async () => JSON.stringify({ status: 'nomedia' }), '999999999');
  assert.strictEqual(x.pages.length, 0);
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
