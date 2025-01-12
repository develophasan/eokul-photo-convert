document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let selectedFiles = [];

    // Sürükle-bırak olayları
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

    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 20) {
            alert('En fazla 20 fotoğraf yükleyebilirsiniz.');
            return;
        }

        selectedFiles = Array.from(files).filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} 5MB'dan büyük. Bu dosya atlanacak.`);
                return false;
            }
            if (!file.type.match('image.*')) {
                alert(`${file.name} bir resim dosyası değil. Bu dosya atlanacak.`);
                return false;
            }
            return true;
        });

        updatePreview();
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('hidden');

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-32 object-cover rounded-lg" alt="Preview">
                    <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                            onclick="removeFile(${index})">×</button>
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        processButton.classList.toggle('hidden', selectedFiles.length === 0);
    }

    window.removeFile = (index) => {
        selectedFiles.splice(index, 1);
        updatePreview();
    };

    processButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('photos', file);
        });

        processButton.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Fotoğraflar yükleniyor...';

        try {
            const response = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Yükleme başarısız');

            const data = await response.json();
            
            progressBar.style.width = '100%';
            progressText.textContent = 'İşlem tamamlandı!';
            downloadButton.classList.remove('hidden');
            downloadButton.onclick = () => downloadZip(data.zipFile);

        } catch (error) {
            console.error('Hata:', error);
            progressText.textContent = 'Bir hata oluştu!';
            progressBar.classList.add('bg-red-600');
        }
    });

    async function downloadZip(filename) {
        try {
            window.location.href = `/api/photos/download/${filename}`;
            downloadButton.classList.add('hidden');
            progressContainer.classList.add('hidden');
            previewContainer.classList.add('hidden');
            processButton.disabled = false;
            selectedFiles = [];
        } catch (error) {
            console.error('İndirme hatası:', error);
            alert('Dosya indirilemedi!');
        }
    }
}); 