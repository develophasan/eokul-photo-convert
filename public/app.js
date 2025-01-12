document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const selectedFiles = [];
    const processedFiles = new Map(); // İşlenmiş dosyaları tutacak Map

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
                
                const isProcessed = processedFiles.has(file.name);
                const buttonClass = isProcessed ? 'bg-green-500' : 'bg-indigo-500';
                const buttonText = isProcessed ? 'İndir' : 'İşle';
                
                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" class="w-32 h-40 object-cover rounded shadow hover:scale-105 transition-transform">
                    <button onclick="removeFile(${index})" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    <button onclick="${isProcessed ? `downloadFile('${file.name}')` : `processFile(${index})`}" 
                            class="absolute bottom-2 right-2 ${buttonClass} text-white text-sm rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${buttonText}
                    </button>
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
        const fileName = selectedFiles[index].name;
        processedFiles.delete(fileName);
        selectedFiles.splice(index, 1);
        updatePreview();
    };

    window.downloadFile = (fileName) => {
        const processedData = processedFiles.get(fileName);
        if (processedData) {
            const link = document.createElement('a');
            link.href = `data:image/jpeg;base64,${processedData}`;
            link.download = `processed_${fileName}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    window.processFile = async (index) => {
        const file = selectedFiles[index];
        progressContainer.style.display = 'block';
        progressBar.style.width = '25%';
        progressText.textContent = `${file.name} işleniyor...`;

        try {
            const base64Data = await readFileAsBase64(file);
            
            progressBar.style.width = '50%';
            progressText.textContent = 'Sunucuya yükleniyor...';

            const response = await fetch('/.netlify/functions/processPhotos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    photo: {
                        name: file.name,
                        data: base64Data
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Bilinmeyen bir hata oluştu');
            }

            progressBar.style.width = '75%';
            progressText.textContent = 'İşleniyor...';

            const result = await response.json();
            processedFiles.set(file.name, result.data);

            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#10B981';
            progressText.textContent = 'İşlem tamamlandı!';

            // Önizlemeyi güncelle
            updatePreview();

            setTimeout(() => {
                progressBar.style.backgroundColor = '#6366F1';
                progressContainer.style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Hata:', error);
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#EF4444';
            progressText.textContent = `Hata: ${error.message}`;

            setTimeout(() => {
                progressBar.style.backgroundColor = '#6366F1';
            }, 3000);
        }
    };

    async function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const base64 = reader.result;
                    const base64Data = base64.substring(base64.indexOf(',') + 1);
                    resolve(base64Data);
                } catch (error) {
                    reject(new Error(`Base64 dönüşüm hatası: ${error.message}`));
                }
            };
            reader.onerror = () => reject(new Error('Dosya okuma hatası'));
            reader.readAsDataURL(file);
        });
    }

    processButton.addEventListener('click', () => {
        selectedFiles.forEach((_, index) => {
            if (!processedFiles.has(selectedFiles[index].name)) {
                setTimeout(() => processFile(index), index * 1000);
            }
        });
    });
}); 