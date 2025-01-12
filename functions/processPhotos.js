const Jimp = require('jimp');
const archiver = require('archiver');
const { Buffer } = require('buffer');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Request body'yi parse et
    const requestBody = JSON.parse(event.body);
    console.log('Request body parsed');

    if (!requestBody.photos || !Array.isArray(requestBody.photos)) {
      throw new Error('Geçersiz istek formatı: photos array gerekli');
    }

    const processedPhotos = [];
    console.log(`İşlenecek fotoğraf sayısı: ${requestBody.photos.length}`);

    // Her fotoğrafı işle
    for (const photo of requestBody.photos) {
      try {
        console.log(`İşleniyor: ${photo.name}`);

        if (!photo.data) {
          throw new Error('Fotoğraf verisi eksik');
        }

        // Base64'ü buffer'a çevir
        const imageBuffer = Buffer.from(photo.data, 'base64');
        console.log('Base64 buffer\'a çevrildi');

        // Jimp ile görüntüyü yükle
        const image = await Jimp.read(imageBuffer);
        console.log('Görüntü Jimp ile yüklendi');

        // Görüntüyü işle
        image.cover(133, 171)    // Belirtilen boyuta kırp
             .quality(100);      // Maksimum kalite

        // İşlenmiş görüntüyü buffer'a çevir
        const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        console.log('Görüntü işlendi ve buffer\'a çevrildi');

        processedPhotos.push({
          name: photo.name,
          data: processedBuffer
        });

      } catch (photoError) {
        console.error(`Fotoğraf işleme hatası (${photo.name}):`, photoError);
        throw new Error(`${photo.name} dosyası işlenirken hata oluştu: ${photoError.message}`);
      }
    }

    // ZIP dosyası oluştur
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('warning', err => console.warn('Arşiv uyarısı:', err));
    archive.on('error', err => {
      throw new Error(`Arşiv oluşturma hatası: ${err.message}`);
    });

    // Fotoğrafları arşive ekle
    for (const [index, photo] of processedPhotos.entries()) {
      archive.append(photo.data, { name: `photo_${index + 1}.jpg` });
    }

    await archive.finalize();
    console.log('ZIP dosyası oluşturuldu');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=processed_photos.zip'
      },
      body: Buffer.concat(chunks).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('İşlem hatası:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'İşlem sırasında bir hata oluştu',
        details: error.message
      })
    };
  }
}; 