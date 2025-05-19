// Global variables
var original = {}; // Store original values
var breakpoint = 1000; // When to switch to mobile

// Starting point for activity charts
var selectedDates = {
    start: moment().startOf('week'),
    end: moment().startOf('week').clone().add(7, 'days')
};

var activityCanvas;

// Wait for DOM to load then execute scripts
$(document).ready(function () {
    // Set up hexagons
    $('.hexagons').hexagons(function (elems, spawnPoint, settings, containerDims) {
        // Apply colors based on activity type
        $('.hex.run').each(function () {
            $(this).find('.hex_inner').css("background-color", "#32CD32"); // Light green for runs
        });

        $('.hex.walk').each(function () {
            $(this).find('.hex_inner').css("background-color", "#87CEFA"); // Light blue for walks
        });

        $('.hex.hike').each(function () {
            $(this).find('.hex_inner').css("background-color", "#B8860B"); // Dark goldenrod for hikes
        });

        $('.hex.treadmill-run').each(function () {
            $(this).find('.hex_inner').css("background-color", "#FF8C00"); // Dark orange for treadmill runs
        });

        // Default color for any other activity type
        $('.hex:not(.run):not(.walk):not(.hike):not(.treadmill-run)').each(function () {
            $(this).find('.hex_inner').css("background-color", "#9370DB"); // Medium purple for other activities
        });

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
    const $hexParent = $(hex).parent();
    const $hexInner = $(hex).find('.hex_inner');
    const $hexFlipText = $(hex).find('.inner-text-flipped');
    const $hexWrappers = {
        before: $(hex).find('.hex-wrap-before'),
        after: $(hex).find('.hex-wrap-after'),
    };

    var currentWidth = $(window).width(); // Get width of window
    var currentHeight = $(window).height(); // Get height of window
    var container = { // Dynamic hex width
        height: (currentWidth <= breakpoint) ? $(window).height() * .98 : $container.height(),
        width: (currentWidth <= breakpoint) ? $container.width() : $container.width() * .8,
        top: (currentHeight <= $container.height()) ? `${window.scrollY}px` : '0px',
    };

    if ($hexInner.hasClass('squared')) { // Transition back to hex state
        if ($hexInner.find('#activity-details').length) {
            $hexInner.find('#activity-details').remove();
        }

        // Reapply original CSS
        $hexParent.css({
            position: 'absolute',
            width: original.width.parent,
            height: original.height.parent,
            left: original.left,
            top: original.top,
            'z-index': 'auto',
            translate: '0%',
            transition: `position ${animTime}ms ease-in-out, width ${animTime}ms ease-in-out, height ${animTime}ms ease-in-out`,
        });

        $hexInner.css({
            height: original.height.inner,
            width: original.width.inner,
        });

        $hexInner.css({ backgroundColor: original.color });
        $hexFlipText.css({ display: 'block' });
        $hexWrappers.before.add($hexWrappers.after).css('display', 'block');
        $hexInner.removeClass('squared').css({ height: original.height });
        $hexInner.on('mouseenter', () => flipForward($hexParent, animTime, original.color.match(/\(([^)]+)\)/)[1]));
        $hexInner.on('mouseleave', () => flipBack($hexParent, animTime));
        flipBack($hexParent, animTime); // Flip back to summary

    } else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') { // Transition to square
        // Update original CSS values
        original = {
            height: {
                inner: $hexInner.css('height'),
                parent: $hexParent.css('height')
            },
            width: {
                inner: $hexInner.css('width'),
                parent: $hexParent.css('width')
            },
            left: $hexParent.css('left'),
            top: $hexParent.css('top'),
            color: $hexInner.css('background-color'),
        };

        $hexFlipText.css({ display: 'none' });
        var activityDetailDiv = initializeActivityView(activityId, container);
        $hexInner.find('.inner-span').append(activityDetailDiv);

        $hexInner.addClass('squared').css({
            width: '100%', // Do not change this number!
            height: container.height,
            top: container.top,
            transition: `all ${animTime}ms ease-in-out`,
            backgroundColor: 'white',
        }).off('mouseenter mouseleave');

        $hexInner.find('.inner-span').css({
            backgroundColor: 'white',
            transition: `all ${animTime}ms ease-in-out`,
        });

        $hexParent.css({
            width: container.width,
            position: 'absolute',
            top: container.top,
            left: '50%',
            translate: '-50%',
            'z-index': 1,
            transition: `all ${animTime}ms ease-in-out`,
        });

        $hexWrappers.before.add($hexWrappers.after).css('display', 'none');
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
    titleDiv.innerHTML = `Loading Activity...`;
    $(titleDiv).css({ padding: '20px 0px 0px 0px', margin: '0px' });
    containerDiv.appendChild(titleDiv);

    // Create loading indicator
    let loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = 'Loading activity details...';
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

    $.get("index.php?" + $.param(req), function(response) {
        // Remove loading indicator
        $(loadingDiv).remove();

        if (response.status === 'error') {
            containerDiv.innerHTML = `<div class="error-message">Error loading activity: ${response.message}</div>`;
            return;
        }

        // Update title with activity date
        titleDiv.innerHTML = `Activity on ${response.summary.activityDate}`;

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
            // Create heart rate chart
            let hrCanvas = document.createElement('canvas');
            hrCanvas.id = 'heart-rate-chart';
            hrCanvas.style.padding = '20px';
            containerDiv.appendChild(hrCanvas);

            // Initialize heart rate chart
            createActivityChart(hrCanvas, 'Heart Rate', response.chartData.labels, response.chartData.heartRate, '#FF6384', 'bpm', container);

            // Create SpO2 chart if data exists
            if (response.chartData.spo2 && response.chartData.spo2.length > 0) {
                let spo2Canvas = document.createElement('canvas');
                spo2Canvas.id = 'spo2-chart';
                spo2Canvas.style.padding = '20px';
                containerDiv.appendChild(spo2Canvas);

                createActivityChart(spo2Canvas, 'Blood Oxygen', response.chartData.labels, response.chartData.spo2, '#4BC0C0', '%', container);
            }

            // Create temperature chart if data exists
            if (response.chartData.temperature && response.chartData.temperature.length > 0) {
                let tempCanvas = document.createElement('canvas');
                tempCanvas.id = 'temperature-chart';
                tempCanvas.style.padding = '20px';
                containerDiv.appendChild(tempCanvas);

                createActivityChart(tempCanvas, 'Temperature', response.chartData.labels, response.chartData.temperature, '#FFCE56', '°F', container);
            }
        } else {
            // No chart data available message
            let noDataDiv = document.createElement('div');
            noDataDiv.className = 'no-data-message';
            noDataDiv.innerHTML = 'No detailed metrics available for this activity.';
            containerDiv.appendChild(noDataDiv);
        }
    })
    .fail(function() {
        containerDiv.innerHTML = '<div class="error-message">Failed to load activity data.</div>';
    });

    // Return the container div
    return containerDiv;
}

function createActivityChart(canvas, title, labels, data, color, unit, container) {
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: color,
                borderColor: color,
                fill: false,
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 1,
            }]
        },
        options: {
            responsive: true,
            aspectRatio: (container.width / (container.height - titleHeight)) * 2,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: '14px' },
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} ${unit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        callback: function(val, index) {
                            // Show every 5th label to avoid overcrowding
                            return index % 5 === 0 ? this.getLabelForValue(val) : '';
                        },
                    },
                },
                y: {
                    beginAtZero: false,
                }
            },
        },
    });
}
