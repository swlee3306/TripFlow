// TripFlow Markdown Viewer
class TripFlowViewer {
    constructor() {
        this.markdownFiles = [];
        this.currentFile = null;
        this.init();
    }

    init() {
        this.initializeSampleFiles();
        this.loadFileList();
        this.setupEventListeners();
    }

    initializeSampleFiles() {
        // Check if sample files already exist
        const existingFiles = JSON.parse(localStorage.getItem('markdownFiles') || '[]');
        if (existingFiles.length === 0) {
            // Add sample file
            const sampleFile = {
                name: 'sample-trip.md',
                size: 786,
                content: `# 제주도 3박 4일 여행

## 1일차 - 제주시
- **오전**: 제주공항 도착
- **점심**: 제주시내 맛집 투어
- **오후**: 제주도립미술관 관람
- **저녁**: 동문시장 야시장

## 2일차 - 서귀포
- **오전**: 중문관광단지
- **점심**: 서귀포 매운맛집
- **오후**: 천지연폭포
- **저녁**: 서귀포 칠십리

## 3일차 - 한라산
- **오전**: 한라산 등반
- **점심**: 산정상에서 도시락
- **오후**: 하산 후 휴식
- **저녁**: 제주시내에서 회식

## 4일차 - 출발
- **오전**: 마지막 쇼핑
- **점심**: 공항 근처 식당
- **오후**: 제주공항 출발

### 예산
- 항공료: 200,000원
- 숙박비: 150,000원
- 식비: 100,000원
- 교통비: 50,000원

**총 예산: 500,000원**`,
                uploadTime: new Date().toISOString()
            };
            
            localStorage.setItem('markdownFiles', JSON.stringify([sampleFile]));
        }
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
            // Load from localStorage
            const files = JSON.parse(localStorage.getItem('markdownFiles') || '[]');
            this.markdownFiles = files;
            this.renderFileList();
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
            // Find file in localStorage
            const files = JSON.parse(localStorage.getItem('markdownFiles') || '[]');
            const file = files.find(f => f.name === filename);
            
            if (file) {
                this.displayMarkdown(filename, file.content);
            } else {
                this.showError('파일을 찾을 수 없습니다.');
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

        this.showUploadStatus('uploading', '파일을 처리 중...');

        try {
            // Read file content
            const content = await this.readFileContent(file);
            
            // Store file in localStorage for demo purposes
            const fileData = {
                name: file.name,
                size: file.size,
                content: content,
                uploadTime: new Date().toISOString()
            };

            // Get existing files
            let files = JSON.parse(localStorage.getItem('markdownFiles') || '[]');
            files.push(fileData);
            localStorage.setItem('markdownFiles', JSON.stringify(files));

            this.showUploadStatus('success', `파일이 성공적으로 저장되었습니다: ${file.name}`);
            this.loadFileList(); // Refresh file list
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus('error', '파일 처리 중 오류가 발생했습니다.');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
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