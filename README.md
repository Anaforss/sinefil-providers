# Sinefil Sources

Sinefil için sağlayıcı (kaynak) paketi, sürüm 1.0.11.

## İçe aktarma
Sinefil > Eklentiler > Sağlayıcı deposu ekle alanına şu adresi girin:

`https://raw.githubusercontent.com/Anaforss/sinefil-providers/main/manifest.json`

## Dürüst durum
- **Geçici:** varsayılan `manifest.json` yalnızca **ÇizgiMax** içerir (1 kaynak, `enabled: true`). Diğer kaynaklar silinmedi: `manifest.all-sources.json` ve sağlayıcı kodları depoda duruyor.
- `manifest.all-sources.json` 59 benzersiz kaynağı `enabled: true` ile listeler (aynı siteyi sunan tekrarlar tek girişe indirildi; eşleme ve gerekçe `CANONICAL.json`, kaldırılan alternatifler isteğe bağlı `manifest.alternates.json`). Bu, kullanıcı seçimine izin verir; çalışırlık garantisi değildir.
- Tam liste çalışıyor anlamına gelmez; yalnızca 5 aday doğrulama sürecinden geçmiştir, diğerlerinin durumu bilinmiyor/doğrulanmadı.
- `manifest.verified.json`: yalnızca 5 doğrulanmış. `manifest.quarantine.json`: 54 karantina (tekilleştirme sonrası).
- Bazı sağlayıcılar çalışma anında üçüncü taraf ham GitHub dosyalarını/yapılandırmasını çeker; paket tamamen bağımsız değildir.
- Gömülü kimlik bilgileri/istemci anahtarları kaldırıldı; gerekirse çağıran `globalThis.*` ile sağlar (ör. TMDB_API_KEY, YOUTUBE_API_KEY). Anahtarsız kalan sağlayıcılar tam çalışmayabilir.

## ÇizgiMax kalite seçimi (1.0.4)
Dzen DASH MPD'sindeki **gerçek** video yükseklikleri ayrı kaynak girişi olarak sunulur (ör. Auto, 1080p, 720p); yalnızca MPD'de bulunan yükseklikler listelenir. Seçim, URL parçası `#sinefil-video-height=H` ile istenir ve **oynatıcının** (native köprü) o yükseklikteki video track'ini seçmesiyle uygulanır; ses track'i korunur. **Bunun çalışması için uygulamanın yeni sürümü gerekir**; eski uygulamada parça yok sayılır ve her giriş Auto gibi oynar.

## ÇizgiMax hız (1.0.5)
Tercih edilen Dzen sunucusu (etiket önceliği; asıl tür yönlendirme sonrası ana makineden doğrulanır) geçerli MPD ve gerçek kalitelerle sonuç verince sağlayıcı **hemen döner**; Vidmoly yalnızca Dzen başarısız olursa istenir. Bu, kaynak listesinin gelme süresini kısaltır; videonun tıklamadan sonra başlama süresini değiştirmez ve tüm videoların daha hızlı açılacağı anlamına gelmez. Kalite seçimi için yeni Sinefil sürümü gerekliliği değişmedi.

## Kaynak ve izinler
Özgün depo/SHA ve vendor SHA-256 değerleri `SOURCES.json` içindedir; lisanslar `LICENSES/`, izin kaydı `PERMISSIONS.md`. Kod ilgili özgün sahiplerine aittir; bu depo genel bir lisans vermez.

## Kaldırılanlar (1.0.11)
FilmModu, DDiziBox ve HDFilmCehennemi kullanıcı isteğiyle depodan kaldırıldı (git geçmişinde durur). Daha önce kurulmuş kopyalar kullanıcının cihazında kalabilir; uygulamadan elle silinebilir.
