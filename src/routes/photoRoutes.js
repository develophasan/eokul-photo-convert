const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');

// Multer yapılandırması
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 20 // maksimum 20 dosya
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Yalnızca resim dosyaları yüklenebilir!'));
    }
});

// Dosya boyutunu kontrol et (20KB üstü olmalı)
async function checkFileSize(filePath) {
    const stats = await fs.promises.stat(filePath);
    return stats.size > 20 * 1024; // 20KB
}

// Fotoğraf yükleme
router.post('/upload', upload.array('photos', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Lütfen en az bir fotoğraf yükleyin.' });
        }

        const processedFiles = [];

        // Her fotoğrafı işle
        for (const file of req.files) {
            const outputFilename = `processed-${path.basename(file.filename)}`;
            const outputPath = path.join('processed_photos', outputFilename);

            // İlk deneme - yüksek kalite ile
            await sharp(file.path)
                .rotate() // EXIF rotasyonunu otomatik olarak uygula
                .resize(133, 171, {
                    fit: 'cover',
                    position: 'center'
                })
                .withMetadata() // EXIF verilerini koru
                .jpeg({ 
                    quality: 100, // En yüksek kalite
                    chromaSubsampling: '4:4:4' // En iyi renk kalitesi
                })
                .toFile(outputPath);

            // Dosya boyutunu kontrol et
            let isFileSizeOk = await checkFileSize(outputPath);
            
            // Eğer dosya 20KB'dan küçükse, kaliteyi artır ve padding ekle
            if (!isFileSizeOk) {
                await sharp(file.path)
                    .rotate()
                    .resize(133, 171, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .extend({
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    })
                    .withMetadata()
                    .jpeg({ 
                        quality: 100,
                        chromaSubsampling: '4:4:4',
                        force: true
                    })
                    .toFile(outputPath);
                
                isFileSizeOk = await checkFileSize(outputPath);
                if (!isFileSizeOk) {
                    throw new Error('Dosya boyutu 20KB altında kalıyor.');
                }
            }

            processedFiles.push(outputPath);
            
            // Orijinal dosyayı sil
            fs.unlinkSync(file.path);
        }

        // ZIP dosyası oluştur
        const zipFilename = `photos-${Date.now()}.zip`;
        const zipPath = path.join('processed_photos', zipFilename);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            // İşlenmiş dosyaları sil
            processedFiles.forEach(file => fs.unlinkSync(file));
            
            res.json({
                success: true,
                message: 'Fotoğraflar başarıyla işlendi',
                zipFile: zipFilename
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // İşlenmiş dosyaları ZIP'e ekle
        processedFiles.forEach(file => {
            archive.file(file, { name: path.basename(file) });
        });

        archive.finalize();

    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ error: 'Fotoğraf işlenirken bir hata oluştu: ' + error.message });
    }
});

// ZIP dosyasını indir
router.get('/download/:filename', (req, res) => {
    const zipPath = path.join('processed_photos', req.params.filename);
    
    res.download(zipPath, (err) => {
        if (err) {
            res.status(500).json({ error: 'Dosya indirilemedi.' });
        }
        // İndirme tamamlandıktan sonra ZIP dosyasını sil
        fs.unlinkSync(zipPath);
    });
});

module.exports = router; 