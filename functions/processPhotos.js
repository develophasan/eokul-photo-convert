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
            
            // Boyutlandır
            image.cover(133, 171); // E-Okul standart boyutu
            
            // Kaliteyi ayarla (20KB-50KB arası olacak şekilde)
            let quality = 70; // Başlangıç kalitesi
            let processedBuffer;
            
            // Dosya boyutunu kontrol et ve ayarla
            do {
                processedBuffer = await image
                    .quality(quality)
                    .getBufferAsync(Jimp.MIME_JPEG);
                
                const fileSize = processedBuffer.length / 1024; // KB cinsinden
                
                if (fileSize < 20) {
                    // Dosya çok küçükse kaliteyi artır
                    quality = Math.min(quality + 10, 100);
                } else if (fileSize > 50) {
                    // Dosya çok büyükse kaliteyi azalt
                    quality = Math.max(quality - 10, 10);
                } else {
                    // Boyut uygunsa döngüden çık
                    break;
                }
            } while (quality >= 10 && quality <= 100);
            
            // Son dosya boyutunu kontrol et
            const finalSize = processedBuffer.length / 1024;
            console.log(`İşlenmiş dosya boyutu: ${finalSize.toFixed(2)}KB, Kalite: ${quality}`);
            
            // İşlenmiş fotoğrafı base64 olarak döndür
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: photo.name,
                    data: processedBuffer.toString('base64'),
                    size: finalSize.toFixed(2),
                    quality: quality
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