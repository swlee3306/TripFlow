// TripFlow World Time Display
class WorldTimeDisplay {
    constructor() {
        this.currentTimezone = 'Asia/Seoul';
        this.majorCities = [
            { name: '서울', timezone: 'Asia/Seoul', country: '🇰🇷', flag: '🇰🇷' },
            { name: '뉴욕', timezone: 'America/New_York', country: '🇺🇸', flag: '🇺🇸' },
            { name: '로스앤젤레스', timezone: 'America/Los_Angeles', country: '🇺🇸', flag: '🇺🇸' },
            { name: '런던', timezone: 'Europe/London', country: '🇬🇧', flag: '🇬🇧' },
            { name: '파리', timezone: 'Europe/Paris', country: '🇫🇷', flag: '🇫🇷' },
            { name: '베를린', timezone: 'Europe/Berlin', country: '🇩🇪', flag: '🇩🇪' },
            { name: '도쿄', timezone: 'Asia/Tokyo', country: '🇯🇵', flag: '🇯🇵' },
            { name: '상하이', timezone: 'Asia/Shanghai', country: '🇨🇳', flag: '🇨🇳' },
            { name: '홍콩', timezone: 'Asia/Hong_Kong', country: '🇭🇰', flag: '🇭🇰' },
            { name: '싱가포르', timezone: 'Asia/Singapore', country: '🇸🇬', flag: '🇸🇬' },
            { name: '시드니', timezone: 'Australia/Sydney', country: '🇦🇺', flag: '🇦🇺' },
            { name: '멜버른', timezone: 'Australia/Melbourne', country: '🇦🇺', flag: '🇦🇺' },
            { name: '토론토', timezone: 'America/Toronto', country: '🇨🇦', flag: '🇨🇦' },
            { name: '밴쿠버', timezone: 'America/Vancouver', country: '🇨🇦', flag: '🇨🇦' },
            { name: '상파울루', timezone: 'America/Sao_Paulo', country: '🇧🇷', flag: '🇧🇷' },
            { name: '두바이', timezone: 'Asia/Dubai', country: '🇦🇪', flag: '🇦🇪' },
            { name: '뭄바이', timezone: 'Asia/Kolkata', country: '🇮🇳', flag: '🇮🇳' },
            { name: '카이로', timezone: 'Africa/Cairo', country: '🇪🇬', flag: '🇪🇬' },
            { name: '요하네스버그', timezone: 'Africa/Johannesburg', country: '🇿🇦', flag: '🇿🇦' },
            { name: '오클랜드', timezone: 'Pacific/Auckland', country: '🇳🇿', flag: '🇳🇿' }
        ];
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCurrentTime();
        this.displayMajorCities();
        this.startTimeUpdate();
    }

    setupEventListeners() {
        // Timezone selector
        const timezoneSelect = document.getElementById('timezone-select');
        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', (e) => {
                this.currentTimezone = e.target.value;
                this.updateCurrentTime();
            });
        }

        // Custom timezone input
        const customTimezone = document.getElementById('custom-timezone');
        const applyButton = document.getElementById('apply-timezone');
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                const customTz = customTimezone.value.trim();
                if (customTz) {
                    this.currentTimezone = customTz;
                    this.updateCurrentTime();
                }
            });
        }

        if (customTimezone) {
            customTimezone.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const customTz = customTimezone.value.trim();
                    if (customTz) {
                        this.currentTimezone = customTz;
                        this.updateCurrentTime();
                    }
                }
            });
        }
    }

    updateCurrentTime() {
        try {
            const now = new Date();
            const timeInTimezone = new Date(now.toLocaleString("en-US", {timeZone: this.currentTimezone}));
            
            // Update time display
            const timeDisplay = document.getElementById('time-display');
            const dateDisplay = document.getElementById('date-display');
            const timezoneDisplay = document.getElementById('timezone-display');
            
            if (timeDisplay) {
                timeDisplay.textContent = timeInTimezone.toLocaleTimeString('ko-KR', {
                    timeZone: this.currentTimezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            
            if (dateDisplay) {
                dateDisplay.textContent = timeInTimezone.toLocaleDateString('ko-KR', {
                    timeZone: this.currentTimezone,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                });
            }
            
            if (timezoneDisplay) {
                const timezoneName = this.getTimezoneName(this.currentTimezone);
                timezoneDisplay.textContent = timezoneName;
            }
            
            // Update analog clock hands
            this.updateAnalogClock(timeInTimezone);
        } catch (error) {
            console.error('Error updating time:', error);
            this.showTimeError();
        }
    }

    updateAnalogClock(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        // Calculate angles for clock hands
        const hourAngle = (hours % 12) * 30 + (minutes * 0.5); // 30 degrees per hour + minute adjustment
        const minuteAngle = minutes * 6; // 6 degrees per minute
        const secondAngle = seconds * 6; // 6 degrees per second
        
        // Update clock hands
        const hourHand = document.getElementById('hour-hand');
        const minuteHand = document.getElementById('minute-hand');
        const secondHand = document.getElementById('second-hand');
        
        if (hourHand) {
            hourHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${hourAngle}deg)`;
        }
        
        if (minuteHand) {
            minuteHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${minuteAngle}deg)`;
        }
        
        if (secondHand) {
            secondHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${secondAngle}deg)`;
        }
    }

    getTimezoneName(timezone) {
        const timezoneNames = {
            'Asia/Seoul': '대한민국 표준시 (KST)',
            'America/New_York': '동부 표준시 (EST/EDT)',
            'America/Los_Angeles': '태평양 표준시 (PST/PDT)',
            'Europe/London': '그리니치 표준시 (GMT/BST)',
            'Europe/Paris': '중앙 유럽 표준시 (CET/CEST)',
            'Europe/Berlin': '중앙 유럽 표준시 (CET/CEST)',
            'Asia/Tokyo': '일본 표준시 (JST)',
            'Asia/Shanghai': '중국 표준시 (CST)',
            'Asia/Hong_Kong': '홍콩 표준시 (HKT)',
            'Asia/Singapore': '싱가포르 표준시 (SGT)',
            'Australia/Sydney': '호주 동부 표준시 (AEST/AEDT)',
            'Australia/Melbourne': '호주 동부 표준시 (AEST/AEDT)',
            'America/Toronto': '동부 표준시 (EST/EDT)',
            'America/Vancouver': '태평양 표준시 (PST/PDT)',
            'America/Sao_Paulo': '브라질 표준시 (BRT)',
            'Asia/Dubai': '걸프 표준시 (GST)',
            'Asia/Mumbai': '인도 표준시 (IST)',
            'Africa/Cairo': '동부 유럽 표준시 (EET)',
            'Africa/Johannesburg': '남아프리카 표준시 (SAST)',
            'Pacific/Auckland': '뉴질랜드 표준시 (NZST/NZDT)'
        };
        
        return timezoneNames[timezone] || `${timezone} 시간대`;
    }

    showTimeError() {
        const timeDisplay = document.getElementById('time-display');
        const dateDisplay = document.getElementById('date-display');
        const timezoneDisplay = document.getElementById('timezone-display');
        
        if (timeDisplay) timeDisplay.textContent = '--:--:--';
        if (dateDisplay) dateDisplay.textContent = '시간대 오류';
        if (timezoneDisplay) timezoneDisplay.textContent = '유효하지 않은 시간대';
    }

    startTimeUpdate() {
        // Update every second
        this.updateInterval = setInterval(() => {
            this.updateCurrentTime();
            this.updateMajorCities();
        }, 1000);
    }

    displayMajorCities() {
        const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4.gap-4');
        if (!container) return;

        container.innerHTML = this.majorCities.map(city => `
            <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors" data-timezone="${city.timezone}">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-2">${city.flag}</span>
                        <div>
                            <div class="font-medium text-gray-900">${city.name}</div>
                            <div class="text-sm text-gray-500">${city.country}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg" data-time="${city.timezone}">--:--:--</div>
                        <div class="text-sm text-gray-500" data-date="${city.timezone}">--월 --일</div>
                    </div>
                </div>
                <!-- Mini Analog Clock -->
                <div class="flex justify-center">
                    <div class="relative w-16 h-16">
                        <div class="absolute inset-0 rounded-full border-2 border-gray-300 bg-white shadow-sm">
                            <!-- Mini Clock Numbers -->
                            <div class="absolute inset-0">
                                <div class="absolute top-0.5 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600">12</div>
                                <div class="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-600">3</div>
                                <div class="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600">6</div>
                                <div class="absolute left-0.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-600">9</div>
                            </div>
                            
                            <!-- Mini Clock Hands -->
                            <div class="absolute inset-0">
                                <!-- Hour Hand -->
                                <div class="absolute w-0.5 h-6 bg-gray-700 rounded-full origin-bottom" data-hour-hand="${city.timezone}" style="transform-origin: bottom center; left: 50%; top: 50%; transform: translateX(-50%) translateY(-100%) rotate(0deg);"></div>
                                <!-- Minute Hand -->
                                <div class="absolute w-0.5 h-8 bg-gray-500 rounded-full origin-bottom" data-minute-hand="${city.timezone}" style="transform-origin: bottom center; left: 50%; top: 50%; transform: translateX(-50%) translateY(-100%) rotate(0deg);"></div>
                                <!-- Second Hand -->
                                <div class="absolute w-px h-8 bg-red-400 rounded-full origin-bottom" data-second-hand="${city.timezone}" style="transform-origin: bottom center; left: 50%; top: 50%; transform: translateX(-50%) translateY(-100%) rotate(0deg);"></div>
                                <!-- Center Dot -->
                                <div class="absolute w-1 h-1 bg-gray-700 rounded-full" style="left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for city selection
        container.querySelectorAll('[data-timezone]').forEach(element => {
            element.addEventListener('click', () => {
                const timezone = element.dataset.timezone;
                this.currentTimezone = timezone;
                document.getElementById('timezone-select').value = timezone;
                this.updateCurrentTime();
            });
        });
    }

    updateMajorCities() {
        this.majorCities.forEach(city => {
            try {
                const now = new Date();
                const timeInCity = new Date(now.toLocaleString("en-US", {timeZone: city.timezone}));
                
                const timeElement = document.querySelector(`[data-time="${city.timezone}"]`);
                const dateElement = document.querySelector(`[data-date="${city.timezone}"]`);
                
                if (timeElement) {
                    timeElement.textContent = timeInCity.toLocaleTimeString('ko-KR', {
                        timeZone: city.timezone,
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }
                
                if (dateElement) {
                    dateElement.textContent = timeInCity.toLocaleDateString('ko-KR', {
                        timeZone: city.timezone,
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                // Update mini analog clock for this city
                this.updateMiniClock(city.timezone, timeInCity);
            } catch (error) {
                console.error(`Error updating time for ${city.name}:`, error);
            }
        });
    }

    updateMiniClock(timezone, date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        // Calculate angles for mini clock hands
        const hourAngle = (hours % 12) * 30 + (minutes * 0.5);
        const minuteAngle = minutes * 6;
        const secondAngle = seconds * 6;
        
        // Update mini clock hands
        const hourHand = document.querySelector(`[data-hour-hand="${timezone}"]`);
        const minuteHand = document.querySelector(`[data-minute-hand="${timezone}"]`);
        const secondHand = document.querySelector(`[data-second-hand="${timezone}"]`);
        
        if (hourHand) {
            hourHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${hourAngle}deg)`;
        }
        
        if (minuteHand) {
            minuteHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${minuteAngle}deg)`;
        }
        
        if (secondHand) {
            secondHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${secondAngle}deg)`;
        }
    }

    // Utility function to format time with timezone
    formatTimeWithTimezone(date, timezone) {
        return new Intl.DateTimeFormat('ko-KR', {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long'
        }).format(date);
    }

    // Get time difference between two timezones
    getTimeDifference(timezone1, timezone2) {
        const now = new Date();
        const time1 = new Date(now.toLocaleString("en-US", {timeZone: timezone1}));
        const time2 = new Date(now.toLocaleString("en-US", {timeZone: timezone2}));
        
        const diffMs = time1.getTime() - time2.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return { hours: diffHours, minutes: diffMinutes };
    }

    // Clean up when page is unloaded
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize the world time display when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.worldTimeDisplay = new WorldTimeDisplay();
});

// Clean up when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.worldTimeDisplay) {
        window.worldTimeDisplay.destroy();
    }
});

// Utility functions for external use
window.WorldTimeUtils = {
    // Get current time in specific timezone
    getCurrentTime: (timezone) => {
        return new Date().toLocaleString('ko-KR', { timeZone: timezone });
    },
    
    // Get time difference between timezones
    getTimeDifference: (timezone1, timezone2) => {
        const now = new Date();
        const time1 = new Date(now.toLocaleString("en-US", {timeZone: timezone1}));
        const time2 = new Date(now.toLocaleString("en-US", {timeZone: timezone2}));
        
        const diffMs = time1.getTime() - time2.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        return diffHours;
    },
    
    // Format time for display
    formatTime: (date, timezone, options = {}) => {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        return new Intl.DateTimeFormat('ko-KR', {
            timeZone: timezone,
            ...defaultOptions,
            ...options
        }).format(date);
    }
};
