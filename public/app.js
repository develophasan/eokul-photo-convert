document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const selectedFiles = [];

    // Drag & Drop olayları
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('border-indigo-500'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500'));
    
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('border-indigo-500');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} bir resim dosyası değil.`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} 5MB'dan büyük.`);
                return false;
            }
            return true;
        });

        validFiles.forEach(file => {
            if (!selectedFiles.some(f => f.name === file.name)) {
                selectedFiles.push(file);
            }
        });

        updatePreview();
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative group';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" class="w-32 h-40 object-cover rounded shadow hover:scale-105 transition-transform">
                    <button onclick="removeFile(${index})" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        previewContainer.style.display = selectedFiles.length ? 'grid' : 'none';
        processButton.style.display = selectedFiles.length ? 'block' : 'none';
        progressContainer.style.display = 'none';
    }

    window.removeFile = (index) => {
        selectedFiles.splice(index, 1);
        updatePreview();
    };

    processButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        progressContainer.style.display = 'block';
        progressBar.style.width = '25%';
        progressText.textContent = 'Fotoğraflar hazırlanıyor...';

        try {
            const photoPromises = selectedFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        // Base64 verinin başındaki "data:image/jpeg;base64," kısmını kaldır
                        const base64Data = reader.result.split(',')[1];
                        resolve({
                            name: file.name,
                            data: base64Data
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            progressBar.style.width = '50%';
            progressText.textContent = 'Fotoğraflar yükleniyor...';

            const photos = await Promise.all(photoPromises);

            progressBar.style.width = '75%';
            progressText.textContent = 'Fotoğraflar işleniyor...';

            const response = await fetch('/.netlify/functions/processPhotos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ photos })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Bilinmeyen bir hata oluştu');
            }

            const blob = await response.blob();
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#10B981';
            progressText.textContent = 'İşlem tamamlandı!';

            // ZIP dosyasını indir
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'processed_photos.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Seçili dosyaları temizle
            selectedFiles.length = 0;
            updatePreview();

        } catch (error) {
            console.error('Hata:', error);
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#EF4444';
            progressText.textContent = `Hata: ${error.message}`;

            setTimeout(() => {
                progressBar.style.backgroundColor = '#6366F1';
            }, 3000);
        }
    });
}); 