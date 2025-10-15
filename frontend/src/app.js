// TripFlow Frontend Application
class TripFlowApp {
    constructor() {
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // File input change event
        const fileInput = document.getElementById('file-upload');
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.getElementById('upload-btn');
        const removeFileBtn = document.getElementById('remove-file');

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Upload area click to trigger file input
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Upload button click
        uploadBtn.addEventListener('click', () => {
            this.uploadFile();
        });

        // Remove file button
        removeFileBtn.addEventListener('click', () => {
            this.removeFile();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['.md', '.markdown'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showStatus('error', '마크다운 파일만 업로드 가능합니다. (.md, .markdown)');
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showStatus('error', '파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.enableUploadButton();
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        
        fileInfo.classList.remove('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    enableUploadButton() {
        const uploadBtn = document.getElementById('upload-btn');
        const uploadText = document.getElementById('upload-text');
        
        uploadBtn.disabled = false;
        uploadText.textContent = '업로드하기';
    }

    removeFile() {
        this.selectedFile = null;
        
        // Hide file info
        document.getElementById('file-info').classList.add('hidden');
        
        // Reset file input
        document.getElementById('file-upload').value = '';
        
        // Disable upload button
        const uploadBtn = document.getElementById('upload-btn');
        const uploadText = document.getElementById('upload-text');
        
        uploadBtn.disabled = true;
        uploadText.textContent = '파일을 선택해주세요';
        
        // Clear status messages
        this.clearStatusMessages();
    }

    async uploadFile() {
        if (!this.selectedFile) {
            this.showStatus('error', '업로드할 파일을 선택해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('file', this.selectedFile);

        // Show upload progress
        this.showUploadProgress(true);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus('success', `파일이 성공적으로 업로드되었습니다! 파일 ID: ${result.fileId}`);
                this.resetUploadForm();
            } else {
                this.showStatus('error', result.message || '업로드 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            this.showUploadProgress(false);
        }
    }

    showUploadProgress(show) {
        const uploadBtn = document.getElementById('upload-btn');
        const uploadText = document.getElementById('upload-text');
        const uploadProgress = document.getElementById('upload-progress');

        if (show) {
            uploadBtn.disabled = true;
            uploadText.classList.add('hidden');
            uploadProgress.classList.remove('hidden');
        } else {
            uploadBtn.disabled = false;
            uploadText.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
        }
    }

    showStatus(type, message) {
        const statusContainer = document.getElementById('status-messages');
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-${type} mb-2`;
        statusDiv.textContent = message;
        
        statusContainer.appendChild(statusDiv);
        
        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.remove();
            }, 5000);
        }
    }

    clearStatusMessages() {
        const statusContainer = document.getElementById('status-messages');
        statusContainer.innerHTML = '';
    }

    resetUploadForm() {
        this.removeFile();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TripFlowApp();
});

// Utility functions for future use
window.TripFlowUtils = {
    // Format date for display
    formatDate: (date) => {
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },

    // Copy text to clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    },

    // Generate share URL
    generateShareUrl: (scheduleId) => {
        return `${window.location.origin}/s/${scheduleId}`;
    }
};
