# Sinefil Sources

Sinefil için sağlayıcı (kaynak) paketi, sürüm 1.0.14.

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

## ÇizgiMax çizgi film kataloğu (1.0.8)
- Arama artık sitenin tam arama sayfasından yapılır. Hızlı öneri API'si en fazla 5 sonuç ve yalnız Türkçe ad veriyordu; TMDB'nin Türkçe adı sitenin adından farklıysa ("Aslan Koruyucular" / "The Lion Guard") dizi bulunamıyordu. Tam arama sayfasındaki İngilizce/özgün ad ve yıl da karşılaştırılır.
- Bölüm adresi tahmin edilmez; dizi sayfasındaki sezon ızgarasından okunur. Sitede bölümlerin yaklaşık dörtte biri `-1-sezon-5-bolum-izle/` kalıbına uymuyordu (`-1-s1e5/`, `-sezon-1-bolum-5/`, farklı slug) ve bu dizilerde hiç kaynak çıkmıyordu.
- Site bütün bölümleri tek sezonda düz numarayla tutuyorsa TMDB'nin sezon uzunluklarından mutlak bölüm hesaplanır. Sitede olmayan bir bölüm için başka bölüm açılmaz.
- Site sık istekte 429 veriyor (birkaç dakikalık bekleme); toplu tarama yapılmamalı.

## ÇizgiMax dayanıklılık ve anime adları (1.0.7)
- Site arada arka uç hatası (502/503) veriyor; eklenti artık kısa beklemelerle iki kez daha dener, geçici kesintide "kaynak yok" demez.
- Animelerde TMDB özgün adı Japonca olabiliyor (ör. ナルト); Türkçe çeviri yoksa site Japonca adla aranıp bulunamıyordu. Artık TMDB çevirilerindeki İngilizce ad da aranır.

## ÇizgiMax güncel sayfa ve eşleşme (1.0.6)
- Sitenin önbelleği bölüm sayfasını saatlerce eski tutabiliyordu; içindeki oynatma jetonlarının süresi dolmuş geldiği için bazı dizilerde (ör. Ben 10) hiç kaynak çıkmıyordu. Bölüm sayfası artık önbelleği atlayarak istenir.
- Site önerileri Türkçe ad, ayrı yıl ve İngilizce slug taşıyor: eşleşme ad ya da slug ile yapılır, bilinen yıl TMDB yılıyla ±1 uyumlu olmalı (Ben 10 2016 artık 2005 dizisine değil kendi sayfasına gider).
- Site araması iki nokta vb. içeren adlarda boş dönebiliyor ("Ben 10: Alien Force"); noktalamasız sorgu da denenir.
- Bilinen, düzeltilmeyen: bazı bölümler yalnız Google Drive ya da telif engelli Sibnet sunucusu sunuyor (ör. SüngerBob 1x1, Naruto 1x1); bunlarda kaynak çıkmaz.

## Kaldırılanlar (1.0.11)
FilmModu, DDiziBox ve HDFilmCehennemi kullanıcı isteğiyle depodan kaldırıldı (git geçmişinde durur). Daha önce kurulmuş kopyalar kullanıcının cihazında kalabilir; uygulamadan elle silinebilir.
