// TripFlow Markdown Viewer
class TripFlowViewer {
    constructor() {
        this.markdownFiles = [];
        this.currentFile = null;
        this.init();
    }

    init() {
        this.loadFileList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeViewer = document.getElementById('close-viewer');
        if (closeViewer) {
            closeViewer.addEventListener('click', () => {
                this.hideViewer();
            });
        }

        // Upload functionality
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }

        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('border-blue-400', 'bg-blue-50');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-blue-400', 'bg-blue-50');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });
        }
    }

    async loadFileList() {
        try {
            const response = await fetch('/api/files');
            if (response.ok) {
                this.markdownFiles = await response.json();
                this.renderFileList();
            } else {
                this.showError('파일 목록을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('Error loading file list:', error);
            this.showError('파일 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    renderFileList() {
        const fileList = document.getElementById('file-list');
        if (!fileList) return;

        if (this.markdownFiles.length === 0) {
            fileList.innerHTML = '<p class="text-gray-500 col-span-full">마크다운 파일이 없습니다.</p>';
            return;
        }

        fileList.innerHTML = this.markdownFiles.map(file => `
            <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="tripFlowViewer.openFile('${file.name}')">
                <div class="flex items-center mb-2">
                    <svg class="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                    <h3 class="font-medium text-gray-900">${file.name}</h3>
                </div>
                <p class="text-sm text-gray-500">${file.size} bytes</p>
                <p class="text-xs text-gray-400 mt-1">클릭하여 읽기</p>
            </div>
        `).join('');
    }

    async openFile(filename) {
        try {
            const response = await fetch(`/api/files/${filename}`);
            if (response.ok) {
                const content = await response.text();
                this.displayMarkdown(filename, content);
            } else {
                this.showError('파일을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            this.showError('파일을 여는 중 오류가 발생했습니다.');
        }
    }

    displayMarkdown(filename, content) {
        const titleElement = document.getElementById('file-title');
        const contentElement = document.getElementById('markdown-content');
        const viewer = document.getElementById('markdown-viewer');

        if (titleElement) {
            titleElement.textContent = filename;
        }

        if (contentElement) {
            // Convert Markdown to HTML
            let htmlContent = content;
            if (typeof marked !== 'undefined') {
                htmlContent = marked.parse(content);
            }

            // Sanitize HTML
            if (typeof DOMPurify !== 'undefined') {
                htmlContent = DOMPurify.sanitize(htmlContent);
            }

            contentElement.innerHTML = htmlContent;
        }

        if (viewer) {
            viewer.classList.remove('hidden');
            viewer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideViewer() {
        const viewer = document.getElementById('markdown-viewer');
        if (viewer) {
            viewer.classList.add('hidden');
        }
    }

    showError(message) {
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = `<p class="text-red-500 col-span-full">${message}</p>`;
        }
    }

    async handleFileUpload(file) {
        // Validate file type
        const allowedTypes = ['.md', '.markdown'];
        const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExt)) {
            this.showUploadStatus('error', '마크다운 파일만 업로드 가능합니다.');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showUploadStatus('error', '파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.showUploadStatus('uploading', '업로드 중...');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showUploadStatus('success', `파일이 성공적으로 업로드되었습니다: ${result.filename}`);
                this.loadFileList(); // Refresh file list
            } else {
                this.showUploadStatus('error', result.message || '업로드 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    showUploadStatus(type, message) {
        const statusElement = document.getElementById('upload-status');
        if (!statusElement) return;

        statusElement.classList.remove('hidden');
        
        let statusClass = '';
        let icon = '';
        
        switch (type) {
            case 'success':
                statusClass = 'bg-green-50 border-green-200 text-green-800';
                icon = '✓';
                break;
            case 'error':
                statusClass = 'bg-red-50 border-red-200 text-red-800';
                icon = '✗';
                break;
            case 'uploading':
                statusClass = 'bg-blue-50 border-blue-200 text-blue-800';
                icon = '⏳';
                break;
        }

        statusElement.innerHTML = `
            <div class="border rounded-md p-3 ${statusClass}">
                <span class="font-medium">${icon} ${message}</span>
            </div>
        `;

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.tripFlowViewer = new TripFlowViewer();
    } catch (error) {
        console.error('TripFlow Viewer initialization error:', error);
    }
});