const Jimp = require('jimp');
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
        const { photo } = JSON.parse(event.body);
        
        if (!photo || !photo.data || !photo.name) {
            throw new Error('Geçersiz fotoğraf verisi');
        }

        try {
            // Base64'ü buffer'a çevir
            const buffer = Buffer.from(photo.data, 'base64');
            
            // Jimp ile işle
            const image = await Jimp.read(buffer);
            
            // Boyutlandır ve kaliteyi ayarla
            image.cover(133, 171);
            
            // JPEG olarak kaydet
            const processedBuffer = await image.quality(100).getBufferAsync(Jimp.MIME_JPEG);
            
            // İşlenmiş fotoğrafı base64 olarak döndür
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: photo.name,
                    data: processedBuffer.toString('base64')
                })
            };
            
        } catch (err) {
            console.error(`Fotoğraf işleme hatası:`, err);
            throw new Error(`Fotoğraf işlenemedi: ${err.message}`);
        }

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