document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let selectedFiles = [];

    // Drag & Drop olayları
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-indigo-500');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-indigo-500');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                alert('Lütfen sadece resim dosyaları yükleyin.');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
                return false;
            }
            return true;
        });

        selectedFiles = [...selectedFiles, ...validFiles];
        updatePreview();
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'grid';

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative group';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-32 object-cover rounded-lg transition-transform transform group-hover:scale-105';
                
                const removeButton = document.createElement('button');
                removeButton.innerHTML = '×';
                removeButton.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity';
                removeButton.onclick = () => {
                    selectedFiles.splice(index, 1);
                    updatePreview();
                };

                div.appendChild(img);
                div.appendChild(removeButton);
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        processButton.style.display = selectedFiles.length > 0 ? 'block' : 'none';
    }

    processButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        processButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Fotoğraflar işleniyor...';

        try {
            const photos = await Promise.all(selectedFiles.map(async file => {
                const base64 = await readFileAsBase64(file);
                return {
                    name: file.name,
                    data: base64.split(',')[1]
                };
            }));

            const response = await fetch('/.netlify/functions/processPhotos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ photos })
            });

            if (!response.ok) {
                throw new Error('İşlem sırasında bir hata oluştu');
            }

            const blob = await response.blob();
            downloadBlob(blob, 'processed_photos.zip');

            progressBar.style.width = '100%';
            progressText.textContent = 'İşlem tamamlandı!';

            setTimeout(() => {
                progressContainer.style.display = 'none';
                processButton.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Hata:', error);
            progressText.textContent = 'Hata: ' + error.message;
            progressBar.style.backgroundColor = '#ef4444';
            processButton.disabled = false;
        }
    });

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function downloadBlob(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}); 