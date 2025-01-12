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
    let { photos } = JSON.parse(event.body);
    
    if (!photos || !Array.isArray(photos)) {
      throw new Error('Geçersiz fotoğraf verisi');
    }

    const processedPhotos = [];

    // Her fotoğrafı işle
    for (const photo of photos) {
      if (!photo.data || !photo.name) {
        throw new Error('Geçersiz fotoğraf formatı');
      }

      try {
        const buffer = Buffer.from(photo.data, 'base64');
        
        // Fotoğrafı Jimp ile yükle
        const image = await Jimp.read(buffer);
        
        console.log('Orijinal boyut:', image.bitmap.width, 'x', image.bitmap.height);

        // Görüntüyü işle
        image
          .cover(133, 171) // Belirtilen boyuta kırp
          .quality(100); // Maksimum kalite

        // İşlenmiş görüntüyü buffer'a dönüştür
        const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        
        const processedImage = await Jimp.read(processedBuffer);
        console.log('İşlenmiş boyut:', processedImage.bitmap.width, 'x', processedImage.bitmap.height);

        processedPhotos.push({
          name: photo.name,
          data: processedBuffer.toString('base64')
        });
      } catch (photoError) {
        console.error('Fotoğraf işleme hatası:', photoError);
        throw new Error(`${photo.name} dosyası işlenirken hata oluştu: ${photoError.message}`);
      }
    }

    // ZIP dosyası oluştur
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('warning', (err) => console.warn('Arşiv uyarısı:', err));
    archive.on('error', (err) => {
      throw new Error(`Arşiv oluşturma hatası: ${err.message}`);
    });

    // Fotoğrafları arşive ekle
    for (const [index, photo] of processedPhotos.entries()) {
      const buffer = Buffer.from(photo.data, 'base64');
      archive.append(buffer, { name: `photo_${index + 1}.jpg` });
    }

    await archive.finalize();

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
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}; 