var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = (typeof globalThis !== "undefined" && globalThis.SINEWIX_API_KEY ? String(globalThis.SINEWIX_API_KEY) : "");

var API_HEADERS = {
    'hash256': (typeof globalThis !== "undefined" && globalThis.SINEWIX_HASH256 ? String(globalThis.SINEWIX_HASH256) : ""),
    'signature': (typeof globalThis !== "undefined" && globalThis.SINEWIX_SIGNATURE ? String(globalThis.SINEWIX_SIGNATURE) : ""),
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://ydfvfdizipanel.ru/',
    'Origin': 'https://ydfvfdizipanel.ru'
};

function resolveMediaFireLink(link) {
    return fetch(link)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
            return match ? match[1] : link;
        })
        .catch(function() { return link; });
}

function buildStreams(videos, sinewixName) {
    return Promise.all(
        videos.map(function(v) {
            var link = v.link;
            var serverName = v.server || 'Sunucu';
            var isMF = link.includes('mediafire.com');
            
            // Başlık formatı: ⌜ SİNEWİX ⌟ | MEDİAFİRE veya SUNUCU ADI
            var displayTitle = '⌜ SİNEWİX ⌟ | ' + (isMF ? 'MEDİAFİRE' : serverName.toUpperCase());

            if (isMF) {
                return resolveMediaFireLink(link).then(function(finalUrl) {
                    return {
                        name: sinewixName, // SineWix'ten gelen isim
                        title: displayTitle,
                        url: finalUrl,
                        quality: "Auto",
                        headers: STREAM_HEADERS,
                        provider: 'sinewix'
                    };
                });
            }
            return Promise.resolve({
                name: sinewixName, // SineWix'ten gelen isim
                title: displayTitle,
                url: link,
                headers: STREAM_HEADERS,
                provider: 'sinewix'
            });
        })
    );
}

function searchAndFetch(title, originalTitle, targetImdb, mediaType, seasonNum, episodeNum, targetYear) {
    var searchUrl = API_BASE + '/search/' + encodeURIComponent(originalTitle) + '/' + API_KEY;
    
    return fetch(searchUrl, { headers: API_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var results = data.search || [];
            var path = (mediaType === 'movie') ? 'media/detail' : 'series/show';

            return Promise.all(results.map(function(item) {
                return fetch(API_BASE + '/' + path + '/' + item.id + '/' + API_KEY, { headers: API_HEADERS })
                    .then(function(r) { return r.json(); })
                    .catch(function() { return null; });
            }));
        })
        .then(function(detailedItems) {
            var bestMatch = detailedItems.find(function(item) {
                if (!item) return false;
                if (item.imdb_external_id && targetImdb && item.imdb_external_id === targetImdb) return true;
                var itemYear = (item.release_date || item.first_air_date || '').split('-')[0];
                var nameMatch = (item.name || '').toLowerCase() === originalTitle.toLowerCase();
                return nameMatch && (itemYear === targetYear);
            });

            if (!bestMatch) return [];

            var vList = [];
            if (mediaType === 'movie') {
                vList = bestMatch.videos || [];
            } else {
                var s = (bestMatch.seasons || []).find(function(s) { 
                    return parseInt(s.season_number) === parseInt(seasonNum); 
                });
                if (s && s.episodes) {
                    var e = s.episodes.find(function(e) { 
                        return parseInt(e.episode_number) === parseInt(episodeNum); 
                    });
                    if (e) vList = e.videos || [];
                }
            }

            // bestMatch.name ile SineWix'teki orijinal ismi gönderiyoruz
            return buildStreams(vList, bestMatch.name || title);
        })
        .catch(function() { return []; });
}

function getStreams(id, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var imdbId = (typeof id === 'string') ? id.split(/[:\.]/)[0] : id;
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + imdbId + '?api_key=" + encodeURIComponent((typeof globalThis !== "undefined" && globalThis.TMDB_API_KEY ? String(globalThis.TMDB_API_KEY) : "")) + "&language=tr-TR&append_to_response=external_ids';

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var ot = data.original_title || data.original_name;
            var releaseDate = data.release_date || data.first_air_date;
            var year = releaseDate ? releaseDate.split('-')[0] : '';
            var targetImdb = data.imdb_id || (data.external_ids && data.external_ids.imdb_id);
            
            return searchAndFetch(data.title || data.name, ot, targetImdb, mediaType, seasonNum || 1, episodeNum || 1, year);
        }).then(function(streams) {
            resolve(streams || []);
        }).catch(function() {
            resolve([]);
        });
    });
}

module.exports = { getStreams };
