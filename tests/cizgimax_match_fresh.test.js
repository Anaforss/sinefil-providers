// Regresyon (2026-11-22, Ben 10): yanıtlar SENTETİK; canlı sitenin 2026-11-22 biçimini taklit eder.
// 1) Öneriler Türkçe ad + ayrı `year` + İngilizce slug taşır: TMDB "Ben 10" (2016) eski 2005 dizisine değil
//    /diziler/ben-10-2016-izle/ ("Ben 10 Reboot") girişine eşleşmeli; 2005 ise /diziler/ben-10-izle/.
// 2) Site araması "Ben 10: Alien Force" için boş döner; noktalamasız sorgu denenmeli.
// 3) Bölüm sayfası önbelleği atlayan benzersiz sorguyla istenmeli (eski sayfadaki /oynat/ jetonu süresi dolmuş olur).
const assert = require('assert'), fs = require('fs'), path = require('path');
const file = process.env.CIZGIMAX_CODE || path.join(__dirname, '..', 'providers/wekmed/cizgimax.js');
const code = fs.readFileSync(file, 'utf8');
const SUGGEST = {
  'Ben 10': [
    { name: 'Ben 10 Omniverse', year: 2012, kind: 'cizgi-film', url: '/diziler/ben-10-omniverse-izle/' },
    { name: 'Ben 10', year: 2005, kind: 'cizgi-film', url: '/diziler/ben-10-izle/' },
    { name: 'Ben 10 Alien Force', year: 2008, kind: 'cizgi-film', url: '/diziler/ben-10-alien-force-izle/' },
    { name: 'Ben 10 Reboot', year: 2016, kind: 'cizgi-film', url: '/diziler/ben-10-2016-izle/' }
  ],
  'Ben 10 Alien Force': [{ name: 'Ben 10 Alien Force', year: 2008, kind: 'cizgi-film', url: '/diziler/ben-10-alien-force-izle/' }],
  'Regular Show': [{ name: 'Sürekli Dizi', year: 2010, kind: 'cizgi-film', url: '/diziler/regular-show-izle/' }]
};
async function run(tmdb) {
  const calls = [];
  const resp = (url, body) => ({ ok: true, status: 200, url, text: () => Promise.resolve(body), json: () => Promise.resolve(body) });
  const f = async (u) => {
    calls.push(u);
    if (u.indexOf('api.themoviedb.org') !== -1) return resp(u, tmdb);
    const m = /\/api\/search\/suggest\/\?q=(.*)$/.exec(u);
    if (m) return resp(u, { animes: SUGGEST[decodeURIComponent(m[1])] || [] });
    if (/-bolum-izle\//.test(u)) return resp(u, '<html>no servers</html>');
    throw new Error('unexpected ' + u);
  };
  const mod = { exports: {} };
  new Function('fetch', 'console', 'module', code)(f, { log() {} }, mod);
  await mod.exports.getStreams('1', 'tv', 1, 1);
  return calls.filter(c => /-bolum-izle\//.test(c));
}
(async () => {
  let ep = await run({ name: 'Ben 10', original_name: 'Ben 10', first_air_date: '2016-04-10' });
  assert.strictEqual(ep.length, 1); assert.ok(/\/ben-10-2016-1-sezon-1-bolum-izle\/\?_=\d+$/.test(ep[0]), ep[0]);
  ep = await run({ name: 'Ben 10', original_name: 'Ben 10', first_air_date: '2005-12-27' });
  assert.ok(/\/ben-10-1-sezon-1-bolum-izle\/\?_=\d+$/.test(ep[0]), ep[0]);
  ep = await run({ name: 'Ben 10: Alien Force', original_name: 'Ben 10: Alien Force', first_air_date: '2008-04-18' });
  assert.ok(/\/ben-10-alien-force-1-sezon-1-bolum-izle\//.test(ep[0]), String(ep[0]));
  ep = await run({ name: 'Sürekli Dizi', original_name: 'Regular Show', first_air_date: '2010-09-06' });
  assert.ok(/\/regular-show-1-sezon-1-bolum-izle\//.test(ep[0]), String(ep[0]));
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
