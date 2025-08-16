// Global variables
setDefault('breakpoint', 1000); // When to switch to mobile
setDefault('lastLoadedDate', null);
setDefault('maxCol', 0); // Maximum column number for hexagons
setDefault('activityCanvas', null);
setDefault('originalContainerHeight', null); // Store original container height for modal max height
setDefault('DEFAULT_COLOR', '#CCCCCC'); // Default color for unknown activity types

// Master activity type mappings
setDefault('activityTypeMap', {
    'run': {
        color: '#FF5733',
        icon: '<i class="fas fa-running" style="margin-right: 8px;"></i>'
    },
    'treadmill run': {
        color: '#3357FF',
        icon: '<i class="fas fa-running" style="margin-right: 8px;"></i>'
    },
    'treadmill-run': {
        color: '#3357FF',
        icon: '<i class="fas fa-running" style="margin-right: 8px;"></i>'
    },
    'walk': {
        color: '#33FF57',
        icon: '<i class="fas fa-walking" style="margin-right: 8px;"></i>'
    },
    'bike': {
        color: '#FF33A8',
        icon: '<i class="fas fa-bicycle" style="margin-right: 8px;"></i>'
    },
    'outdoor bike': {
        color: '#FF33A8',
        icon: '<i class="fas fa-bicycle" style="margin-right: 8px;"></i>'
    },
    'outdoor-bike': {
        color: '#FF33A8',
        icon: '<i class="fas fa-bicycle" style="margin-right: 8px;"></i>'
    },
    'hike': {
        color: '#A833FF',
        icon: '<i class="fas fa-mountain" style="margin-right: 8px;"></i>'
    },
    'sport': {
        color: '#FFA533',
        icon: '<i class="fas fa-dumbbell" style="margin-right: 8px;"></i>'
    }
});

// Starting point for activity charts
var selectedDates = {
    start: moment().startOf('week'),
    end: moment().startOf('week').clone().add(7, 'days')
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Extract data from response, handling various response formats
 */
function extractDataFromResponse(response) {
    if (!response) return null;
    if (response.success && response.data) return response.data;
    if (response.data) return response.data;
    return response;
}

/**
 * Create activity summary HTML template
 */
function createSummaryHTML(summary, data) {
    return `
        <div class="summary-item">
            <div class="summary-label">Distance</div>
            <div class="summary-value">${summary.distanceMiles || data.distance || '0'} mi</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Duration</div>
            <div class="summary-value">${summary.durationFormatted || data.duration || '0:00'}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Pace</div>
            <div class="summary-value">${summary.paceFormatted || data.pace || '--'} min/mi</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Calories</div>
            <div class="summary-value">${summary.calories || data.calories || '0'}</div>
        </div>
    `;
}

/**
 * Create a chart canvas with consistent styling
 */
function createChartCanvas(id, height, marginBottom = '20px') {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.style.height = height;
    if (marginBottom) canvas.style.marginBottom = marginBottom;
    return canvas;
}

/**
 * Create error message HTML template
 */
function createErrorHTML(title, message, iconClass = 'fas fa-exclamation-triangle') {
    return `
        <h1><i class="${iconClass}" style="margin-right: 8px;"></i>${title}</h1>
        <div class="error-message">
            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
            ${message}
        </div>
    `;
}

/**
 * Apply color to hexagon based on activity type
 */
function applyActivityColor($hex, activityType) {
    const type = (activityType || '').toLowerCase();
    const color = window.activityTypeMap[type]?.color || window.DEFAULT_COLOR;
    $hex.find('.hex_inner').css('background-color', color);
    return color;
}

// Function to apply colors to hexagons based on activity type
function applyColorsToHexagons() {
    $('.hexagons .hex').each(function () {
        const $hex = $(this);
        const classes = $hex.attr('class').split(' ');
        const activity = classes.find(c => c && window.activityTypeMap && c in window.activityTypeMap);
        applyActivityColor($hex, activity);
    });
}

/**
 * Convert hex color to RGB array for flip color calculation
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

/*
* Cleanup function for running page variables
*/
function cleanupRunning() {
    // Clean up lazy loading instances
    if (window.HexagonLazyLoader && window.HexagonLazyLoader.instances.has('.hexagons.running')) {
        window.HexagonLazyLoader.instances.delete('.hexagons.running');
    }

    // Reset global variables
    window.lastLoadedDate = null;
    window.maxCol = 0;
    window.activityCanvas = null;
    window.originalContainerHeight = null;

    // Clear any intervals or timeouts specific to running page
}

// ========== END UTILITY FUNCTIONS ==========

// On DOM load
$(document).ready(function () {
    // Set up hexagons and store the instance
    window.hexagonsInstance = $('.hexagons').hexagons(function (elems, spawnPoint, settings, containerDims) {
        // Store the original container height for modal max height
        if (window.originalContainerHeight === null) {
            window.originalContainerHeight = containerDims.height;
        }

        // Apply colors based on activity type
        elems.forEach(({ classes, selector }) => {
            const activity = classes.find(c => c && window.activityTypeMap && c in window.activityTypeMap);
            const $hex = $(selector);
            applyActivityColor($hex, activity);
        });

        // Calculate max column to determine how many activities to load per batch
        var nCol = _.maxBy(elems, 'col')?.col || 0;
        window.maxCol = nCol + 1;

        // Initialize lazy loading for running activities
        initializeActivityLazyLoading();

    }, {
        hexWidth: 200, // Set hex width
    });

    $('.hexagons').fadeIn(10); // Fade in when loaded
});

/**
 * Initialize lazy loading for running activity hexagons
 * Uses the integrated HexagonLazyLoader system with activity-specific configuration
 */
async function initializeActivityLazyLoading() {
    try {
        // Validate that we have a hexagons container with activities to load
        const $container = $('.hexagons.running');
        if (!$container.length) {
            console.warn('⚠️ No .hexagons.running container found for lazy loading');
            return;
        }

        const $lazyHexagons = $container.find('.hex[data-lazy-load="true"]');

        if ($lazyHexagons.length === 0) {
            return;
        }

        // Initialize lazy loading using the integrated HexagonLazyLoader
        await window.HexagonLazyLoader.initialize('.hexagons.running', {
            apiEndpoint: '/index.php?page=running',
            staggerDelay: 80, // Load activities every 80ms for smooth visual feedback
            cacheResults: true,
            retryAttempts: 2,
            // Custom fetch function for activities
            fetchData: async function (instance, identifier) {
                const url = new URL(instance.options.apiEndpoint, window.location.origin);
                url.searchParams.set('request', 'getActivitySummary');
                url.searchParams.set('activityId', identifier);

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            },
            // Custom content updater for activities
            updateContent: function (hexInfo, activityData, instance) {
                const $hex = $(hexInfo.selector);
                const $hexInner = $hex.find('.hex_inner');
                const $innerSpan = $hexInner.find('.inner-span');
                const $title = $innerSpan.find('.inner-title');
                const $flipText = $innerSpan.find('.inner-text-flipped');

                // Handle both wrapped and direct data formats using utility function
                const data = extractDataFromResponse(activityData);

                if (data && typeof data === 'object') {
                    // Update title with activity type or distance
                    if (data.activityType) {
                        $title.html(`<span>${data.activityType}</span>`);
                    } else if (data.distance) {
                        $title.html(`<span>${data.distance} mi</span>`);
                    }

                    // Update flip text with activity details - handle both summary structure and direct data
                    const summary = data.summary || data;
                    $flipText.html(`
                        Type: ${summary.activityType || data.activityType || 'Activity'}<br>
                        Distance: ${summary.distanceMiles || data.distance || '0'} mi<br>
                        Duration: ${summary.durationFormatted || data.duration || '0:00'}<br>
                        Pace: ${summary.paceFormatted || data.pace || '--'} min/mi<br>
                        Calories: ${summary.calories || data.calories || 0}<br>
                        Date: ${summary.activityDate || data.date || 'Unknown'}
                    `);

                    // Apply activity type color using utility function
                    const activityType = summary.activityType || data.activityType;
                    const color = applyActivityColor($hex, activityType);

                    // Store flip color for later use
                    const flipColor = hexToRgb(color) || [255, 255, 255];
                    window.HexagonStateManager.updateFlipColor($hex[0], flipColor);

                    // Remove the lazy load flag
                    $hex.removeAttr('data-lazy-load').removeData('lazy-load');
                    $hex.addClass('hex-loaded');

                } else {
                    console.warn(`⚠️ Invalid activity data for: ${hexInfo.identifier}`, activityData);

                    // Set error state
                    $title.html('<span>Error</span>');
                    $flipText.html('Failed to load activity details');
                    $hexInner.css('background-color', '#dc3545'); // Red for error
                }
            }
        });

    } catch (error) {
        console.error('Failed to initialize activity lazy loading:', error);
        // Fallback: show basic hexagons without detailed data
        $('.hexagons .hex').removeClass('hex-loading').addClass('hex-error');
    }
}

/**
 * Get cached activity data from lazy loading system
 * @param {string} activityId - The activity ID to look up
 * @returns {object|null} - Cached activity data or null if not found
 */
function getCachedActivityData(activityId) {
    try {
        // Check if HexagonLazyLoader has cached data for this activity
        if (window.HexagonLazyLoader && window.HexagonLazyLoader.instances.has('.hexagons.running')) {
            const instance = window.HexagonLazyLoader.instances.get('.hexagons.running');
            if (instance && instance.cache && instance.cache.has(activityId)) {
                const cachedData = instance.cache.get(activityId);
                return cachedData;
            }
        }

        // Fallback: try to extract data from the hexagon's DOM
        const $hex = $(`.hex[data-identifier="${activityId}"]`);
        if ($hex.length) {
            const $flipText = $hex.find('.inner-text-flipped');
            const flipContent = $flipText.html();

            if (flipContent && flipContent.includes('Type:') && !flipContent.includes('Failed to load')) {
                // Extract basic info from the flip text for immediate display
                return {
                    fromDom: true,
                    activityId: activityId
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting cached activity data:', error);
        return null;
    }
}

/**
 * Initiates the Fitbit OAuth authentication flow.
 *
 * This function redirects the user to the authorization endpoint with the proper
 * redirect URI that matches what's configured in the Fitbit Developer console.
 */
function initiateAuth() {
    // Show loading indicator if you have one
    if (document.getElementById('auth-loading')) {
        document.getElementById('auth-loading').style.display = 'inline-block';
    }

    // Disable the button to prevent multiple clicks
    const authButton = document.getElementById('fitbit-auth-btn');
    if (authButton) {
        authButton.disabled = true;
        authButton.innerText = 'Connecting...';
    }

    // Add state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);

    // Store state in localStorage to verify when returning
    localStorage.setItem('fitbit_auth_state', state);

    // Redirect to our backend endpoint that initiates the OAuth flow
    // with explicit redirect_uri parameter
    window.location.href = `index.php?page=running&request=authorize&state=${state}`;
}

/**
 * Display error message to user for authentication failures
 */
function showAuthError(message) {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
        // Remove any existing error messages
        const existingError = authContainer.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.style.cssText = `
            color: #ff4444;
            background-color: #ffe6e6;
            border: 1px solid #ff4444;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 14px;
        `;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${message}`;

        authContainer.appendChild(errorDiv);

        // Re-enable the auth button
        const authButton = document.getElementById('fitbit-auth-btn');
        if (authButton) {
            authButton.disabled = false;
            authButton.innerText = 'Connect Fitbit Account';
        }

        // Auto-hide error after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
}

function openActivityDetails(hex, activityId) {
    const animTime = 500; // Animation time in milliseconds
    const $container = $('.hexagons');
    const $runningContainer = $('.running');
    const $hexInner = $(hex).find('.hex_inner');

    var currentWidth = $(window).width(); // Get width of window
    var currentHeight = $(window).height(); // Get height of window

    // Check if .running is absolutely positioned to adjust calculations
    const isAbsolutePositioned = $runningContainer.css('position') === 'absolute';

    // Calculate the proper top position for the modal
    let modalTop;
    if (isAbsolutePositioned) {
        // When absolutely positioned, position modal relative to current scroll position
        // but account for the running container's current position
        const runningRect = $runningContainer[0].getBoundingClientRect();
        modalTop = `${window.scrollY}px`;
    } else {
        // When centered, modal should stay within the container bounds
        modalTop = (currentHeight <= $container.height()) ? `${window.scrollY}px` : '0px';
    }

    var container = { // Dynamic container dimensions
        height: (currentWidth <= window.breakpoint) ?
            $(window).height() * .98 :
            (isAbsolutePositioned ?
                Math.min(window.originalContainerHeight || $container.height(), currentHeight * 0.8) :
                Math.min(window.originalContainerHeight || $container.height(), $container.height())),
        width: (currentWidth <= window.breakpoint) ?
            $container.width() :
            $container.width() * .8,
        top: modalTop,
    };

    if ($hexInner.hasClass('squared')) { // Transition back to hex state
        // Get the stored hex ID from the hex element's data attribute
        const hexId = $(hex).data('hexStateId');
        transitionSquareToHex(hex, hexId, animTime, 'activity-details');
        $(hex).removeData('hexStateId'); // Clean up the stored ID
    } else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') { // Transition to square
        // Try to get cached activity data from lazy loading first
        const $hex = $(hex);
        const cachedData = getCachedActivityData(activityId);

        // Get the hexagon's background color to use for the modal header
        const hexagonColor = $hex.find('.hex_inner').css('background-color');

        var activityDetailDiv = initializeActivityView(activityId, container, cachedData, hexagonColor);
        const hexId = transitionHexToSquare(hex, container, animTime, activityDetailDiv, 'activity-details');
        $(hex).data('hexStateId', hexId); // Store the hex ID for later retrieval
    }
}

var titleHeight = 0;
function initializeActivityView(activityId, container, cachedData = null, hexagonColor = null) {
    // Create the outer div element with flexbox layout
    let containerDiv = document.createElement('div');
    containerDiv.style.transform = 'scaleX(-1)';
    containerDiv.id = 'activity-details';
    containerDiv.style.display = 'flex';
    containerDiv.style.flexDirection = 'column';
    containerDiv.style.height = '100%';
    containerDiv.style.overflow = 'auto';

    // Create title container with loading state
    let titleDiv = document.createElement('h1');

    // Apply hexagon color to h1 background if provided
    if (hexagonColor) {
        titleDiv.style.background = hexagonColor;
    }

    let loadingDiv = document.createElement('div');

    // If we have cached data, try to use it immediately for faster display
    if (cachedData && !cachedData.fromDom) {
        // Extract data from cache using utility function
        const data = extractDataFromResponse(cachedData);

        const summary = data.summary || data;
        const activityType = summary.activityType || data.activityType || 'Activity';
        const activityIcon = getActivityIcon(activityType);
        const activityDate = summary.activityDate || data.date || 'Unknown Date';

        titleDiv.innerHTML = `${activityIcon}${activityType} on ${activityDate}`;

        // Create summary section immediately from cached data using utility function
        let summaryDiv = document.createElement('div');
        summaryDiv.className = 'activity-summary';
        summaryDiv.innerHTML = createSummaryHTML(summary, data);
        containerDiv.appendChild(titleDiv);
        containerDiv.appendChild(summaryDiv);

        // Show a smaller loading indicator for additional chart details
        loadingDiv.className = 'loading-indicator';
        loadingDiv.style.padding = '20px';
        loadingDiv.style.fontSize = '12px';
        loadingDiv.innerHTML = '<div class="spinner spinner-small"></div><span class="loading-text">Loading detailed charts...</span>';
        containerDiv.appendChild(loadingDiv);
    } else {
        // No cached data, show full loading state
        titleDiv.innerHTML = `<i class="fas fa-running" style="margin-right: 8px;"></i>Loading Activity...`;
        containerDiv.appendChild(titleDiv);

        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = '<div class="spinner"></div><span class="loading-text">Loading activity details...</span>';
        containerDiv.appendChild(loadingDiv);
    }

    // Measure title height for layout calculations
    requestAnimationFrame(() => {
        titleHeight = $(titleDiv).outerHeight(true);
    });

    // Always make the detailed API call for chart data, but only for data we don't have
    let req = {
        page: 'running',
        request: 'getActivityDetails',
        activityId: activityId,
    };

    $.get("index.php?" + $.param(req), function (response) {
        // Remove loading indicator
        $(loadingDiv).remove();

        if (response.status === 'error') {
            containerDiv.innerHTML = createErrorHTML('Error', `Error loading activity: ${response.message}`);
            return;
        }

        // If we didn't have cached data, populate the summary now
        if (!cachedData || cachedData.fromDom) {
            // Update title with activity date and type
            const activityType = response.summary.activityType || 'Activity';
            const activityIcon = getActivityIcon(activityType);
            titleDiv.innerHTML = `${activityIcon}${activityType} on ${response.summary.activityDate}`;

            // Create summary section using utility function
            let summaryDiv = document.createElement('div');
            summaryDiv.className = 'activity-summary';
            summaryDiv.innerHTML = createSummaryHTML(response.summary, response.summary);
            containerDiv.appendChild(summaryDiv);
        }

        // Create chart containers if heart rate data exists
        if (response.chartData && response.chartData.heartRate && response.chartData.heartRate.length > 0) {
            // Create charts wrapper with proper height
            let chartsWrapper = document.createElement('div');
            chartsWrapper.style.padding = '20px';
            chartsWrapper.style.background = '#f8f9fa';
            chartsWrapper.style.flex = '1'; // Take remaining space
            chartsWrapper.style.display = 'flex';
            chartsWrapper.style.flexDirection = 'column';
            chartsWrapper.style.minHeight = '300px'; // Minimum height for charts

            // Create heart rate chart using utility function
            const hrCanvas = createChartCanvas('heart-rate-chart', '200px');
            chartsWrapper.appendChild(hrCanvas);

            // Initialize heart rate chart
            createActivityChart(hrCanvas, 'Heart Rate', response.chartData.labels, response.chartData.heartRate, '#FF6384', 'bpm', container);

            // Create SpO2 chart if data exists
            if (response.chartData.spo2 && response.chartData.spo2.length > 0) {
                const spo2Canvas = createChartCanvas('spo2-chart', '150px');
                chartsWrapper.appendChild(spo2Canvas);

                createActivityChart(spo2Canvas, 'Blood Oxygen', response.chartData.labels, response.chartData.spo2, '#4BC0C0', '%', container);
            }

            // Create temperature chart if data exists
            if (response.chartData.temperature && response.chartData.temperature.length > 0) {
                const tempCanvas = createChartCanvas('temperature-chart', '150px', '0px');
                chartsWrapper.appendChild(tempCanvas);

                createActivityChart(tempCanvas, 'Temperature', response.chartData.labels, response.chartData.temperature, '#FFCE56', '°F', container);
            }

            containerDiv.appendChild(chartsWrapper);
        } else {
            // No chart data available message
            let noDataDiv = document.createElement('div');
            noDataDiv.className = 'no-data-message';
            noDataDiv.innerHTML = '<i class="fas fa-chart-line" style="margin-right: 8px;"></i>No detailed metrics available for this activity.';
            containerDiv.appendChild(noDataDiv);
        }
    })
        .fail(function () {
            containerDiv.innerHTML = createErrorHTML('Error', 'Failed to load activity data. Please check your connection.', 'fas fa-wifi');
        });

    // Return the container div
    return containerDiv;
}

// Helper function to get activity icon
function getActivityIcon(activityType) {
    if (!activityType) return '<i class="fas fa-heartbeat" style="margin-right: 8px;"></i>';

    const type = activityType.toLowerCase();

    // Try exact match first
    if (window.activityTypeMap[type]) return window.activityTypeMap[type].icon;

    // Try partial matches for fuzzy matching
    for (const [key, value] of Object.entries(window.activityTypeMap)) {
        if (type.includes(key.split(' ')[0]) || type.includes(key.split('-')[0])) {
            return value.icon;
        }
    }

    return '<i class="fas fa-heartbeat" style="margin-right: 8px;"></i>';
}

function createActivityChart(canvas, title, labels, data, color, unit, container) {
    // Extract values and labels from the data structure
    let chartData = data;
    let chartLabels = labels;

    // Check if data is array of objects with time/value structure
    if (data && data.length > 0 && typeof data[0] === 'object' && data[0].value !== undefined) {
        chartData = data.map(item => item.value);
        chartLabels = data.map(item => item.time);
    }

    // Calculate min and max values for better scaling
    const minValue = Math.min(...chartData.filter(v => v !== null && v !== undefined && !isNaN(v)));
    const maxValue = Math.max(...chartData.filter(v => v !== null && v !== undefined && !isNaN(v)));
    const range = maxValue - minValue;
    const padding = range * 0.1; // Add 10% padding

    try {
        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: title,
                    data: chartData,
                    backgroundColor: `${color}20`,
                    borderColor: color,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: {
                            size: 16,
                            weight: '500'
                        },
                        color: '#343a40',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        borderColor: color,
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw} ${unit}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#e9ecef',
                            borderColor: '#dee2e6'
                        },
                        ticks: {
                            color: '#6c757d',
                            maxRotation: 0,
                            minRotation: 0,
                            callback: function (val, index) {
                                // Show every 5th label to avoid overcrowding
                                return index % 5 === 0 ? this.getLabelForValue(val) : '';
                            },
                        },
                    },
                    y: {
                        min: Math.max(0, minValue - padding),
                        max: maxValue + padding,
                        grid: {
                            color: '#e9ecef',
                            borderColor: '#dee2e6'
                        },
                        ticks: {
                            color: '#6c757d',
                            callback: function (value) {
                                return `${Math.round(value)} ${unit}`;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            },
        });

    } catch (error) {
        console.error('Error creating chart:', error);
    }
}

function loadMoreActivities(button) {
    // Disable button and show loading state
    const $button = $(button);
    const originalText = $button.text();
    $button.prop('disabled', true).text('Loading...');

    // Calculate how many activities we need to load for one more row
    const activitiesPerRow = window.maxCol;

    // Get current number of activities to determine offset
    const currentActivities = $('.hexagons .hex').length;

    // Make request for more activities
    $.get('index.php', {
        page: 'running',
        request: 'getActivities',
        limit: activitiesPerRow,
        offset: currentActivities
    })
        .done(function (response) {
            if (response.status === 'success' && response.data.length > 0) {
                // Add new activities to the hexagon grid
                addActivitiesToGrid(response.data);

                // If we got fewer activities than requested, we've reached the end
                if (response.data.length < activitiesPerRow) {
                    $button.text('No more activities').prop('disabled', true);
                } else {
                    $button.prop('disabled', false).text(originalText);
                }
            } else {
                // No more activities or error
                $button.text('No more activities').prop('disabled', true);
            }
        })
        .fail(function () {
            // Re-enable button on error
            $button.prop('disabled', false).text(originalText);
            console.error('Failed to load more activities');
        });
}

function addActivitiesToGrid(activities) {
    const $hexagons = $('.hexagons');
    const $runningContainer = $('.running');

    // Capture current absolute position before adding new content
    const currentRect = $runningContainer[0].getBoundingClientRect();
    const currentTop = currentRect.top + window.scrollY;
    const currentLeft = currentRect.left + window.scrollX;

    // Create new hexagon elements in the simple format expected by hexagons.js
    activities.forEach(activity => {
        // Generate CSS classes for the hexagon based on activity type
        const activityClass = activity.type.toLowerCase().replace(/\s+/g, '-');

        // Only add if pace is reasonable (matching the template condition)
        if (activity.pace <= 20) {
            // Create hexagon HTML in the exact same format as the template
            const hexHtml = `
                <div class="hex rounded flip button ${activityClass}" onclick="openActivityDetails(this, '${activity.id}')">
                    <span>${activity.type}<br>${activity.date}</span>
                    <p class="inner-text-flipped no-wrap">
                        Time: ${activity.time}<br>
                        Date: ${activity.date}<br>
                        Distance: ${activity.distance} mi<br>
                        Duration: ${activity.duration}<br>
                        Pace: ${activity.paceFormatted} min/mi<br>
                        Activity: ${activity.type}<br>
                    </p>
                </div>
            `;

            // Append to hexagons container
            $hexagons.append(hexHtml);
        }
    });

    // Use the new addHexagons method for incremental updates
    if (window.hexagonsInstance && window.hexagonsInstance.addHexagons) {
        window.hexagonsInstance.addHexagons(function (elems, spawnPoint, settings, containerDims) {
            // Check if the container height would exceed viewport height
            const viewportHeight = window.innerHeight;
            const containerHeight = containerDims.height || $runningContainer.height();

            // Only switch to absolute positioning if content is taller than viewport
            if (containerHeight > viewportHeight * 0.9) { // Use 90% of viewport as threshold
                $runningContainer.css({
                    position: 'absolute',
                    top: currentTop + 'px',
                    left: currentLeft + 'px',
                    transform: 'none', // Remove the transform so position doesn't shift
                    paddingBottom: '100px' // Add extra space at the bottom for scrolling
                });

                // Also ensure the body has enough height for proper scrolling
                $('body').css('min-height', (currentTop + containerHeight + 150) + 'px');

            }

            // Apply colors to all hexagons after adding new ones
            applyColorsToHexagons();

            // Update maxCol for future pagination
            var nCol = _.maxBy(elems, 'col')?.col || 0;
            window.maxCol = nCol + 1;

        });
    } else {
        // Fallback to full reinitialization if the new method isn't available
        $hexagons.hexagons(function (elems, spawnPoint, settings, containerDims) {
            // Check if the container height would exceed viewport height
            const viewportHeight = window.innerHeight;
            const containerHeight = containerDims.height || $runningContainer.height();

            // Only switch to absolute positioning if content is taller than viewport
            if (containerHeight > viewportHeight * 0.9) {
                $runningContainer.css({
                    position: 'absolute',
                    top: currentTop + 'px',
                    left: currentLeft + 'px',
                    transform: 'none',
                    paddingBottom: '100px' // Add extra space at the bottom for scrolling
                });

                // Also ensure the body has enough height for proper scrolling
                $('body').css('min-height', (currentTop + containerHeight + 150) + 'px');
            }

            applyColorsToHexagons();
            var nCol = _.maxBy(elems, 'col')?.col || 0;
            window.maxCol = nCol + 1;
        }, {
            hexWidth: 200,
        });
    }
}
