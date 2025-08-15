// Global variables
if (typeof window.breakpoint === 'undefined') {
    window.breakpoint = 1000; // When to switch to mobile
}
if (typeof window.lastLoadedDate === 'undefined') {
    window.lastLoadedDate = null;
}
if (typeof window.maxCol === 'undefined') {
    window.maxCol = 0; // Maximum column number for hexagons
}
if (typeof window.activityCanvas === 'undefined') {
    window.activityCanvas = null;
}
if (typeof window.originalContainerHeight === 'undefined') {
    window.originalContainerHeight = null; // Store original container height for modal max height
}

const DEFAULT_COLOR = '#CCCCCC'; // Default color for unknown activity types

// Master activity type mappings
const activityTypeMap = {
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
};

// Generate colorMap from activityTypeMap for backward compatibility
const colorMap = Object.keys(activityTypeMap).reduce((map, key) => {
    map[key] = activityTypeMap[key].color;
    return map;
}, {});

// Starting point for activity charts
var selectedDates = {
    start: moment().startOf('week'),
    end: moment().startOf('week').clone().add(7, 'days')
};

// Function to apply colors to hexagons based on activity type
function applyColorsToHexagons() {
    $('.hexagons .hex').each(function () {
        const $hex = $(this);
        const classes = $hex.attr('class').split(' ');
        const activity = classes.find(c => c in colorMap);
        const color = colorMap[activity] || DEFAULT_COLOR;
        $hex.find('.hex_inner').css('background-color', color);
    });
}

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
            const activity = classes.find(c => c in colorMap);
            const color = colorMap[activity] || DEFAULT_COLOR;
            $(selector).find('.hex_inner').css('background-color', color);
        });

        // Calculate max column to determine how many activities to load per batch
        var nCol = _.maxBy(elems, 'col')?.col || 0;
        window.maxCol = nCol + 1;

    }, {
        hexWidth: 200, // Set hex width
    });

    $('.hexagons').fadeIn(10); // Fade in when loaded
});

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
        // console.log('Transitioning back with hexId:', hexId);
        transitionSquareToHex(hex, hexId, animTime, 'activity-details');
        $(hex).removeData('hexStateId'); // Clean up the stored ID
    } else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') { // Transition to square
        var activityDetailDiv = initializeActivityView(activityId, container);
        const hexId = transitionHexToSquare(hex, container, animTime, activityDetailDiv, 'activity-details');
        // console.log('Storing hexId:', hexId);
        $(hex).data('hexStateId', hexId); // Store the hex ID for later retrieval
    }
}

var titleHeight = 0;
function initializeActivityView(activityId, container) {
    // Create the outer div element
    let containerDiv = document.createElement('div');
    containerDiv.style.transform = 'scaleX(-1)';
    containerDiv.id = 'activity-details';

    // Create title container with loading state
    let titleDiv = document.createElement('h1');
    titleDiv.innerHTML = `<i class="fas fa-running" style="margin-right: 8px;"></i>Loading Activity...`;
    containerDiv.appendChild(titleDiv);

    // Create loading indicator
    let loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = '<div class="spinner"></div><span class="loading-text">Loading activity details...</span>';
    containerDiv.appendChild(loadingDiv);

    // Measure title height for layout calculations
    requestAnimationFrame(() => {
        titleHeight = $(titleDiv).outerHeight(true);
    });

    // Request activity details from backend
    let req = {
        page: 'running',
        request: 'getActivityDetails',
        activityId: activityId,
    };

    $.get("index.php?" + $.param(req), function (response) {
        // Remove loading indicator
        $(loadingDiv).remove();

        if (response.status === 'error') {
            containerDiv.innerHTML = `
                <h1><i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>Error</h1>
                <div class="error-message">
                    <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                    Error loading activity: ${response.message}
                </div>`;
            return;
        }

        // Update title with activity date and type
        const activityType = response.summary.activityType || 'Activity';
        const activityIcon = getActivityIcon(activityType);
        titleDiv.innerHTML = `${activityIcon}${activityType} on ${response.summary.activityDate}`;

        // Create summary section
        let summaryDiv = document.createElement('div');
        summaryDiv.className = 'activity-summary';
        summaryDiv.innerHTML = `
            <div class="summary-item">
                <div class="summary-label">Distance</div>
                <div class="summary-value">${response.summary.distanceMiles} mi</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Duration</div>
                <div class="summary-value">${response.summary.durationFormatted}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Pace</div>
                <div class="summary-value">${response.summary.paceFormatted} min/mi</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Calories</div>
                <div class="summary-value">${response.summary.calories}</div>
            </div>
        `;
        containerDiv.appendChild(summaryDiv);

        // Create chart containers if heart rate data exists
        if (response.chartData && response.chartData.heartRate && response.chartData.heartRate.length > 0) {
            // Create charts wrapper
            let chartsWrapper = document.createElement('div');
            chartsWrapper.style.padding = '20px';
            chartsWrapper.style.background = '#f8f9fa';

            // Create heart rate chart
            let hrCanvas = document.createElement('canvas');
            hrCanvas.id = 'heart-rate-chart';
            chartsWrapper.appendChild(hrCanvas);

            // Initialize heart rate chart
            createActivityChart(hrCanvas, 'Heart Rate', response.chartData.labels, response.chartData.heartRate, '#FF6384', 'bpm', container);

            // Create SpO2 chart if data exists
            if (response.chartData.spo2 && response.chartData.spo2.length > 0) {
                let spo2Canvas = document.createElement('canvas');
                spo2Canvas.id = 'spo2-chart';
                chartsWrapper.appendChild(spo2Canvas);

                createActivityChart(spo2Canvas, 'Blood Oxygen', response.chartData.labels, response.chartData.spo2, '#4BC0C0', '%', container);
            }

            // Create temperature chart if data exists
            if (response.chartData.temperature && response.chartData.temperature.length > 0) {
                let tempCanvas = document.createElement('canvas');
                tempCanvas.id = 'temperature-chart';
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
            containerDiv.innerHTML = `
                <h1><i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>Error</h1>
                <div class="error-message">
                    <i class="fas fa-wifi" style="margin-right: 8px;"></i>
                    Failed to load activity data. Please check your connection.
                </div>`;
        });

    // Return the container div
    return containerDiv;
}

// Helper function to get activity icon
function getActivityIcon(activityType) {
    if (!activityType) return '<i class="fas fa-heartbeat" style="margin-right: 8px;"></i>';

    const type = activityType.toLowerCase();

    // Try exact match first
    if (activityTypeMap[type]) return activityTypeMap[type].icon;

    // Try partial matches for fuzzy matching
    for (const [key, value] of Object.entries(activityTypeMap)) {
        if (type.includes(key.split(' ')[0]) || type.includes(key.split('-')[0])) {
            return value.icon;
        }
    }

    return '<i class="fas fa-heartbeat" style="margin-right: 8px;"></i>';
}

function createActivityChart(canvas, title, labels, data, color, unit, container) {
    // Calculate min and max values for better scaling
    const minValue = Math.min(...data.filter(v => v !== null && v !== undefined));
    const maxValue = Math.max(...data.filter(v => v !== null && v !== undefined));
    const range = maxValue - minValue;
    const padding = range * 0.1; // Add 10% padding

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
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
}

function loadMoreActivities(button) {
    // Disable button and show loading state
    const $button = $(button);
    const originalText = $button.text();
    $button.prop('disabled', true).text('Loading...');

    // Calculate how many activities we need to load for one more row
    const activitiesPerRow = window.maxCol;
    console.log(`Loading ${activitiesPerRow} more activities for next row`);

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

                console.log('Switched to absolute positioning - container height:', containerHeight, 'viewport height:', viewportHeight);
            } else {
                console.log('Keeping centered positioning - container height:', containerHeight, 'viewport height:', viewportHeight);
            }

            // Apply colors to all hexagons after adding new ones
            applyColorsToHexagons();

            // Update maxCol for future pagination
            var nCol = _.maxBy(elems, 'col')?.col || 0;
            window.maxCol = nCol + 1;

            console.log('New hexagons added incrementally, maxCol:', window.maxCol);
        });
    } else {
        // Fallback to full reinitialization if the new method isn't available
        console.log('Using fallback full reinitialization');
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

/*
* Cleanup function for running page variables
*/
function cleanupRunning() {
    // Reset global variables
    window.lastLoadedDate = null;
    window.maxCol = 0;
    window.activityCanvas = null;
    window.originalContainerHeight = null;

    // Clear any intervals or timeouts specific to running page
}