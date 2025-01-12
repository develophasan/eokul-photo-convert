document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const selectedFiles = [];
    const processedFiles = new Map();

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

    function createProgressBar(id) {
        return `
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2 hidden" id="progress-container-${id}">
                <div class="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" id="progress-bar-${id}" style="width: 0%"></div>
            </div>
            <div class="text-sm text-gray-600 hidden" id="progress-text-${id}"></div>
        `;
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'bg-white p-4 rounded-lg shadow-md space-y-2';
                
                const isProcessed = processedFiles.has(file.name);
                const buttonClass = isProcessed ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-500 hover:bg-indigo-600';
                const buttonText = isProcessed ? 'İndir' : 'İşle';
                
                div.innerHTML = `
                    <div class="relative group">
                        <img src="${e.target.result}" alt="${file.name}" class="w-32 h-40 object-cover rounded shadow hover:scale-105 transition-transform mx-auto">
                        <button onclick="removeFile(${index})" class="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${file.name}">${file.name}</p>
                        <p class="text-xs text-gray-500">${(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    ${createProgressBar(index)}
                    <div class="flex justify-center">
                        <button onclick="${isProcessed ? `downloadFile('${file.name}')` : `processFile(${index})`}" 
                                class="${buttonClass} text-white text-sm rounded px-4 py-2 transition-colors duration-300 w-full">
                            ${buttonText}
                        </button>
                    </div>
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        previewContainer.style.display = selectedFiles.length ? 'grid' : 'none';
        processButton.style.display = selectedFiles.length ? 'block' : 'none';
        
        // Grid düzenini güncelle
        previewContainer.className = 'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-4';
    }

    function updateProgress(index, progress, text, status = 'progress') {
        const container = document.getElementById(`progress-container-${index}`);
        const bar = document.getElementById(`progress-bar-${index}`);
        const textElement = document.getElementById(`progress-text-${index}`);

        container.classList.remove('hidden');
        textElement.classList.remove('hidden');
        
        bar.style.width = `${progress}%`;
        textElement.textContent = text;

        switch(status) {
            case 'success':
                bar.classList.remove('bg-indigo-500');
                bar.classList.add('bg-green-500');
                break;
            case 'error':
                bar.classList.remove('bg-indigo-500');
                bar.classList.add('bg-red-500');
                break;
            default:
                bar.classList.remove('bg-green-500', 'bg-red-500');
                bar.classList.add('bg-indigo-500');
        }
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
        updateProgress(index, 25, 'Fotoğraf hazırlanıyor...');

        try {
            const base64Data = await readFileAsBase64(file);
            updateProgress(index, 50, 'Sunucuya yükleniyor...');

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

            updateProgress(index, 75, 'İşleniyor...');

            const result = await response.json();
            processedFiles.set(file.name, result.data);

            updateProgress(index, 100, 'İşlem tamamlandı!', 'success');
            updatePreview();

        } catch (error) {
            console.error('Hata:', error);
            updateProgress(index, 100, `Hata: ${error.message}`, 'error');
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