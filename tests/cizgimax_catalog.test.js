// Regresyon (2026-11-24, çizgi film kataloğu): yanıtlar SENTETİK; canlı sitenin 2026-11-24 biçimini taklit eder.
// Canlı ölçüm: TMDB'de bulunan 1482 çizgi filmin yalnızca ~622'sinde 1. bölüm bulunuyordu.
// 1) Hızlı öneri API'si yalnız Türkçe ad döndürür ("Aslan Koruyucular"); TMDB'nin Türkçe adı farklıysa eşleşme kaçıyordu.
//    Tam arama sayfasındaki alternatif ad ("The Lion Guard") ile eşleşmeli.
// 2) Bölüm adresleri tek kalıba uymuyor (-1-s1e5/, -sezon-1-bolum-5/, farklı slug); adres dizi sayfasındaki
//    sezon ızgarasından okunmalı, tahmin edilmemeli.
// 3) Site bütün bölümleri tek sezonda düz numarayla tutuyorsa TMDB S2E3 → TMDB sezon uzunluklarından mutlak bölüm.
// 4) Sitede olmayan bölüm için başka bölümün sayfası istenmemeli (yanlış bölüm oynatılmaz).
const assert = require('assert'), fs = require('fs'), path = require('path');
const file = process.env.CIZGIMAX_CODE || path.join(__dirname, '..', 'providers/wekmed/cizgimax.js');
const code = fs.readFileSync(file, 'utf8');
const card = (x) => '<div class="film-item" data-anime-id="1" data-anime-name="' + x.name + '"><div class="inner"><a href="' + x.url + '" class="poster">' +
  '<span class="corner-tag corner-cizgi-film">ÇİZGİ</span></a><a href="' + x.url + '" class="film-name" data-alt-title="' + x.alt + '">' + x.name + '</a></div>' +
  '<div class="poster-hover-card"><ul class="phc-meta"><li><span>Alternatif Ad:</span> ' + x.alt + '</li><li><span>Yayın Yılı:</span> ' + x.year + '</li></ul></div></div>';
const ep = (href, n) => '<a href="' + href + '" class="ep-num-btn" data-ep-id="' + n + '" title="T&#039;s"> <span class="ep-num-label">' + n + '</span> <span class="ep-num-flags"></span> </a>';
const pane = (s, eps) => '<div class="ep-grid-numbers" data-season-pane="' + s + '" data-range-pane="1-100">' + eps.join('') + '</div>';
const SITE = {
  '/ara/?q=The%20Lion%20Guard': card({ name: 'Aslan Koruyucular', alt: 'The Lion Guard', url: '/diziler/aslan-koruyucular-izle/', year: 2016 }),
  '/diziler/aslan-koruyucular-izle/': '<html>' + pane(1, [ep('/aslan-koruyucular-1-sezon-1-bolum-izle/', 1)]) + pane(2, [ep('/aslan-koruyucular-2-s2e5/', 5)]) + '</html>',
  '/ara/?q=Flat%20Show': card({ name: 'Düz Dizi', alt: 'Flat Show', url: '/diziler/flat-show-izle/', year: 2001 }),
  '/diziler/flat-show-izle/': '<html>' + pane(1, Array.from({ length: 20 }, (_, i) => ep('/flat-show-sezon-1-bolum-' + (i + 1) + '/', i + 1))) + '</html>',
  // 5) Site araması noktalamada boş döner: "&" → "ve", kesme işareti silinir, parantez atılır, son çare ilk kelime
  '/ara/?q=Austin%20ve%20Ally': card({ name: 'Austin Ve Ally', alt: 'Austin &amp; Ally', url: '/diziler/austin-ve-ally-izle/', year: 2011 }),
  '/diziler/austin-ve-ally-izle/': pane(1, [ep('/austin-ve-ally-1-sezon-1-bolum-izle/', 1)]),
  '/ara/?q=Dont%20Hug%20Me%20Im%20Scared': card({ name: 'Dont Hug Me Im Scared', alt: 'Don&#039;t Hug Me I&#039;m Scared', url: '/diziler/dont-hug-me-im-scared-izle/', year: 2011 }),
  '/diziler/dont-hug-me-im-scared-izle/': pane(1, [ep('/dont-hug-me-im-scared-1-sezon-1-bolum-izle/', 1)]),
  '/ara/?q=Rubble': card({ name: 'Rubble Ve Ekibi', alt: 'Rubble &amp; Crew', url: '/diziler/rubble-ve-ekibi-izle/', year: 2023 }) +
    card({ name: 'Rubble Ve Ekibi Kısalar', alt: 'Rubble &amp; Crew Shorts', url: '/diziler/rubble-kisalar-izle/', year: 2023 }),
  '/diziler/rubble-ve-ekibi-izle/': pane(1, [ep('/rubble-ve-ekibi-1-sezon-1-bolum-izle/', 1)]),
  // 6) Uygulama yanıtı 1 MB'ta keser: uzun dizide sayfa sonu (son bölümler) gelmez → adres tahmini
  '/ara/?q=Long%20Show': card({ name: 'Uzun Dizi', alt: 'Long Show', url: '/diziler/long-show-izle/', year: 1989 }),
  '/diziler/long-show-izle/': '<html>' + pane(1, [ep('/long-show-1-sezon-1-bolum-izle/', 1)]) + pane(30, [ep('/long-show-30-sezon-1-bolum-izle/', 1)]),
};
async function run(tmdb, s, e) {
  const calls = [];
  const resp = (url, body) => ({ ok: true, status: 200, url, text: () => Promise.resolve(body), json: () => Promise.resolve(body) });
  const f = async (u) => {
    calls.push(u);
    if (u.indexOf('api.themoviedb.org') !== -1) return resp(u, tmdb);
    const p = u.replace('https://cizgimax.online', '');
    if (p in SITE) return resp(u, SITE[p]);
    if (/^\/ara\//.test(p)) return resp(u, '<span class="listing-head-title">0 sonuç</span><div class="film-list"></div>');
    if (/\/api\/search\//.test(p)) return resp(u, { animes: [] });
    return resp(u, '<html>no servers</html>');
  };
  const mod = { exports: {} };
  new Function('fetch', 'console', 'module', code)(f, { log() {} }, mod);
  await mod.exports.getStreams('1', 'tv', s, e);
  return calls.map(c => c.replace('https://cizgimax.online', '').replace(/\?_=\d+$/, ''))
    .filter(c => !/^\/(ara|diziler|api)\//.test(c) && c.indexOf('themoviedb') === -1);
}
const lion = { name: 'Aslan Muhafızlar', original_name: 'The Lion Guard', first_air_date: '2016-01-15',
  seasons: [{ season_number: 1, episode_count: 28 }, { season_number: 2, episode_count: 30 }] };
const flat = { name: 'Düz Dizi', original_name: 'Flat Show', first_air_date: '2001-03-01',
  seasons: [{ season_number: 0, episode_count: 2 }, { season_number: 1, episode_count: 10 }, { season_number: 2, episode_count: 10 }] };
(async () => {
  assert.deepStrictEqual(await run(lion, 1, 1), ['/aslan-koruyucular-1-sezon-1-bolum-izle/'], 'alternatif adla eşleşme');
  assert.deepStrictEqual(await run(lion, 2, 5), ['/aslan-koruyucular-2-s2e5/'], 'ızgaradaki gerçek adres');
  assert.deepStrictEqual(await run(flat, 2, 3), ['/flat-show-sezon-1-bolum-13/'], 'tek sezonlu sitede mutlak bölüm (özel sezon 0 sayılmaz)');
  assert.deepStrictEqual(await run(flat, 1, 7), ['/flat-show-sezon-1-bolum-7/']);
  assert.deepStrictEqual(await run(lion, 2, 6), [], 'sitede olmayan bölüm: bölüm sayfası istenmez');
  assert.deepStrictEqual(await run(flat, 3, 1), [], 'TMDB sezon bilgisi yoksa tahmin yok');
  const long = { name: 'Uzun Dizi', original_name: 'Long Show', first_air_date: '1989-12-17' };
  assert.deepStrictEqual(await run(long, 30, 1), ['/long-show-30-sezon-1-bolum-izle/']);
  assert.deepStrictEqual(await run(long, 36, 4), ['/long-show-36-sezon-4-bolum-izle/'], 'kesik sayfa: tahmin edilen adres');
  const named = (n, y) => ({ name: n, original_name: n, first_air_date: y + '-01-01' });
  assert.deepStrictEqual(await run(named('Austin & Ally', 2011), 1, 1), ['/austin-ve-ally-1-sezon-1-bolum-izle/'], '& → ve');
  assert.deepStrictEqual(await run(named("Don't Hug Me I'm Scared", 2011), 1, 1), ['/dont-hug-me-im-scared-1-sezon-1-bolum-izle/'], 'kesme işareti');
  assert.deepStrictEqual(await run(named('Rubble & Crew', 2023), 1, 1), ['/rubble-ve-ekibi-1-sezon-1-bolum-izle/'], 'ilk kelime; "Shorts" girişi seçilmez');
  assert.deepStrictEqual(await run(named('Rubble & Crew', 2010), 1, 1), [], 'yıl tutmazsa ilk kelime araması eşleşme üretmez');
  console.log('OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
