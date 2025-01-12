const sharp = require('sharp');
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
        
        // Sharp instance'ı oluştur
        const image = sharp(buffer);

        // Metadata kontrol et
        const metadata = await image.metadata();
        console.log('Metadata:', metadata);

        // Görüntüyü işle
        const processedBuffer = await image
          .rotate() // EXIF rotasyonunu uygula
          .resize(133, 171, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({
            quality: 100,
            chromaSubsampling: '4:4:4'
          })
          .toBuffer();

        // Sonucu kontrol et
        const processedMetadata = await sharp(processedBuffer).metadata();
        console.log('Processed Metadata:', processedMetadata);

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