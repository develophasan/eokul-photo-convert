# E-Okul Fotoğraf Dönüştürücü

E-Okul ve MEBBİS sistemleri için fotoğrafları otomatik olarak uygun formata dönüştüren web tabanlı bir uygulama.

## Özellikler

- 📸 Fotoğrafları otomatik olarak 133x171 piksel boyutuna dönüştürme
- 📦 Minimum 20KB dosya boyutu garantisi
- 🔄 Otomatik yön düzeltme (EXIF rotasyonu)
- 🎨 Yüksek görüntü kalitesi
- 📱 Mobil uyumlu tasarım
- 🔒 Güvenli dosya işleme
- 📥 Toplu indirme (ZIP formatında)

## Teknik Özellikler

- Çıktı boyutu: 133x171 piksel
- Format: JPEG
- Minimum dosya boyutu: 20KB
- Maksimum yükleme boyutu: 5MB/dosya
- Maksimum dosya sayısı: 20 fotoğraf

## Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/develophasan/eokul-photo-convert.git
```

2. Proje dizinine gidin:
```bash
cd eokul-photo-convert
```

3. Bağımlılıkları yükleyin:
```bash
npm install
```

4. Uygulamayı başlatın:
```bash
npm start
```

5. Tarayıcınızda şu adresi açın: `http://localhost:3000`

## Kullanılan Teknolojiler

- Node.js
- Express.js
- Sharp (görüntü işleme)
- Multer (dosya yükleme)
- Archiver (ZIP oluşturma)
- TailwindCSS (stil)

## Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## Geliştirici

Hasan Özdemir - [GitHub](https://github.com/develophasan)

## Güvenlik

- Yüklenen fotoğraflar işlem tamamlandıktan sonra otomatik olarak silinir
- Dosya boyutu ve sayısı sınırlamaları mevcuttur
- Sadece resim dosyaları kabul edilir (JPEG, JPG, PNG) 