// Simple client-side router for TripFlow
class TripFlowRouter {
    constructor() {
        this.routes = new Map();
        this.init();
    }

    init() {
        // Define routes
        this.routes.set('/', 'index.html');
        this.routes.set('/s/:id', 'schedule.html');
        
        // Handle initial route
        this.handleRoute();
        
        // Listen for navigation events
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
    }

    handleRoute() {
        const path = window.location.pathname;
        
        // Check for /s/:id pattern
        const scheduleMatch = path.match(/^\/s\/([a-f0-9-]+)\/?$/);
        if (scheduleMatch) {
            this.loadSchedulePage(scheduleMatch[1]);
            return;
        }
        
        // Handle root path
        if (path === '/' || path === '') {
            this.loadIndexPage();
            return;
        }
        
        // Default to index for other paths
        this.loadIndexPage();
    }

    loadSchedulePage(scheduleId) {
        // Check if we're already on the schedule page
        if (document.title.includes('스케줄 보기')) {
            // Update the schedule ID in the current page
            if (window.PublicScheduleViewer && window.PublicScheduleViewer.instance) {
                window.PublicScheduleViewer.instance.scheduleId = scheduleId;
                window.PublicScheduleViewer.instance.fetchAndDisplaySchedule();
            }
            return;
        }
        
        // Load schedule.html
        this.loadPage('schedule.html', () => {
            // Set the schedule ID in the global scope for the schedule page
            window.scheduleId = scheduleId;
        });
    }

    loadIndexPage() {
        // Check if we're already on the index page
        if (document.title.includes('TripFlow - 여행 스케줄 공유 플랫폼')) {
            return;
        }
        
        this.loadPage('index.html');
    }

    loadPage(page, callback) {
        fetch(page)
            .then(response => response.text())
            .then(html => {
                document.open();
                document.write(html);
                document.close();
                
                if (callback) {
                    callback();
                }
            })
            .catch(error => {
                console.error('Error loading page:', error);
                this.loadIndexPage();
            });
    }

    // Navigate to a route programmatically
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    // Navigate to a schedule
    navigateToSchedule(scheduleId) {
        this.navigate(`/s/${scheduleId}`);
    }
}

// Initialize router
window.TripFlowRouter = new TripFlowRouter();
