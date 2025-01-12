const Jimp = require('jimp');
const archiver = require('archiver');
const { Buffer } = require('buffer');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        const { photos } = JSON.parse(event.body);
        
        if (!Array.isArray(photos)) {
            throw new Error('Geçersiz veri formatı');
        }

        // ZIP dosyası hazırla
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks = [];
        
        archive.on('data', chunk => chunks.push(chunk));
        archive.on('error', err => {
            throw new Error(`ZIP hatası: ${err.message}`);
        });

        // Her fotoğrafı işle
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            
            try {
                // Base64'ü buffer'a çevir
                const buffer = Buffer.from(photo.data, 'base64');
                
                // Jimp ile işle
                const image = await Jimp.read(buffer);
                
                // Boyutlandır ve kaliteyi ayarla
                image.cover(133, 171);
                
                // JPEG olarak kaydet
                const processedBuffer = await image.quality(100).getBufferAsync(Jimp.MIME_JPEG);
                
                // ZIP'e ekle
                archive.append(processedBuffer, { name: `photo_${i + 1}.jpg` });
                
            } catch (err) {
                console.error(`Fotoğraf işleme hatası (${i + 1}):`, err);
                throw new Error(`Fotoğraf işlenemedi: ${err.message}`);
            }
        }

        // ZIP'i sonlandır
        await archive.finalize();

        // Sonucu döndür
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
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: error.message
            })
        };
    }
}; 