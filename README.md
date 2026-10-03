<div align="center">
  <img src="icon.svg" width="86" alt="Türkiye Kariyer Radarı logosu">
  <h1>Türkiye Kariyer Radarı</h1>
  <p>İş ve staj ilanlarını farklı kaynaklardan toplayan, bilgisayarında çalışan açık kaynak kariyer paneli.</p>

  [![Node.js](https://img.shields.io/badge/Node.js-20%2B-3c873a?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-224d3d.svg)](LICENSE)
  [![No dependencies](https://img.shields.io/badge/runtime_dependencies-0-e68d4b)](package.json)
</div>

## Neler yapar?

- Kariyer.net, LinkedIn Jobs, Youthall ve İşin Olsun üzerindeki herkese açık ilan sayfalarını tarar.
- 81 ilden birini veya **Tüm Türkiye** seçeneğini destekler.
- İlanları başlık, şirket ve kaynak bilgileriyle tek ekranda gösterir.
- İnsan kaynakları, kurumsal iletişim, muhabirlik, gazetecilik, editörlük, sosyal medya, içerik, reklam ve pazarlama ilanlarını öne çıkarır.
- Genel staj, uzun dönem staj, intern, trainee ve genç yetenek programlarını önerir.
- Senior, müdür, director, manager, lead ve benzeri yönetici ilanlarını öneri listesinden çıkarır.
- Bir ilana tıklayınca başvuru için gerçek kaynak sayfasını açar.
- Başlangıçta ve 15 dakikada bir otomatik tarama yapar.
- Sonuçları ve seçilen konumu yalnızca yerel `data/` klasöründe saklar.

## Hızlı başlangıç

Gerekenler: [Node.js 20 veya üzeri](https://nodejs.org/).

### Windows

Projeyi indirdikten sonra `Baslat.cmd` dosyasına çift tıkla. Ardından tarayıcıda:

```text
http://127.0.0.1:4310
```

### macOS ve Linux

```bash
git clone https://github.com/emirhanas2/turkiye-kariyer-radari.git
cd turkiye-kariyer-radari
npm start
```

Sonra `http://127.0.0.1:4310` adresini aç.

## Kullanım

1. Arama konumuna bir il adı veya `Tüm Türkiye` yaz.
2. **Konumu uygula** düğmesine bas.
3. Kaynak kartlarından tarama durumunu takip et.
4. Arama, kaynak ve kariyer alanı filtrelerini kullan.
5. **İlanı incele** bağlantısıyla başvuruyu kaynak sitede tamamla.

Konum değiştiğinde önceki konumun sonuçları temizlenir ve yeni tarama otomatik başlar.

## Nasıl çalışır?

```text
Kaynakların herkese açık arama sayfaları
                    │
                    ▼
      Node.js yerel toplama servisi
                    │
       URL doğrulama ve tekilleştirme
                    │
                    ▼
          data/listings.json
                    │
                    ▼
       http://127.0.0.1:4310 paneli
```

Proje yalnızca `127.0.0.1` üzerinde dinler; yerel ağdan veya internetten erişime açılmaz. Tarayıcı çerezlerini ve hesap parolalarını okumaz. Kaynak sitelerde giriş gerekiyorsa ilan bağlantısı açıldıktan sonra kendi tarayıcında giriş yaparsın.

## Kaynaklar ve kapsam

| Kaynak | Toplama yöntemi | Konum desteği |
|---|---|---|
| İşin Olsun | Yapılandırılmış ilan verisi ve çoklu sayfa | İl / Tüm Türkiye |
| Kariyer.net | Herkese açık ilan kartları ve çoklu sayfa | İl / Tüm Türkiye |
| LinkedIn Jobs | Hedef alanlara ait herkese açık aramalar | İl / Tüm Türkiye |
| Youthall | İş, staj ve genç yetenek ilanları | İl / Tüm Türkiye |

Kaynak siteler sayfa yapısını veya erişim kurallarını değiştirebilir. Bir sayfa geçici olarak alınamazsa daha önce toplanmış kayıtlar korunur ve sonraki taramada yeniden denenir. Bu proje kaynakların tüm veritabanına erişmez ve bütün ilanları kapsama garantisi vermez.

## Geliştirme

Çalıştırma:

```bash
npm start
```

Testler:

```bash
npm test
```

Çalışma zamanında üçüncü taraf npm paketi kullanılmaz. Toplayıcı kuralları [collector.js](collector.js), yerel HTTP servisi [server.js](server.js), arayüz ise [web/](web/) klasöründedir.

Katkı yapmak için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakabilirsin.

## Sorumlu kullanım

Tarama sıklığı kaynakları gereksiz yüklememek için sınırlandırılmıştır. Proje otomatik başvuru yapmaz, giriş ekranlarını aşmaya çalışmaz ve yalnızca herkese açık sayfalardan bağlantı toplar. Kullanıcılar kaynak sitelerin kullanım koşullarına uymaktan sorumludur.

## Lisans

MIT — ayrıntılar için [LICENSE](LICENSE).
