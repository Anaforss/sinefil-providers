// Gerçek Windows tanılama izi (v1.1.30, film 155): SITE 200, SITE 404, SITE 404, SITE 404, EMPTY.
// GÖZLENEN: yalnızca durum sırası. GÖZLENMEYEN: sayfa/embed gövdesi, URL'ler.
// Aşağıdaki HTML SENTETİKTİR (gerçek site yanıtı değil); yalnızca kod sözleşmesini sınar.
const assert = require('assert'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(process.env.HDFC_CODE || path.join(__dirname, '..', 'providers/anthology/hdfilmcehennemi.js'), 'utf8');
const resp = (s, b, j) => ({ ok: s >= 200 && s < 300, status: s, text: async () => b, json: async () => j });
async function run(iframeAttr) {
  const calls = [];
  const f = async (u) => {
    calls.push(u);
    if (u.includes('raw.githubusercontent.com')) return resp(404, '', {});
    if (/\/batman-kara-sovalye-hd-film-izle-hdf-hdf-7\/$/.test(u)) return resp(200, '<html><iframe class="close" ' + iframeAttr + '></iframe></html>');
    return resp(404, 'nf');
  };
  const m = { exports: {} };
  new Function('fetch', 'module', 'require', 'console', code)(f, m, undefined, { log() {} });
  const r = await m.exports.getStreams('155', 'movie');
  return { r, calls: calls.filter(c => !c.includes('raw.githubusercontent')) };
}
(async () => {
  // 1) İz dizisi: bilinen slug -> metadata yok; sayfa 200, sonra 3 embed isteği 404, sonuç boş.
  let x = await run('data-src="https://hdfilmcehennemi.mobi/video/embed/abc/"');
  assert.deepStrictEqual(x.r, []);
  assert.strictEqual(x.calls.length, 4, 'beklenen 1 sayfa + 3 embed: ' + x.calls.length);
  assert.ok(x.calls.slice(1).every(u => u.startsWith('https://hdfilmcehennemi.mobi/video/embed/')));
  console.log('iz sırası yeniden üretildi: 200,404,404,404 -> []');
  // 2) HTML öznitelik varlıkları çözülmeli (&amp; -> &) ; ham '&amp;' siteye gönderilmemeli.
  x = await run('data-src="https://hdfilmcehennemi.mobi/video/embed/abc/?rapidrame_id=XYZ&amp;k=1"');
  assert.ok(x.calls.slice(1).every(u => !u.includes('&amp;')), 'embed URL ham &amp; içeriyor: ' + x.calls[1]);
  assert.ok(x.calls[1].includes('rapidrame_id=XYZ&k=1'));
  // 3) Göreli embed yolu mutlak yapılmalı.
  x = await run('data-src="/video/embed/abc/"');
  assert.ok(x.calls.length > 1 && /^https:\/\/www\.hdfilmcehennemi\.nl\/video\/embed\/abc\/$/.test(x.calls[1]), 'göreli embed çözülmedi: ' + x.calls[1]);
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
