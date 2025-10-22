// TripFlow Expense Tracker
class ExpenseTracker {
    constructor() {
        this.expenses = [];
        this.budget = 0;
        this.currentFilter = 'all';
        this.categoryChart = null;
        this.dailyChart = null;
        this.exchangeRates = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExchangeRates();
        this.loadExpenses();
        this.loadBudget();
        this.updateSummary();
    }

    setupEventListeners() {
        // Expense form submission
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExpense();
            });
        }

        // Budget setting
        const setBudgetBtn = document.getElementById('set-budget');
        if (setBudgetBtn) {
            setBudgetBtn.addEventListener('click', () => {
                this.setBudget();
            });
        }

        // Filter buttons
        const filterButtons = ['filter-all', 'filter-food', 'filter-transport', 'filter-accommodation', 'filter-other'];
        filterButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.setFilter(buttonId.replace('filter-', ''));
                });
            }
        });

        // Currency conversion
        const amountInput = document.getElementById('expense-amount');
        const currencySelect = document.getElementById('expense-currency');
        
        if (amountInput && currencySelect) {
            amountInput.addEventListener('input', () => this.updateCurrencyConversion());
            currencySelect.addEventListener('change', () => this.updateCurrencyConversion());
        }
    }

    async loadExpenses() {
        try {
            const response = await fetch('http://localhost:8080/api/expenses');
            if (response.ok) {
                const data = await response.json();
                this.expenses = data.expenses || [];
                this.updateExpenseList();
                this.updateCharts();
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showError('지출 내역을 불러오는데 실패했습니다.');
        }
    }

    async loadBudget() {
        try {
            const response = await fetch('http://localhost:8080/api/expenses/budget');
            if (response.ok) {
                const data = await response.json();
                this.budget = data.budget || 0;
                this.updateSummary();
            }
        } catch (error) {
            console.error('Error loading budget:', error);
        }
    }

    async addExpense() {
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const currency = document.getElementById('expense-currency').value;
        const category = document.getElementById('expense-category').value;
        const description = document.getElementById('expense-description').value;

        if (!amount || !category || !description) {
            this.showError('모든 필드를 입력해주세요.');
            return;
        }

        // Convert to KRW if not already
        let krwAmount = amount;
        if (currency !== 'KRW') {
            krwAmount = this.convertToKRW(amount, currency);
        }

        const expense = {
            amount: krwAmount,
            originalAmount: amount,
            originalCurrency: currency,
            category: category,
            description: description,
            date: new Date().toISOString(),
            id: Date.now().toString()
        };

        try {
            const response = await fetch('http://localhost:8080/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expense)
            });

            if (response.ok) {
                this.expenses.push(expense);
                this.updateExpenseList();
                this.updateSummary();
                this.updateCharts();
                this.clearForm();
                this.showSuccess('지출이 추가되었습니다.');
            } else {
                throw new Error('Failed to add expense');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            this.showError('지출 추가에 실패했습니다.');
        }
    }

    async setBudget() {
        const budgetAmount = parseFloat(document.getElementById('budget-amount').value);
        
        if (!budgetAmount || budgetAmount <= 0) {
            this.showError('올바른 예산 금액을 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/expenses/budget', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ budget: budgetAmount })
            });

            if (response.ok) {
                this.budget = budgetAmount;
                this.updateSummary();
                document.getElementById('budget-amount').value = '';
                this.showSuccess('예산이 설정되었습니다.');
            } else {
                throw new Error('Failed to set budget');
            }
        } catch (error) {
            console.error('Error setting budget:', error);
            this.showError('예산 설정에 실패했습니다.');
        }
    }

    async deleteExpense(expenseId) {
        try {
            const response = await fetch(`http://localhost:8080/api/expenses/${expenseId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.expenses = this.expenses.filter(expense => expense.id !== expenseId);
                this.updateExpenseList();
                this.updateSummary();
                this.updateCharts();
                this.showSuccess('지출이 삭제되었습니다.');
            } else {
                throw new Error('Failed to delete expense');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showError('지출 삭제에 실패했습니다.');
        }
    }

    updateExpenseList() {
        const expenseList = document.getElementById('expense-list');
        if (!expenseList) return;

        const filteredExpenses = this.getFilteredExpenses();
        
        if (filteredExpenses.length === 0) {
            expenseList.innerHTML = '<div class="text-center text-gray-500 py-8">등록된 지출이 없습니다.</div>';
            return;
        }

        expenseList.innerHTML = filteredExpenses.map(expense => `
            <div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${this.getCategoryColor(expense.category)}">
                        <i class="fas ${this.getCategoryIcon(expense.category)}"></i>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">${expense.description}</h4>
                        <p class="text-sm text-gray-500">${this.getCategoryName(expense.category)} • ${this.formatDate(expense.date)}</p>
                        ${expense.originalCurrency && expense.originalCurrency !== 'KRW' ? 
                            `<p class="text-xs text-blue-600">${this.getCurrencySymbol(expense.originalCurrency)}${this.formatNumber(expense.originalAmount)} → ₩${this.formatNumber(expense.amount)}</p>` : 
                            ''
                        }
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-lg font-bold text-gray-900">₩${this.formatNumber(expense.amount)}</span>
                    <button onclick="expenseTracker.deleteExpense('${expense.id}')" 
                            class="text-red-600 hover:text-red-800 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateSummary() {
        const totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = this.budget - totalSpent;

        document.getElementById('total-budget').textContent = `₩${this.formatNumber(this.budget)}`;
        document.getElementById('total-spent').textContent = `₩${this.formatNumber(totalSpent)}`;
        document.getElementById('remaining-budget').textContent = `₩${this.formatNumber(remaining)}`;

        // Update remaining budget color based on amount
        const remainingElement = document.getElementById('remaining-budget');
        if (remaining < 0) {
            remainingElement.className = 'text-2xl font-bold text-red-600';
        } else if (remaining < this.budget * 0.2) {
            remainingElement.className = 'text-2xl font-bold text-yellow-600';
        } else {
            remainingElement.className = 'text-2xl font-bold text-green-600';
        }
    }

    updateCharts() {
        this.updateCategoryChart();
        this.updateDailyChart();
    }

    updateCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        const categoryData = this.getCategoryData();
        
        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: categoryData.colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateDailyChart() {
        const ctx = document.getElementById('daily-chart');
        if (!ctx) return;

        if (this.dailyChart) {
            this.dailyChart.destroy();
        }

        const dailyData = this.getDailyData();
        
        this.dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.labels,
                datasets: [{
                    label: '일별 지출',
                    data: dailyData.data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₩' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    getCategoryData() {
        const categories = {};
        this.expenses.forEach(expense => {
            if (categories[expense.category]) {
                categories[expense.category] += expense.amount;
            } else {
                categories[expense.category] = expense.amount;
            }
        });

        const labels = Object.keys(categories).map(cat => this.getCategoryName(cat));
        const data = Object.values(categories);
        const colors = Object.keys(categories).map(cat => this.getCategoryColor(cat, true));

        return { labels, data, colors };
    }

    getDailyData() {
        const dailyExpenses = {};
        this.expenses.forEach(expense => {
            const date = new Date(expense.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            if (dailyExpenses[date]) {
                dailyExpenses[date] += expense.amount;
            } else {
                dailyExpenses[date] = expense.amount;
            }
        });

        const labels = Object.keys(dailyExpenses).sort();
        const data = labels.map(date => dailyExpenses[date]);

        return { labels, data };
    }

    getFilteredExpenses() {
        if (this.currentFilter === 'all') {
            return this.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        return this.expenses
            .filter(expense => expense.category === this.currentFilter)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        const filterButtons = ['filter-all', 'filter-food', 'filter-transport', 'filter-accommodation', 'filter-other'];
        filterButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                if (buttonId === `filter-${filter}`) {
                    button.className = 'px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors';
                } else {
                    button.className = 'px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors';
                }
            }
        });

        this.updateExpenseList();
    }

    getCategoryName(category) {
        const names = {
            'food': '식비',
            'transport': '교통비',
            'accommodation': '숙박비',
            'shopping': '쇼핑',
            'entertainment': '엔터테인먼트',
            'sightseeing': '관광',
            'other': '기타'
        };
        return names[category] || '기타';
    }

    getCategoryIcon(category) {
        const icons = {
            'food': 'fa-utensils',
            'transport': 'fa-car',
            'accommodation': 'fa-bed',
            'shopping': 'fa-shopping-bag',
            'entertainment': 'fa-ticket-alt',
            'sightseeing': 'fa-camera',
            'other': 'fa-receipt'
        };
        return icons[category] || 'fa-receipt';
    }

    getCategoryColor(category, isHex = false) {
        const colors = {
            'food': isHex ? '#ef4444' : 'bg-red-100 text-red-600',
            'transport': isHex ? '#3b82f6' : 'bg-blue-100 text-blue-600',
            'accommodation': isHex ? '#10b981' : 'bg-green-100 text-green-600',
            'shopping': isHex ? '#f59e0b' : 'bg-yellow-100 text-yellow-600',
            'entertainment': isHex ? '#8b5cf6' : 'bg-purple-100 text-purple-600',
            'sightseeing': isHex ? '#06b6d4' : 'bg-cyan-100 text-cyan-600',
            'other': isHex ? '#6b7280' : 'bg-gray-100 text-gray-600'
        };
        return colors[category] || colors['other'];
    }

    getCurrencySymbol(currency) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'JPY': '¥',
            'CNY': '¥',
            'GBP': '£',
            'AUD': '$',
            'CAD': '$',
            'KRW': '₩'
        };
        return symbols[currency] || currency;
    }

    formatNumber(number) {
        return new Intl.NumberFormat('ko-KR').format(number);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadExchangeRates() {
        try {
            const response = await fetch('http://localhost:8080/api/exchange/rates?base=KRW');
            if (response.ok) {
                const data = await response.json();
                this.exchangeRates = data.rates;
            }
        } catch (error) {
            console.error('Error loading exchange rates:', error);
        }
    }

    convertToKRW(amount, fromCurrency) {
        if (fromCurrency === 'KRW') return amount;
        if (!this.exchangeRates[fromCurrency]) return amount;
        
        // Convert from foreign currency to KRW
        return amount / this.exchangeRates[fromCurrency];
    }

    updateCurrencyConversion() {
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const currency = document.getElementById('expense-currency').value;
        const convertedDiv = document.getElementById('converted-amount');
        const krwAmountSpan = document.getElementById('krw-amount');

        if (!amount || currency === 'KRW') {
            convertedDiv.classList.add('hidden');
            return;
        }

        const krwAmount = this.convertToKRW(amount, currency);
        krwAmountSpan.textContent = `₩${this.formatNumber(Math.round(krwAmount))}`;
        convertedDiv.classList.remove('hidden');
    }

    clearForm() {
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-currency').value = 'KRW';
        document.getElementById('expense-category').value = '';
        document.getElementById('expense-description').value = '';
        document.getElementById('converted-amount').classList.add('hidden');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize expense tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseTracker = new ExpenseTracker();
});
