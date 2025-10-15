class AdminDashboard {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8091/api';
        this.schedules = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentEditId = null;
        this.currentDeleteId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.checkAuth();
        this.loadSchedules();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterSchedules(e.target.value);
        });

        // Refresh
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadSchedules();
        });

        // Retry
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.loadSchedules();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadSchedules();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadSchedules();
            }
        });

        // Edit modal
        document.getElementById('close-edit-modal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSchedule();
        });

        // Delete modal
        document.getElementById('cancel-delete').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteSchedule();
        });
    }

    loadTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
    }

    async loadSchedules() {
        try {
            this.showLoading();
            const token = localStorage.getItem('admin_token');
            
            const response = await fetch(`${this.apiBaseUrl}/schedules?page=${this.currentPage}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.schedules = data.schedules || [];
            this.totalPages = Math.ceil(data.total / 10);
            
            this.renderSchedules();
            this.updateStats();
            this.updatePagination();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load schedules:', error);
            this.showError();
        }
    }

    renderSchedules() {
        const tbody = document.getElementById('schedules-tbody');
        tbody.innerHTML = '';

        this.schedules.forEach(schedule => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <i class="fas fa-calendar-alt text-blue-600 dark:text-blue-400"></i>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">${this.escapeHtml(schedule.title)}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${this.escapeHtml(schedule.description || '설명 없음')}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${schedule.is_public ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}">
                        ${schedule.is_public ? '공개' : '비공개'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${schedule.share_count || 0}회
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${this.formatDate(schedule.created_at)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="adminDashboard.editSchedule('${schedule.id}')" 
                                class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="adminDashboard.togglePublic('${schedule.id}', ${schedule.is_public})" 
                                class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                            <i class="fas fa-${schedule.is_public ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button onclick="adminDashboard.confirmDelete('${schedule.id}')" 
                                class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const totalSchedules = this.schedules.length;
        const publicSchedules = this.schedules.filter(s => s.is_public).length;
        const totalShares = this.schedules.reduce((sum, s) => sum + (s.share_count || 0), 0);

        document.getElementById('total-schedules').textContent = totalSchedules;
        document.getElementById('public-schedules').textContent = publicSchedules;
        document.getElementById('total-shares').textContent = totalShares;
    }

    updatePagination() {
        document.getElementById('pagination-info').textContent = 
            `페이지 ${this.currentPage} / ${this.totalPages}`;
        
        document.getElementById('prev-page').disabled = this.currentPage <= 1;
        document.getElementById('next-page').disabled = this.currentPage >= this.totalPages;
    }

    filterSchedules(query) {
        const rows = document.querySelectorAll('#schedules-tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    editSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return;

        this.currentEditId = id;
        document.getElementById('edit-title').value = schedule.title;
        document.getElementById('edit-description').value = schedule.description || '';
        document.getElementById('edit-is-public').checked = schedule.is_public;
        
        document.getElementById('edit-modal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.currentEditId = null;
    }

    async saveSchedule() {
        if (!this.currentEditId) return;

        try {
            const token = localStorage.getItem('admin_token');
            const formData = {
                title: document.getElementById('edit-title').value,
                description: document.getElementById('edit-description').value,
                is_public: document.getElementById('edit-is-public').checked
            };

            const response = await fetch(`${this.apiBaseUrl}/schedules/${this.currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.closeEditModal();
            this.loadSchedules();
            this.showNotification('스케줄이 성공적으로 업데이트되었습니다.', 'success');
        } catch (error) {
            console.error('Failed to save schedule:', error);
            this.showNotification('스케줄 저장 중 오류가 발생했습니다.', 'error');
        }
    }

    async togglePublic(id, currentStatus) {
        try {
            const token = localStorage.getItem('admin_token');
            const newStatus = !currentStatus;

            const response = await fetch(`${this.apiBaseUrl}/schedules/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_public: newStatus })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.loadSchedules();
            this.showNotification(`스케줄이 ${newStatus ? '공개' : '비공개'}로 설정되었습니다.`, 'success');
        } catch (error) {
            console.error('Failed to toggle public status:', error);
            this.showNotification('상태 변경 중 오류가 발생했습니다.', 'error');
        }
    }

    confirmDelete(id) {
        this.currentDeleteId = id;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    closeDeleteModal() {
        document.getElementById('delete-modal').classList.add('hidden');
        this.currentDeleteId = null;
    }

    async deleteSchedule() {
        if (!this.currentDeleteId) return;

        try {
            const token = localStorage.getItem('admin_token');

            const response = await fetch(`${this.apiBaseUrl}/schedules/${this.currentDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.closeDeleteModal();
            this.loadSchedules();
            this.showNotification('스케줄이 성공적으로 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            this.showNotification('스케줄 삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        window.location.href = 'index.html';
    }

    showLoading() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('schedules-container').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('schedules-container').classList.remove('hidden');
    }

    showError() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
        document.getElementById('schedules-container').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'} mr-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
