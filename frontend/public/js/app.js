// TripFlow Markdown Viewer
class TripFlowViewer {
    constructor() {
        this.markdownFiles = [];
        this.filteredFiles = [];
        this.currentFile = null;
        this.originalContent = null;
        this.isEditing = false;
        this.filters = {
            search: '',
            type: 'all',
            size: 'all',
            sort: 'name'
        };
        this.init();
    }

    init() {
        this.loadFileList();
        
        // Wait for DOM to be fully loaded before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        const closeViewer = document.getElementById('close-viewer');
        if (closeViewer) {
            closeViewer.addEventListener('click', () => {
                this.hideViewer();
            });
        }

        // Download functionality
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (this.currentFile) {
                    this.downloadFile(this.currentFile);
                }
            });
        }
        
        // Use event delegation for better reliability
        document.addEventListener('input', (e) => {
            if (e.target.id === 'search-input') {
                console.log('🔍 Search input via delegation:', e.target.value);
                this.filters.search = e.target.value.trim().toLowerCase();
                this.applyFilters();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.target.id === 'search-input') {
                console.log('⌨️ Search keyup via delegation:', e.target.value);
                this.filters.search = e.target.value.trim().toLowerCase();
                this.applyFilters();
            }
        });

        // Edit functionality
        const editBtn = document.getElementById('edit-btn');
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.startEditing();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveFile();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelEditing();
            });
        }

        // Search and filter functionality
        const typeFilter = document.getElementById('type-filter');
        const sizeFilter = document.getElementById('size-filter');
        const sortFilter = document.getElementById('sort-filter');
        const clearFilters = document.getElementById('clear-filters');

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.type = e.target.value;
                this.applyFilters();
            });
        }

        if (sizeFilter) {
            sizeFilter.addEventListener('change', (e) => {
                this.filters.size = e.target.value;
                this.applyFilters();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applyFilters();
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
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
                this.filteredFiles = [];
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
        const fileCount = document.getElementById('file-count');
        if (!fileList) return;

        // Use filtered files for rendering
        const filesToRender = this.filteredFiles.length > 0 ? this.filteredFiles : this.markdownFiles;

        if (filesToRender.length === 0) {
            if (this.markdownFiles.length === 0) {
                fileList.innerHTML = '<p class="text-gray-500 col-span-full">공유된 여행 계획이 없습니다.</p>';
            } else {
                fileList.innerHTML = '<p class="text-gray-500 col-span-full">검색 조건에 맞는 파일이 없습니다.</p>';
            }
            if (fileCount) fileCount.textContent = '0';
            return;
        }

        if (fileCount) fileCount.textContent = filesToRender.length;

        fileList.innerHTML = filesToRender.map(file => `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center cursor-pointer" onclick="tripFlowViewer.openFile('${file.name}')">
                        <svg class="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                        <h3 class="font-medium text-gray-900">${file.name}</h3>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="tripFlowViewer.downloadFile('${file.name}')" class="text-green-500 hover:text-green-700 p-1 rounded" title="다운로드">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </button>
                        <button onclick="tripFlowViewer.deleteFile('${file.name}')" class="text-red-500 hover:text-red-700 p-1 rounded" title="삭제">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
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
                this.currentFile = filename;
                this.originalContent = content;
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
        this.exitEditMode();
    }

    startEditing() {
        if (!this.currentFile) return;

        this.isEditing = true;
        const contentElement = document.getElementById('markdown-content');
        const editorContainer = document.getElementById('editor-container');
        const editor = document.getElementById('file-editor');
        const editBtn = document.getElementById('edit-btn');
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        // Hide content, show editor
        if (contentElement) contentElement.classList.add('hidden');
        if (editorContainer) editorContainer.classList.remove('hidden');
        
        // Update buttons
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) saveBtn.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        // Set editor content
        if (editor) {
            editor.value = this.originalContent;
            editor.focus();
        }
    }

    cancelEditing() {
        this.exitEditMode();
    }

    exitEditMode() {
        this.isEditing = false;
        const contentElement = document.getElementById('markdown-content');
        const editorContainer = document.getElementById('editor-container');
        const editBtn = document.getElementById('edit-btn');
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        // Show content, hide editor
        if (contentElement) contentElement.classList.remove('hidden');
        if (editorContainer) editorContainer.classList.add('hidden');
        
        // Update buttons
        if (editBtn) editBtn.classList.remove('hidden');
        if (saveBtn) saveBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    async saveFile() {
        if (!this.currentFile) return;

        const editor = document.getElementById('file-editor');
        if (!editor) return;

        const newContent = editor.value;
        
        try {
            const response = await fetch(`/api/files/${this.currentFile}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newContent
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.originalContent = newContent;
                this.displayMarkdown(this.currentFile, newContent);
                this.exitEditMode();
                this.showSuccess('파일이 성공적으로 저장되었습니다.');
            } else {
                this.showError(result.message || '파일 저장 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    downloadFile(filename) {
        // Create a download link with the download parameter
        const downloadUrl = `/api/files/${filename}?download=true`;
        
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess(`파일 다운로드가 시작되었습니다: ${filename}`);
    }

    applyFilters() {
        let filtered = [...this.markdownFiles];
        console.log('🔍 Applying filters:', this.filters);
        console.log('📁 Original files count:', this.markdownFiles.length);

        // Search filter
        if (this.filters.search && this.filters.search.length > 0) {
            const searchTerms = this.filters.search.split(' ').filter(term => term.length > 0);
            console.log('🔎 Search terms:', searchTerms);
            
            filtered = filtered.filter(file => {
                const fileName = file.name.toLowerCase();
                const matches = searchTerms.every(term => fileName.includes(term));
                if (matches) {
                    console.log('✅ Match found:', file.name);
                }
                return matches;
            });
            console.log('📊 After search filter:', filtered.length);
        }

        // Type filter
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(file => {
                const fileName = file.name.toLowerCase();
                const lastDotIndex = fileName.lastIndexOf('.');
                
                if (lastDotIndex === -1) {
                    // No extension
                    return this.filters.type === 'txt';
                }
                
                const extension = fileName.substring(lastDotIndex + 1);
                
                if (this.filters.type === 'md') {
                    return extension === 'md' || extension === 'markdown';
                } else if (this.filters.type === 'txt') {
                    return extension === 'txt';
                }
                return true;
            });
        }

        // Size filter
        if (this.filters.size !== 'all') {
            filtered = filtered.filter(file => {
                const size = file.size;
                switch (this.filters.size) {
                    case 'small':
                        return size < 1024; // < 1KB
                    case 'medium':
                        return size >= 1024 && size < 102400; // 1KB - 100KB
                    case 'large':
                        return size >= 102400; // > 100KB
                    default:
                        return true;
                }
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.filters.sort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size; // Descending order
                case 'date':
                    // Since we don't have date info in the current structure, use name as fallback
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        this.filteredFiles = filtered;
        this.renderFileList();
    }

    clearAllFilters() {
        this.filters = {
            search: '',
            type: 'all',
            size: 'all',
            sort: 'name'
        };

        // Reset UI elements
        const searchInput = document.getElementById('search-input');
        const typeFilter = document.getElementById('type-filter');
        const sizeFilter = document.getElementById('size-filter');
        const sortFilter = document.getElementById('sort-filter');

        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = 'all';
        if (sizeFilter) sizeFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'name';

        this.filteredFiles = [];
        this.renderFileList();
    }

    // Test function for search functionality
    testSearchFunctionality() {
        console.log('🧪 Testing search functionality...');
        
        // Test with sample data
        const testFiles = [
            { name: 'my-trip-plan.md', size: 1024 },
            { name: 'vacation-notes.txt', size: 512 },
            { name: 'travel-guide.md', size: 2048 },
            { name: 'hotel-booking.txt', size: 256 },
            { name: 'flight-details.md', size: 1536 }
        ];
        
        console.log('📁 Test files:', testFiles);
        
        // Test search scenarios
        const testCases = [
            { search: 'trip', expected: ['my-trip-plan.md'] },
            { search: 'md', expected: ['my-trip-plan.md', 'travel-guide.md', 'flight-details.md'] },
            { search: 'txt', expected: ['vacation-notes.txt', 'hotel-booking.txt'] },
            { search: 'travel guide', expected: ['travel-guide.md'] },
            { search: 'hotel booking', expected: ['hotel-booking.txt'] },
            { search: 'xyz', expected: [] }
        ];
        
        testCases.forEach((testCase, index) => {
            console.log(`\n🧪 Test case ${index + 1}: "${testCase.search}"`);
            
            // Simulate search
            const searchTerms = testCase.search.split(' ').filter(term => term.length > 0);
            const results = testFiles.filter(file => {
                const fileName = file.name.toLowerCase();
                return searchTerms.every(term => fileName.includes(term));
            });
            
            console.log('Expected:', testCase.expected);
            console.log('Actual:', results.map(f => f.name));
            console.log('✅ Test passed:', JSON.stringify(results.map(f => f.name)) === JSON.stringify(testCase.expected));
        });
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
        
        // Add test function to global scope for testing
        window.testSearch = () => {
            window.tripFlowViewer.testSearchFunctionality();
        };
        
        console.log('🚀 TripFlow Viewer initialized');
        console.log('🧪 Run testSearch() in console to test search functionality');
    } catch (error) {
        console.error('TripFlow Viewer initialization error:', error);
    }
});