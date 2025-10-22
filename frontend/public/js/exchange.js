// TripFlow Exchange Rate Calculator
class ExchangeCalculator {
    constructor() {
        this.exchangeRates = {};
        this.chart = null;
        this.lastUpdated = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExchangeRates();
        this.initializeChart();
    }

    getApiBaseUrl() {
        // Check if we're in development (localhost) or production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        } else {
            // In production, use relative path or environment variable
            return window.location.origin;
        }
    }

    setupEventListeners() {
        // Calculate button
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateExchange());
        }

        // Currency selection changes
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        
        if (fromCurrency) {
            fromCurrency.addEventListener('change', () => this.updateCurrencySymbols());
        }
        
        if (toCurrency) {
            toCurrency.addEventListener('change', () => this.updateCurrencySymbols());
        }

        // Amount input
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.addEventListener('input', () => this.calculateExchange());
        }

        // Refresh rates button
        const refreshBtn = document.getElementById('refresh-rates');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadExchangeRates());
        }

        // Retry button
        const retryBtn = document.getElementById('retry-rates');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadExchangeRates());
        }

        // Popular currency pairs
        const popularPairs = document.querySelectorAll('[data-pair]');
        popularPairs.forEach(pair => {
            pair.addEventListener('click', () => {
                const [from, to] = pair.dataset.pair.split('-');
                this.setCurrencyPair(from, to);
            });
        });
    }

    async loadExchangeRates() {
        this.showLoading();
        
        try {
            // Get API base URL from environment or use relative path
            const apiBaseUrl = this.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/exchange/rates?base=KRW`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch exchange rates');
            }
            
            const data = await response.json();
            this.exchangeRates = data.rates;
            this.lastUpdated = new Date(data.date);
            
            this.displayRates();
            this.updatePopularPairs();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading exchange rates:', error);
            this.showError();
        }
    }

    showLoading() {
        const loading = document.getElementById('loading-rates');
        const ratesList = document.getElementById('rates-list');
        const errorRates = document.getElementById('error-rates');
        
        if (loading) loading.classList.remove('hidden');
        if (ratesList) ratesList.classList.add('hidden');
        if (errorRates) errorRates.classList.add('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading-rates');
        const ratesList = document.getElementById('rates-list');
        
        if (loading) loading.classList.add('hidden');
        if (ratesList) ratesList.classList.remove('hidden');
    }

    showError() {
        const loading = document.getElementById('loading-rates');
        const ratesList = document.getElementById('rates-list');
        const errorRates = document.getElementById('error-rates');
        
        if (loading) loading.classList.add('hidden');
        if (ratesList) ratesList.classList.add('hidden');
        if (errorRates) errorRates.classList.remove('hidden');
    }

    displayRates() {
        const ratesList = document.getElementById('rates-list');
        const lastUpdated = document.getElementById('last-updated');
        
        if (!ratesList) return;

        const popularCurrencies = ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'AUD', 'CAD'];
        const ratesHTML = popularCurrencies.map(currency => {
            const rate = this.exchangeRates[currency];
            if (!rate) return '';
            
            return `
                <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div class="flex items-center">
                        <span class="text-lg mr-2">${this.getCurrencyFlag(currency)}</span>
                        <span class="font-medium">${currency}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold">${(1 / rate).toFixed(2)}</div>
                        <div class="text-sm text-gray-500">1 ${currency} = ${(1 / rate).toFixed(2)} KRW</div>
                    </div>
                </div>
            `;
        }).join('');

        ratesList.innerHTML = ratesHTML;
        
        if (lastUpdated) {
            lastUpdated.textContent = this.lastUpdated.toLocaleString('ko-KR');
        }
    }

    updatePopularPairs() {
        const pairs = [
            { id: 'usd-krw', from: 'USD', to: 'KRW' },
            { id: 'eur-krw', from: 'EUR', to: 'KRW' },
            { id: 'jpy-krw', from: 'JPY', to: 'KRW' }
        ];

        pairs.forEach(pair => {
            const rateElement = document.getElementById(`${pair.from.toLowerCase()}-${pair.to.toLowerCase()}-rate`);
            const changeElement = document.getElementById(`${pair.from.toLowerCase()}-${pair.to.toLowerCase()}-change`);
            
            if (rateElement && this.exchangeRates[pair.from]) {
                const rate = this.exchangeRates[pair.from];
                rateElement.textContent = (1 / rate).toFixed(2);
            }
            
            if (changeElement) {
                changeElement.textContent = '실시간';
            }
        });
    }

    getCurrencyFlag(currency) {
        const flags = {
            'USD': '🇺🇸',
            'EUR': '🇪🇺',
            'JPY': '🇯🇵',
            'GBP': '🇬🇧',
            'CNY': '🇨🇳',
            'AUD': '🇦🇺',
            'CAD': '🇨🇦',
            'KRW': '🇰🇷'
        };
        return flags[currency] || '🏳️';
    }

    getCurrencySymbol(currency) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'JPY': '¥',
            'GBP': '£',
            'CNY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'KRW': '₩'
        };
        return symbols[currency] || currency;
    }

    updateCurrencySymbols() {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        const fromSymbol = document.getElementById('from-currency-symbol');
        const toSymbol = document.getElementById('to-currency-symbol');
        
        if (fromCurrency && fromSymbol) {
            fromSymbol.textContent = this.getCurrencySymbol(fromCurrency.value);
        }
        
        if (toCurrency && toSymbol) {
            toSymbol.textContent = this.getCurrencySymbol(toCurrency.value);
        }
    }

    calculateExchange() {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        const amountInput = document.getElementById('amount');
        const resultSection = document.getElementById('result-section');
        
        if (!fromCurrency || !toCurrency || !amountInput || !resultSection) return;
        
        const from = fromCurrency.value;
        const to = toCurrency.value;
        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount <= 0) {
            resultSection.classList.add('hidden');
            return;
        }
        
        // Calculate exchange rate
        let exchangeRate;
        if (from === 'KRW') {
            // From KRW to other currency
            exchangeRate = this.exchangeRates[to];
        } else if (to === 'KRW') {
            // From other currency to KRW
            exchangeRate = 1 / this.exchangeRates[from];
        } else {
            // Between two non-KRW currencies
            const fromToKRW = 1 / this.exchangeRates[from];
            const krwToTarget = this.exchangeRates[to];
            exchangeRate = fromToKRW * krwToTarget;
        }
        
        if (!exchangeRate) {
            this.showCalculationError();
            return;
        }
        
        const result = amount * exchangeRate;
        
        // Update result display
        this.updateResultDisplay(amount, result, from, to, exchangeRate);
        resultSection.classList.remove('hidden');
    }

    updateResultDisplay(amount, result, from, to, exchangeRate) {
        const resultAmount = document.getElementById('result-amount');
        const fromAmount = document.getElementById('from-amount');
        const resultAmountFull = document.getElementById('result-amount-full');
        const fromCurrencyCode = document.getElementById('from-currency-code');
        const toCurrencyCode = document.getElementById('to-currency-code');
        const fromCurrencyCode2 = document.getElementById('from-currency-code-2');
        const toCurrencyCode2 = document.getElementById('to-currency-code-2');
        const exchangeRateDisplay = document.getElementById('exchange-rate');
        
        if (resultAmount) resultAmount.textContent = result.toFixed(2);
        if (fromAmount) fromAmount.textContent = amount.toLocaleString();
        if (resultAmountFull) resultAmountFull.textContent = result.toFixed(2);
        if (fromCurrencyCode) fromCurrencyCode.textContent = from;
        if (toCurrencyCode) toCurrencyCode.textContent = to;
        if (fromCurrencyCode2) fromCurrencyCode2.textContent = from;
        if (toCurrencyCode2) toCurrencyCode2.textContent = to;
        if (exchangeRateDisplay) exchangeRateDisplay.textContent = exchangeRate.toFixed(6);
    }

    showCalculationError() {
        const resultSection = document.getElementById('result-section');
        if (resultSection) {
            resultSection.innerHTML = `
                <div class="text-center text-red-600">
                    <p>환율 정보를 불러올 수 없습니다.</p>
                    <p class="text-sm">잠시 후 다시 시도해주세요.</p>
                </div>
            `;
            resultSection.classList.remove('hidden');
        }
    }

    setCurrencyPair(from, to) {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        
        if (fromCurrency) fromCurrency.value = from;
        if (toCurrency) toCurrency.value = to;
        
        this.updateCurrencySymbols();
        this.calculateExchange();
    }

    initializeChart() {
        const ctx = document.getElementById('exchange-chart');
        if (!ctx) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'USD/KRW',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
        
        // Generate sample data for demonstration
        this.generateSampleChartData();
    }

    generateSampleChartData() {
        if (!this.chart) return;
        
        const labels = [];
        const data = [];
        const today = new Date();
        
        // Generate last 7 days of data
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }));
            
            // Generate realistic USD/KRW rate around 1300-1400
            const baseRate = 1350;
            const variation = (Math.random() - 0.5) * 20;
            data.push(baseRate + variation);
        }
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }
}

// Initialize the exchange calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExchangeCalculator();
});

// Utility functions
window.ExchangeUtils = {
    formatCurrency: (amount, currency) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    formatNumber: (number) => {
        return new Intl.NumberFormat('ko-KR').format(number);
    }
};
