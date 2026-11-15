/** * Sinewix Provider for Nuvio TV * sinewix.onrender.com Stremio API'sini kullanır */
var base_url = "https://ydfvfdizipanel.ru";
var token = (typeof globalThis !== "undefined" && globalThis.SINEWIX_API_KEY ? String(globalThis.SINEWIX_API_KEY) : "");

var headers = {
    'hash256': (typeof globalThis !== "undefined" && globalThis.SINEWIX_HASH256 ? String(globalThis.SINEWIX_HASH256) : ""),
    'signature': (typeof globalThis !== "undefined" && globalThis.SINEWIX_SIGNATURE ? String(globalThis.SINEWIX_SIGNATURE) : ""),
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'};

// 3. Madde Düzeltmesi: Video oynatıcının (ExoPlayer vb.) 431/400 hatası almaması için temiz stream header'ları
var stream_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://ydfvfdizipanel.ru/',
    'Origin': 'https://ydfvfdizipanel.ru'
};

function apicall(path) {
  return fetch(base_url + "/public/api" + path + "/" + token, { headers }).then(function(res) {
    return res.json();
  });
}

function getStreams(tmdbid, mediatype, season, episode) {
  // Eğer gelen ID Stremio formatındaysa (tt1234567:1:1) temizleme koruması ekliyoruz
  var pureId = (typeof tmdbid === 'string') ? tmdbid.split(/[:\.]/)[0] : tmdbid;
  
  var tmdbtype = mediatype === "movie" ? "movie" : "tv";
  var tmdburl = "https://api.themoviedb.org/3/" + tmdbtype + "/" + pureId + "?language=tr-TR&api_key=" + encodeURIComponent((typeof globalThis !== "undefined" && globalThis.TMDB_API_KEY ? String(globalThis.TMDB_API_KEY) : "")) + "";
  
  return fetch(tmdburl).then(function(res) {
    return res.json();
  }).then(function(data) {
    var title = data.title || data.name || "";
    if (!title)
      return [];
    return searchAndStream(title, mediatype, season, episode);
  }).catch(function() {
    return []; // Olası network çökmelerine karşı güvenlik katmanı
  });
}

function searchAndStream(title, mediatype, season, episode) {
  return apicall("/search/" + encodeURIComponent(title)).then(function(data) {
    if (!data || !data.search || data.search.length === 0)
      return [];
    
    // 4. Madde Düzeltmesi: İlk sonucu almak yerine gelen listede isme ve türe göre en yakın eşleşmeyi süzüyoruz
    var results = data.search;
    var targetType = mediatype === "movie" ? "movie" : "serie";
    
    var bestMatch = results.find(function(item) {
      var itemName = (item.name || "").toLowerCase();
      var itemType = (item.type || "").toLowerCase();
      return itemName === title.toLowerCase() && itemType.includes(targetType);
    });
    
    // Eğer tam tip eşleşmesi yoksa sadece isim eşleşmesine bak
    if (!bestMatch) {
      bestMatch = results.find(function(item) {
        return (item.name || "").toLowerCase() === title.toLowerCase();
      });
    }
    
    // O da yoksa sadece türe göre süz
    if (!bestMatch) {
      bestMatch = results.find(function(item) {
        return (item.type || "").toLowerCase().includes(targetType);
      });
    }
    
    // Hiçbiri kurtarmıyorsa ilk indeksteki veriyi kurtarıcı (fallback) olarak al
    if (!bestMatch) bestMatch = results[0];
    
    var contentid = bestMatch.id;
    var type = bestMatch.type || "";
    return fetchStreams(contentid, type, mediatype, season, episode);
  });
}

function fetchStreams(contentid, type, mediatype, season, episode) {
  var genre = type.includes("movie") ? "media" : type.includes("serie") ? "series" : "animes";
  var filmDizi = type.includes("movie") ? "detail" : "show";
  return apicall("/" + genre + "/" + filmDizi + "/" + contentid).then(function(data) {
    var videos = [];
    if (mediatype === "movie") {
      videos = data.videos || [];
    } else {
      var seasons = data.seasons || [];
      for (var s = 0; s < seasons.length; s++) {
        if (seasons[s].season_number == season) {
          var episodes = seasons[s].episodes || [];
          for (var e = 0; e < episodes.length; e++) {
            if (episodes[e].episode_number == episode) {
              videos = episodes[e].videos || [];
              break;
            }
          }
          break;
        }
      }
    }
    return videos.map(function(v) {
      return {
        name: "Sinewix",
        title: "⌜ SİNEWİX ⌟ | " + (v.video_name || "SERVER").toUpperCase(),
        url: v.link,
        quality: v.video_name || "HD",
        headers: stream_headers // 3. Madde Düzeltmesi: Dev signature barındıran nesne yerine hafifletilmiş header basıldı
      };
    }).filter(function(s2) {
      return s2.url;
    });
  });
}

module.exports = { getStreams };
