// ============================================================
//  CizgiMax — Nuvio Provider
//  HTML analizine göre tam akış:
//
//  1. /api/search/suggest/?q= → dizi bul
//  2. /slug-S-sezon-E-bolum-izle/ → bölüm sayfası fetch
//  3. servers base64 JSON'u decode et:
//     - type:"sibnet"  → streamUrl direkt MP4
//     - type:"iframe"  → /oynat/?t= → 302 → Dzen embed → DASH MPD
//  4. Sibnet öncelikli — Dzen fallback
// ============================================================

var MAIN_URL     = 'https://cizgimax.online';
var TMDB_API_KEY = (typeof globalThis !== "undefined" && globalThis.TMDB_API_KEY ? String(globalThis.TMDB_API_KEY) : "");

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         MAIN_URL + '/'
};

// ── Base64 decode (Hermes uyumlu — atob yok) ──────────────────
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64Decode(str) {
  try {
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    var out = '', bits = 0, buf = 0;
    for (var i = 0; i < str.length; i++) {
      buf = (buf << 6) | B64.indexOf(str[i]);
      bits += 6;
      if (bits >= 8) { bits -= 8; out += String.fromCharCode((buf >> bits) & 0xFF); }
    }
    return out;
  } catch(e) { return null; }
}

// ── Yardımcı ─────────────────────────────────────────────────
function regexFirst(html, pattern, flags) {
  var m = new RegExp(pattern, flags || 's').exec(html);
  return m ? m[1] : null;
}

function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s')
    .replace(/[ı]/g,'i').replace(/[İ]/g,'i').replace(/[ö]/g,'o').replace(/[ç]/g,'c')
    .replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
}

// ── TMDB ─────────────────────────────────────────────────────
function fetchTmdbInfo(tmdbId, mediaType) {
  var ep = (mediaType === 'movie') ? 'movie' : 'tv';
  return fetch('https://api.themoviedb.org/3/' + ep + '/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.title || d.name || '',
        titleEn: d.original_title || d.original_name || '',
        year: parseInt(String(d.first_air_date || d.release_date || '').slice(0, 4), 10) || 0
      };
    });
}

// ── Arama ─────────────────────────────────────────────────────
// /api/search/suggest/?q= → {animes:[{name, url, kind}]}
function searchSite(query) {
  return fetch(MAIN_URL + '/api/search/suggest/?q=' + encodeURIComponent(query), {
    headers: Object.assign({}, HEADERS, { 'Accept': 'application/json' })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) { return d.animes || []; })
  .catch(function() { return []; });
}

// Başlık kimliği: TMDB'de 2005 ve 2016 "Ben 10" aynı adı taşır; yıl tek ayırt edicidir.
// Adayın adı "Ad (YYYY)" biçiminde yıl taşıyorsa TMDB yılıyla +-1 uyumlu olmalı.
function splitYear(name) {
  var m = /\((\d{4})\)\s*$/.exec(name || '');
  return { base: (name || '').replace(/\(\d{4}\)\s*$/, ''), year: m ? parseInt(m[1], 10) : 0 };
}

// Sitenin önerileri artık çoğunlukla Türkçe ad taşır ("Sürekli Dizi"), ayrıca ayrı bir `year`
// alanı ve İngilizce slug verir (/diziler/ben-10-2016-izle/ → "Ben 10 Reboot", 2016).
// Ad ya da slug (sondaki yıl atılarak) TMDB adıyla eşleşmeli; bilinen yıl TMDB yılıyla +-1 uyumlu olmalı.
function slugTitle(url) {
  var m = /\/diziler\/(.+?)-izle\/?/.exec(url || '') || /\/dizi\/([^\/?#]+)/.exec(url || '');
  if (!m) return { base: '', year: 0 };
  var y = /-((?:19|20)\d{2})$/.exec(m[1]);
  return { base: m[1].replace(/-((?:19|20)\d{2})$/, '').replace(/-/g, ' '), year: y ? parseInt(y[1], 10) : 0 };
}

function nameScore(name, en, tr) {
  var ni = normalizeStr(name);
  if (!ni) return 0;
  if (ni === normalizeStr(en) || ni === normalizeStr(tr)) return 100;
  // "Ninjago" ~ "Ninjago: Masters of Spinjitzu": yalnızca ':' öncesi tam eşleşme
  var pre = [en, tr].map(function(s) { return normalizeStr((s || '').split(':')[0]); });
  return (pre[0] === ni || pre[1] === ni) ? 60 : 0;
}

function scoreCandidate(r, en, tr, year) {
  var sp = splitYear(r.name), slug = slugTitle(r.url);
  var sc = Math.max(nameScore(sp.base, en, tr), nameScore(slug.base, en, tr));
  if (!sc) return 0;
  var siteYear = sp.year || slug.year || (parseInt(r.year, 10) || 0);
  if (siteYear && year) {
    if (Math.abs(siteYear - year) > 1) return 0;
    sc += 10;
  }
  return sc;
}

function findBestMatch(results, en, tr, year) {
  var best = null, bestScore = 0;
  [false, true].forEach(function(allowFilm) {
    if (best) return;
    results.forEach(function(r) {
      if ((r.kind === 'film') !== allowFilm) return;
      var sc = scoreCandidate(r, en, tr, year);
      if (sc > bestScore) { bestScore = sc; best = r; }
    });
  });
  return bestScore >= 60 ? best : null;
}

// ── Bölüm URL oluştur ─────────────────────────────────────────
// /diziler/regular-show-izle/ → /regular-show-S-sezon-E-bolum-izle/
function buildEpisodeUrl(diziUrl, season, episode) {
  // slug çıkar: /diziler/regular-show-izle/ → regular-show
  var m = diziUrl.match(/\/dizi\/([^\/?#]+)\/?(?:[?#].*)?$/) || diziUrl.match(/\/diziler\/(.+?)-izle\//);
  if (!m) return null;
  var slug = m[1];
  return MAIN_URL + '/' + slug + '-' + season + '-sezon-' + episode + '-bolum-izle/';
}

// ── servers JSON parse ────────────────────────────────────────
// HTML'de: var servers = JSON.parse(atob("BASE64"))
// Decode → [{type:"sibnet",streamUrl:"/api/stream/sibnet/?t=...",...}]
function parseServers(html) {
  var b64 = regexFirst(html, 'var servers\\s*=\\s*JSON\\.parse\\(atob\\("([^"]+)"\\)\\)');
  if (!b64) return [];
  var decoded = b64Decode(b64);
  if (!decoded) return [];
  try {
    var servers = JSON.parse(decoded);
    return Array.isArray(servers) ? servers : [];
  } catch(e) { return []; }
}

// ── Dzen embed → DASH MPD → en iyi kalite URL ────────────────
// /oynat/?t=TOKEN → 302 → https://dzen.ru/embed/ID
// Dzen embed HTML → MPD URL → doğrulama → manifest URL'si (ses+video korunur)
// Yönlendirme sonrası gerçek sunucu adından (etiketten değil) oynatıcı türü
function hostKind(u) {
  var m = /^https?:\/\/([^\/:?#]+)/i.exec(u || '');
  var h = m ? m[1].toLowerCase() : '';
  if (/(^|\.)dzen\.ru$/.test(h)) return 'dzen';
  if (/(^|\.)vidmoly\.[a-z]+$/.test(h)) return 'vidmoly';
  return h ? 'unknown:' + h : 'unknown';
}

function extractVidmoly(embedUrl, html) {
  var m = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) || /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i.exec(html);
  if (!m) { console.log('[CizgiMax] Vidmoly m3u8 bulunamadi'); return null; }
  var origin = /^(https?:\/\/[^\/]+)/i.exec(embedUrl)[1];
  return { url: m[1], quality: 'Auto', headers: { 'Referer': origin + '/', 'User-Agent': HEADERS['User-Agent'] } };
}

function extractDzen(oynatUrl, epUrl) {
  var fullUrl = oynatUrl.startsWith('http') ? oynatUrl : MAIN_URL + oynatUrl;

  return fetch(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': epUrl })
  })
  .then(function(r) {
    // 302 redirect → dzen.ru/embed/ID
    var dzenUrl = r.url || '';
    var kind = hostKind(dzenUrl);
    if (kind === 'vidmoly') {
      return r.text().then(function(html) { return { vidmoly: extractVidmoly(dzenUrl, html) }; });
    }
    if (kind !== 'dzen') {
      console.log('[CizgiMax] Desteklenmeyen oynatici: ' + kind);
      return null;
    }
    return r.text().then(function(html) {
      return { dzenUrl: dzenUrl, html: html };
    });
  })
  .then(function(d) {
    if (!d) return null;
    if (d.hasOwnProperty('vidmoly')) return d.vidmoly;

    // MPD URL'ini bul: dzen embed HTML'inde
    var mpdUrl = regexFirst(d.html, '"(https?://vd[^"]+\\.okcdn\\.ru[^"]+dzen_dash=dash[^"]*)"')
              || regexFirst(d.html, '"contentUrl"\\s*:\\s*"([^"]+\\.mpd[^"]*)"')
              || regexFirst(d.html, '(https?://vd\\d+\\.okcdn\\.ru/[^"\'\\s]+)');

    if (!mpdUrl) {
      console.log('[CizgiMax] Dzen MPD URL bulunamadi');
      return null;
    }

    console.log('[CizgiMax] Dzen MPD: ' + mpdUrl.slice(0, 80));

    // HTML/JSON içinde kaçışlı olabilir (\u0026, \/, &amp;) — tırnaklı JSON literali olarak çöz
    mpdUrl = decodeEmbedUrl(mpdUrl);
    console.log('[CizgiMax] Dzen MPD bulundu');
    var headers = { 'Referer': 'https://dzen.ru/', 'Origin': 'https://dzen.ru', 'User-Agent': HEADERS['User-Agent'] };

    // MPD fetch → doğrula → MANİFESTİN KENDİSİNİ döndür (ses+video korunur, oynatıcı DASH'i çözer)
    return fetch(mpdUrl, { headers: headers })
    .then(function(r2) { return r2.text(); })
    .then(function(xml) {
      var info = inspectMpd(xml);
      if (!info) {
        console.log('[CizgiMax] Dzen MPD gecerli degil / video Representation yok');
        return null;
      }
      console.log('[CizgiMax] Dzen DASH: ' + info.quality + (info.hasAudio ? ' +ses' : ' sessiz'));
      return { url: mpdUrl, quality: info.quality, heights: info.heights, headers: headers };
    });
  })
  .catch(function(e) {
    console.log('[CizgiMax] Dzen hata: ' + (e.message || String(e)));
    return null;
  });
}

function decodeEmbedUrl(u) {
  var v = u;
  try { v = JSON.parse('"' + String(u).replace(/"/g, '\\"') + '"'); } catch (e) { v = u; }
  return v.replace(/&amp;/g, '&');
}

// Standart DASH MPD doğrulaması: <MPD> kökü + en az bir video Representation.
// Öznitelik sırası/kalite özniteliği varsayılmaz. Her GERÇEK video yüksekliği ayrı listelenir
// (aynı yükseklikte AVC öncelikli); ses AdaptationSet'leri MPD'de olduğu gibi kalır.
function inspectMpd(xml) {
  if (!xml || !/<MPD[\s>]/.test(xml)) return null;
  var byHeight = {}, noHeightBest = null, hasAudio = false;
  var setRe = /<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/g, sm;
  function attr(t, n) { var m = new RegExp('\\b' + n + '="([^"]*)"').exec(t); return m ? m[1] : ''; }
  while ((sm = setRe.exec(xml)) !== null) {
    var setType = attr(sm[1], 'mimeType') + ' ' + attr(sm[1], 'contentType');
    var repRe = /<Representation\b([^>]*)>/g, rm;
    while ((rm = repRe.exec(sm[2])) !== null) {
      var codecs = attr(rm[1], 'codecs');
      var t = setType + ' ' + attr(rm[1], 'mimeType') + ' ' + codecs;
      var bw = parseInt(attr(rm[1], 'bandwidth'), 10) || 0;
      var h = parseInt(attr(rm[1], 'height'), 10) || 0;
      if (/audio|mp4a|opus/i.test(t) && !h) { hasAudio = true; continue; }
      if (/video|avc|hev|vp0?9|av01/i.test(t) || h) {
        var rep = { bw: bw, h: h, avc: /avc1/i.test(codecs) };
        if (!h) { if (!noHeightBest || bw > noHeightBest.bw) noHeightBest = rep; continue; }
        var cur = byHeight[h];
        if (!cur || (rep.avc && !cur.avc) || (rep.avc === cur.avc && bw > cur.bw)) byHeight[h] = rep;
      }
    }
  }
  var heights = Object.keys(byHeight).map(Number).sort(function(x, y) { return y - x; });
  if (!heights.length && !noHeightBest) return null;
  return { heights: heights, quality: heights.length ? heights[0] + 'p' : 'Auto', hasAudio: hasAudio };
}

// Seçim isteği: URL parçası (fragment) — sunucuya gönderilmez. Oynatıcı bunu görünce
// yalnızca o yükseklikteki video track'ini seçer (ses track'i korunur).
var QUALITY_FRAGMENT = '#sinefil-video-height=';

// Tek sunucuyu çöz → sonuç girişleri dizisi (başarısızsa [])
function resolveServer(server, epUrl) {
  var label;
  // Sibnet — direkt streamUrl MP4
  if (server.type === 'sibnet' && server.streamUrl) {
    var streamUrl = server.streamUrl.startsWith('http') ? server.streamUrl : MAIN_URL + server.streamUrl;
    label = server.label || 'Sibnet';
    return Promise.resolve([{
      name: 'CizgiMax', title: '⌜ CİZGİMAX ⌟ | ' + label, url: streamUrl, quality: 'Auto',
      headers: { 'Referer': epUrl, 'User-Agent': HEADERS['User-Agent'] }
    }]);
  }
  // iframe (Dzen/Vidmoly) — /oynat/?t= → 302 → MPD/m3u8
  if (server.type === 'iframe' && server.src) {
    label = server.label || 'Dzen';
    return extractDzen(server.src, epUrl).then(function(dzen) {
      if (!dzen || !dzen.url) return [];
      var out = [];
      var base = { name: 'CizgiMax', headers: dzen.headers || { 'Referer': dzen.referer, 'Origin': 'https://dzen.ru' } };
      var hs = dzen.heights || [];
      if (hs.length < 2) {
        out.push(Object.assign({ title: '⌜ CİZGİMAX ⌟ | ' + label, url: dzen.url, quality: dzen.quality || 'Auto' }, base));
        return out;
      }
      out.push(Object.assign({ title: '⌜ CİZGİMAX ⌟ | ' + label + ' | Auto', url: dzen.url, quality: 'Auto' }, base));
      hs.forEach(function(h) {
        out.push(Object.assign({ title: '⌜ CİZGİMAX ⌟ | ' + label + ' | ' + h + 'p', url: dzen.url + QUALITY_FRAGMENT + h, quality: h + 'p' }, base));
      });
      return out;
    });
  }
  return Promise.resolve([]);
}

// ── Bölüm stream'lerini çıkar ────────────────────────────────
function fetchEpisodeStreams(epUrl) {
  // Sitenin Varnish önbelleği bölüm sayfasını saatlerce eski tutabiliyor; içindeki /oynat/ jetonlarının
  // süresi o zaman dolmuş olur (403 "Oynatma suresi doldu"). Benzersiz sorgu önbelleği atlar.
  var freshUrl = epUrl + (epUrl.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();
  return fetch(freshUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var servers = parseServers(html);
      console.log('[CizgiMax] ' + servers.length + ' server: ' + epUrl);

      if (!servers.length) {
        console.log('[CizgiMax] servers bulunamadi');
        return [];
      }

      // Hız: tercih edilen sunucu (Dzen etiketi öncelikli; asıl tür yönlendirme sonrası ana makineden doğrulanır)
      // geçerli sonuç verir vermez DÖNER; Vidmoly vb. yalnızca öncekiler başarısızsa istenir.
      var ordered = servers.filter(function(sv) { return /dzen/i.test(sv.label || ''); })
        .concat(servers.filter(function(sv) { return !/dzen/i.test(sv.label || ''); }));
      var chain = Promise.resolve([]);
      ordered.forEach(function(server) {
        chain = chain.then(function(found) {
          if (found.length) return found;
          return resolveServer(server, epUrl);
        });
      });
      return chain;
    })
    .catch(function(e) {
      console.log('[CizgiMax] Sayfa hata: ' + (e.message || String(e)));
      return [];
    });
}

// ── Ana fonksiyon ─────────────────────────────────────────────
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.log('[CizgiMax] Baslatiliyor: ' + tmdbId + ' ' + mediaType);

  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      console.log('[CizgiMax] TMDB: ' + info.titleEn + ' / ' + info.titleTr);
      if (!info.titleEn && !info.titleTr) return [];

      // Sırayla: İngilizce ad, Türkçe ad, sonra noktalamasız hâlleri (site araması
      // "Ben 10: Alien Force" için boş döner, "Ben 10 Alien Force" için bulur). İlk eşleşmede durur.
      var queries = [];
      [info.titleEn, info.titleTr].forEach(function(t) { if (t) queries.push(t); });
      [info.titleEn, info.titleTr].forEach(function(t) {
        var plain = (t || '').replace(/[:!?.,;'’"()&]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (plain) queries.push(plain);
      });
      queries = queries.filter(function(q, i) { return queries.indexOf(q) === i; });
      var search = Promise.resolve(null);
      queries.forEach(function(q) {
        search = search.then(function(found) {
          if (found) return found;
          return searchSite(q).then(function(results) {
            console.log('[CizgiMax] Arama (' + q + '): ' + results.length + ' sonuc');
            return findBestMatch(results, info.titleEn, info.titleTr, info.year);
          });
        });
      });
      return search
        .then(function(best) {
          if (!best) {
            console.log('[CizgiMax] Bulunamadi: ' + (info.titleEn || info.titleTr));
            return [];
          }
          console.log('[CizgiMax] Eslesti: ' + best.name + ' -> ' + best.url);

          var sNum = parseInt(seasonNum)  || 1;
          var eNum = parseInt(episodeNum) || 1;

          var diziUrl = best.url.startsWith('http') ? best.url : MAIN_URL + best.url;
          var epUrl   = buildEpisodeUrl(diziUrl, sNum, eNum);

          if (!epUrl) {
            console.log('[CizgiMax] Bolum URL olusturulamadi: ' + diziUrl);
            return [];
          }

          console.log('[CizgiMax] Bolum URL: ' + epUrl);
          return fetchEpisodeStreams(epUrl);
        });
    })
    .catch(function(err) {
      console.log('[CizgiMax] Hata: ' + (err.message || String(err)));
      return [];
    });
}

// ── Export ────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
