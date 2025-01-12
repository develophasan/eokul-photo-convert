const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../public/favicon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

// SVG'yi Buffer'a dönüştür
const svgBuffer = fs.readFileSync(SVG_PATH);

// Favicon boyutları
const sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512
};

// Her boyut için PNG oluştur
Object.entries(sizes).forEach(([filename, size]) => {
    sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, filename))
        .then(() => console.log(`${filename} oluşturuldu`))
        .catch(err => console.error(`${filename} oluşturulurken hata:`, err));
}); 