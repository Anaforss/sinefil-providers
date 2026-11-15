# Sinefil Sources

Sinefil için sağlayıcı (kaynak) paketi, sürüm 1.0.2.

## İçe aktarma
Sinefil > Eklentiler > Sağlayıcı deposu ekle alanına şu adresi girin:

`https://raw.githubusercontent.com/Anaforss/sinefil-providers/main/manifest.json`

## Dürüst durum
- `manifest.json` 62 benzersiz kaynağı `enabled: true` ile listeler (aynı siteyi sunan tekrarlar tek girişe indirildi; eşleme ve gerekçe `CANONICAL.json`, kaldırılan alternatifler isteğe bağlı `manifest.alternates.json`). Bu, kullanıcı seçimine izin verir; çalışırlık garantisi değildir.
- Tam liste çalışıyor anlamına gelmez; yalnızca 6 aday doğrulama sürecinden geçmiştir, diğerlerinin durumu bilinmiyor/doğrulanmadı.
- `manifest.verified.json`: yalnızca 6 doğrulanmış. `manifest.quarantine.json`: 56 karantina (tekilleştirme sonrası).
- Bazı sağlayıcılar çalışma anında üçüncü taraf ham GitHub dosyalarını/yapılandırmasını çeker; paket tamamen bağımsız değildir.
- Gömülü kimlik bilgileri/istemci anahtarları kaldırıldı; gerekirse çağıran `globalThis.*` ile sağlar (ör. TMDB_API_KEY, YOUTUBE_API_KEY). Anahtarsız kalan sağlayıcılar tam çalışmayabilir.

## Kaynak ve izinler
Özgün depo/SHA ve vendor SHA-256 değerleri `SOURCES.json` içindedir; lisanslar `LICENSES/`, izin kaydı `PERMISSIONS.md`. Kod ilgili özgün sahiplerine aittir; bu depo genel bir lisans vermez.
