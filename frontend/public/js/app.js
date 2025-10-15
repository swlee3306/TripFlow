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
            const response = await fetch(`/markdown-files/${filename}`);
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.tripFlowViewer = new TripFlowViewer();
    } catch (error) {
        console.error('TripFlow Viewer initialization error:', error);
    }
});