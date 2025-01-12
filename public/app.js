document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const selectedFiles = new Set();

    // Sürükle-bırak olayları
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                alert('Lütfen sadece resim dosyası seçin.');
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
                continue;
            }
            selectedFiles.add(file);
        }
        updatePreview();
    }

    function updatePreview() {
        previewContainer.innerHTML = '';
        previewContainer.style.display = selectedFiles.size ? 'grid' : 'none';
        processButton.style.display = selectedFiles.size ? 'block' : 'none';

        selectedFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'relative';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'w-full h-40 object-cover rounded-lg shadow-md';
            
            const info = document.createElement('div');
            info.className = 'mt-2 text-sm text-gray-600';
            info.textContent = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                selectedFiles.delete(file);
                updatePreview();
            };
            
            div.appendChild(img);
            div.appendChild(info);
            div.appendChild(removeBtn);
            previewContainer.appendChild(div);
        });
    }

    async function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    processButton.addEventListener('click', async () => {
        if (selectedFiles.size === 0) return;

        processButton.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Fotoğraflar işleniyor...';

        try {
            let index = 0;
            for (const file of selectedFiles) {
                const progress = Math.round((index / selectedFiles.size) * 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${file.name} işleniyor... (${progress}%)`;

                const base64Data = await readFileAsBase64(file);
                const response = await fetch('/.netlify/functions/processPhotos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        photo: {
                            name: file.name,
                            data: base64Data
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Fotoğraf işlenirken bir hata oluştu');
                }

                const result = await response.json();
                
                // İşlenmiş fotoğrafı indir
                const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `islenmiş_${result.name}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Boyut bilgisini güncelle
                const imgContainer = previewContainer.children[index];
                const infoDiv = imgContainer.querySelector('.text-sm');
                infoDiv.textContent = `${result.name} (${result.size}KB, Kalite: ${result.quality}%)`;

                index++;
            }

            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#10B981';
            progressText.textContent = 'Tüm fotoğraflar başarıyla işlendi!';
            
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                progressBar.style.backgroundColor = '#4F46E5';
                selectedFiles.clear();
                updatePreview();
            }, 3000);

        } catch (error) {
            console.error('Hata:', error);
            progressBar.style.backgroundColor = '#EF4444';
            progressText.textContent = `Hata: ${error.message}`;
            
            setTimeout(() => {
                progressBar.style.backgroundColor = '#4F46E5';
            }, 3000);
        }

        processButton.disabled = false;
    });
}); 