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
                this.showError('여행 계획 목록을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('Error loading file list:', error);
            this.showError('여행 계획 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    renderFileList() {
        const fileList = document.getElementById('file-list');
        if (!fileList) return;

        if (this.markdownFiles.length === 0) {
            fileList.innerHTML = '<p class="text-gray-500 col-span-full">공유된 여행 계획이 없습니다.</p>';
            return;
        }

        fileList.innerHTML = this.markdownFiles.map(file => `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center cursor-pointer" onclick="tripFlowViewer.openFile('${file.name}')">
                        <svg class="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                        <h3 class="font-medium text-gray-900">${file.name}</h3>
                    </div>
                    <button onclick="tripFlowViewer.deleteFile('${file.name}')" class="text-red-500 hover:text-red-700 p-1 rounded">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                <p class="text-sm text-gray-500">${file.size} bytes</p>
                <p class="text-xs text-gray-400 mt-1">클릭하여 여행 계획 보기</p>
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
            let htmlContent = content;
            
            // Check if it's a markdown file
            const isMarkdown = filename.toLowerCase().endsWith('.md') || filename.toLowerCase().endsWith('.markdown');
            
            if (isMarkdown && typeof marked !== 'undefined') {
                // Render as markdown
                htmlContent = marked.parse(content);
            } else {
                // Render as plain text with line breaks
                htmlContent = content.replace(/\n/g, '<br>');
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

    async deleteFile(filename) {
        if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/files/${filename}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess(`파일이 성공적으로 삭제되었습니다: ${result.filename}`);
                this.loadFileList(); // Refresh file list
            } else {
                this.showError(result.message || '파일 삭제 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    showSuccess(message) {
        const fileList = document.getElementById('file-list');
        if (fileList) {
            // Create a temporary success message
            const successDiv = document.createElement('div');
            successDiv.className = 'bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4';
            successDiv.innerHTML = `✓ ${message}`;
            fileList.insertBefore(successDiv, fileList.firstChild);
            
            // Remove success message after 3 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        }
    }

    async handleFileUpload(file) {
        // Validate file type
        const allowedTypes = ['.md', '.markdown', '.txt'];
        const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExt)) {
            this.showUploadStatus('error', '마크다운 또는 텍스트 파일만 업로드 가능합니다.');
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