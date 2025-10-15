// TripFlow Frontend Application
class TripFlowApp {
    constructor() {
        this.selectedFile = null;
        this.currentSchedule = null;
        this.isDarkMode = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupScheduleViewer();
        this.setupThemeToggle();
        this.setupTestButtons();
        this.loadTheme();
    }

    setupEventListeners() {
        // File input change event
        const fileInput = document.getElementById('file-upload');
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.getElementById('upload-btn');
        const removeFileBtn = document.getElementById('remove-file');

        fileInput.addEventListener('change', (e) => {
            this.processFiles(e.target.files);
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
                uploadArea.classList.add('dragover', 'border-indigo-500', 'bg-indigo-50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover', 'border-indigo-500', 'bg-indigo-50');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                this.processFiles(files);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    processFiles(fileList) {
        if (!fileList || fileList.length === 0) return;

        // Only process the first file
        const file = fileList[0];
        this.handleFileSelect(file);
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
        this.showProgressBar(true);

        try {
            // Simulate progress for better UX (since fetch doesn't provide upload progress)
            this.simulateProgress();

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
            this.showProgressBar(false);
        }
    }

    simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            this.updateProgress(progress);
            
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 200);
    }

    updateProgress(percentage) {
        const progressBar = document.getElementById('progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');
        
        if (progressBar && progressPercentage) {
            progressBar.style.width = `${percentage}%`;
            progressPercentage.textContent = `${Math.round(percentage)}%`;
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

    showProgressBar(show) {
        const progressContainer = document.getElementById('progress-container');
        
        if (show) {
            progressContainer.classList.remove('hidden');
        } else {
            progressContainer.classList.add('hidden');
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
        this.showProgressBar(false);
    }
}

    // Schedule Viewer Methods
    setupScheduleViewer() {
        const closeBtn = document.getElementById('close-schedule');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideScheduleViewer();
            });
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('tripflow-theme');
        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            document.documentElement.classList.add('dark');
            this.updateThemeIcon();
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('tripflow-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('tripflow-theme', 'light');
        }
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (this.isDarkMode) {
                // Sun icon for light mode
                themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
            } else {
                // Moon icon for dark mode
                themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
            }
        }
    }

    async fetchAndDisplaySchedule(scheduleId) {
        try {
            const response = await fetch(`/api/schedules/${scheduleId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const schedule = await response.json();
            this.currentSchedule = schedule;
            this.displayScheduleContent(schedule);
            this.showScheduleViewer();
            
        } catch (error) {
            console.error('Error fetching schedule:', error);
            this.showStatus('error', `스케줄을 불러오는데 실패했습니다: ${error.message}`);
        }
    }

    displayScheduleContent(schedule) {
        const titleElement = document.getElementById('schedule-title');
        const contentElement = document.getElementById('schedule-content-display');
        
        if (titleElement) {
            titleElement.textContent = schedule.title || '스케줄 보기';
        }
        
        if (contentElement) {
            let content = schedule.content || '';
            
            // Check if content is Markdown (simple heuristic)
            const isMarkdown = this.isMarkdownContent(content);
            
            if (isMarkdown) {
                // Convert Markdown to HTML using marked.js
                content = marked.parse(content);
            }
            
            // Sanitize HTML using DOMPurify
            content = DOMPurify.sanitize(content);
            
            // Apply custom styling classes
            contentElement.innerHTML = this.applyContentStyling(content);
        }
    }

    isMarkdownContent(content) {
        // Simple heuristic to detect Markdown
        const markdownPatterns = [
            /^#{1,6}\s+/m,           // Headers
            /\*\*.*\*\*/,           // Bold
            /\*.*\*/,               // Italic
            /^\s*[-*+]\s+/m,        // Lists
            /^\s*\d+\.\s+/m,        // Numbered lists
            /```[\s\S]*```/,        // Code blocks
            /`[^`]+`/,              // Inline code
            /\[.*\]\(.*\)/,         // Links
            /!\[.*\]\(.*\)/,        // Images
        ];
        
        return markdownPatterns.some(pattern => pattern.test(content));
    }

    applyContentStyling(content) {
        // Wrap content in styled container
        return `
            <div class="schedule-content-wrapper">
                ${content}
            </div>
        `;
    }

    showScheduleViewer() {
        const section = document.getElementById('schedule-content-section');
        if (section) {
            section.classList.remove('hidden');
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideScheduleViewer() {
        const section = document.getElementById('schedule-content-section');
        if (section) {
            section.classList.add('hidden');
        }
    }

    setupTestButtons() {
        const testScheduleBtn = document.getElementById('test-schedule-view');
        const testMarkdownBtn = document.getElementById('test-markdown-view');

        if (testScheduleBtn) {
            testScheduleBtn.addEventListener('click', () => {
                this.testScheduleView();
            });
        }

        if (testMarkdownBtn) {
            testMarkdownBtn.addEventListener('click', () => {
                this.testMarkdownView();
            });
        }
    }

    testScheduleView() {
        // Navigate to test schedule
        const scheduleId = 'dbea7f17-bd19-4913-9025-3905635c82b2';
        window.location.href = `/s/${scheduleId}`;
    }

    testMarkdownView() {
        // Show markdown test content
        const testMarkdown = `
# 제주도 3박 4일 여행

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

**총 예산: 500,000원**
        `;

        // Create a mock schedule object
        const mockSchedule = {
            title: '제주도 3박 4일 여행',
            description: '제주도 여행 계획',
            content: testMarkdown,
            created_at: new Date().toISOString(),
            share_count: 0
        };

        this.displayScheduleContent(mockSchedule);
        this.showScheduleViewer();
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
