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
    const { photos } = JSON.parse(event.body);
    
    if (!photos || !Array.isArray(photos)) {
      throw new Error('Geçersiz fotoğraf verisi');
    }

    const processedPhotos = [];

    // Her fotoğrafı işle
    for (const photo of photos) {
      if (!photo.data || !photo.name) {
        throw new Error('Geçersiz fotoğraf formatı');
      }

      const buffer = Buffer.from(photo.data, 'base64');
      
      const processedBuffer = await sharp(buffer)
        .rotate()
        .resize(133, 171, {
          fit: 'cover',
          position: 'center'
        })
        .withMetadata()
        .jpeg({ 
          quality: 100,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();

      processedPhotos.push({
        name: photo.name,
        data: processedBuffer.toString('base64')
      });
    }

    // ZIP dosyası oluştur
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => {});
    archive.on('error', (err) => {
      throw err;
    });

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
    console.error('Hata:', error);
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