/////////////
//Global variables
setDefault('breakpoint', 1000);// When to switch to mobile

// Starting point for charts
var selectedDates = {
    start: moment().startOf('week'),
    end: moment().startOf('week').clone().add(7, 'days')
};

var influxCanvas;

// Wait for hexagons plugin to be available before initializing
function initializeServerHexagons() {
    // Check if jQuery and hexagons plugin are available
    if (typeof $ === 'undefined' || typeof $.fn.hexagons === 'undefined') {
        // Wait and try again
        setTimeout(initializeServerHexagons, 100);
        return;
    }

    // Clean up any existing hexagons before initializing new ones
    if (typeof cleanupHexagons === 'function') {
        cleanupHexagons();
    }

    // Handle duplicate hexagon containers more carefully
    const $containers = $('.hexagons.server');
    if ($containers.length > 1) {
        // Remove duplicates but keep the first container
        $containers.not(':first').remove();
    }

    // Make sure we have a container to work with
    if ($('.hexagons.server').length === 0) {
        console.error('❌ No hexagon container found, cannot initialize');
        return;
    }

    $('.hexagons').hexagons(function (elems, spawnPoint, settings, containerDims) {// Set up hexagons

        $('.hex.running').each(function () {
            $(this).find('.hex_inner').css("background-color", "green");
        })

        $('.hex.stopped').each(function () {
            $(this).find('.hex_inner').css("background-color", "gray");
        })

        // Add click handlers for server hexagons
        $('.hexagons.server .hex.button').off('click.server').on('click.server', function (e) {
            const serverName = $(this).data('server-name') || $(this).find('span').text().trim();
            openDetails(this, serverName);
        });

        // Initialize lazy loading for server hexagons
        initializeLazyLoading();

    }, {
        hexWidth: 200,
    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

    // Cleanup function for server page
    window.cleanupServer = function () {
        if (window.HexagonLazyLoader && window.HexagonLazyLoader.instances.has('.hexagons.server')) {
            window.HexagonLazyLoader.instances.delete('.hexagons.server');
        }
        $('.hexagons.server .hex.button').off('click.server');
    };
}

// Wait for images to load then execute scripts
$(document).ready(function () {
    initializeServerHexagons();
});

/**
 * Initialize the lazy loading system for server hexagons
 */
async function initializeLazyLoading() {
    try {
        // Wait a bit to ensure hexagon structure is fully built
        await new Promise(resolve => setTimeout(resolve, 100));

        // Clear any existing instances to prevent duplicates
        if (window.HexagonLazyLoader.instances.has('.hexagons.server')) {
            window.HexagonLazyLoader.instances.delete('.hexagons.server');
        }

        // Only mark hexagons that are properly structured and don't already have detailed data
        $('.hexagons.server .hex').each(function () {
            const $hex = $(this);
            const serverName = $hex.find('span').text().trim();
            const hasInnerStructure = $hex.find('.hex_inner').length > 0;
            const hasDetailedData = $hex.find('.inner-text-flipped').text().includes('Type:');

            if (serverName && hasInnerStructure && !hasDetailedData && !$hex.hasClass('hex-loaded')) {
                $hex.attr('data-lazy-load', 'true');
                $hex.attr('data-server-name', serverName);
            }
        });

        // Initialize lazy loading using the integrated HexagonLazyLoader
        await window.HexagonLazyLoader.initialize('.hexagons.server', {
            apiEndpoint: '/index.php?page=server',
            staggerDelay: 100, // Load hexagons every 100ms to avoid overwhelming the server
            cacheResults: true,
            retryAttempts: 2,
            // API parameters for server requests
            apiParams: {
                action: 'details',
                identifier_param: 'host'
            },
            // Custom content updater for servers
            updateContent: function(hexInfo, serverData, instance) {
                const { $element } = hexInfo;
                const $flipText = $element.find('.inner-text-flipped');

                if ($flipText.length > 0 && serverData && serverData.success) {
                    const data = serverData.data;

                    // Calculate percentage values for display
                    const memPercent = data.maxmem ? ((data.mem / data.maxmem) * 100).toFixed(2) : 0;
                    const diskPercent = data.maxdisk ? ((data.disk / data.maxdisk) * 100).toFixed(2) : 0;
                    const availabilityPercent = data.availability ? (data.availability * 100).toFixed(2) : 0;

                    // Update the flip text with detailed information
                    const detailedInfo = `
                        Type: ${data.type || 'qemu'}<br>
                        Name: ${data.name}<br>
                        Status: ${data.status}<br>
                        Availability: ${availabilityPercent}%<br>
                        Uptime: ${data.uptimeHR || 'N/A'}<br>
                        Mem Use: ${memPercent}%<br>
                        Disk Use: ${diskPercent}%<br>
                    `;

                    $flipText.html(detailedInfo.trim());

                    // Remove the lazy load flag
                    $element.removeAttr('data-lazy-load').removeData('lazy-load');

                } else {
                    console.warn(`⚠️ Invalid server data for: ${hexInfo.identifier}`, serverData);
                }
            }
        });

    } catch (error) {
        console.error('Failed to initialize lazy loading:', error);
        // Fallback: show basic hexagons without detailed data
        $('.hexagons .hex').removeClass('hex-loading').addClass('hex-error');
    }
}

function openDetails(hex, serverName) {
    const animTime = 500; // Animation time in milliseconds
    const $container = $('.hexagons');
    const $hexInner = $(hex).find('.hex_inner');

    var currentWidth = $(window).width();// Get width of window
    var currentHeight = $(window).height();// Get width of window
    var container = {// Dynamic hex width
        height: (currentWidth <= breakpoint) ? $(window).height() * .98 : $container.height(),
        width: (currentWidth <= breakpoint) ? $container.width() : $container.width() * .8,
        top: (currentHeight <= $container.height()) ? `${window.scrollY}px` : '0px',
    }

    if ($hexInner.hasClass('squared')) {// Transition back to hex state
        // Get the stored hex ID from the hex element's data attribute
        const hexId = $(hex).data('hexStateId');
        // console.log('Transitioning back with hexId:', hexId);
        transitionSquareToHex(hex, hexId, animTime, 'server-details');
        $(hex).removeData('hexStateId'); // Clean up the stored ID
    } else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') {// Transition to square
        // Preload the hexagon data if not already loaded
        if (!$(hex).hasClass('hex-loaded')) {
            window.HexagonLazyLoader.preloadHexagon('.hexagons.server', serverName);
        }

        // Get the hexagon's background color to use for the modal header
        const hexagonColor = $(hex).find('.hex_inner').css('background-color');

        var influx = initializeChart(serverName, container, hexagonColor);
        const hexId = transitionHexToSquare(hex, container, animTime, influx, 'server-details');
        // console.log('Storing hexId:', hexId);
        $(hex).data('hexStateId', hexId); // Store the hex ID for later retrieval
    }
}

var titleHeight = 0;
function initializeChart(serverName, container, hexagonColor = null) {

    // Create the outer div element with flexbox layout
    let containerDiv = document.createElement('div');
    containerDiv.style.transform = 'scaleX(-1)';
    containerDiv.id = 'server-details';
    containerDiv.style.display = 'flex';
    containerDiv.style.flexDirection = 'column';
    containerDiv.style.height = '100%';
    containerDiv.style.overflow = 'auto';

    // Create title container
    let titleDiv = document.createElement('h1');
    titleDiv.innerHTML = `<i class="fas fa-server" style="margin-right: 8px;"></i>${serverName}`;

    // Apply hexagon color to h1 background if provided
    if (hexagonColor) {
        titleDiv.style.background = hexagonColor;
        titleDiv.style.color = 'white';
        titleDiv.style.margin = '0';
        titleDiv.style.padding = '20px 24px';
        titleDiv.style.borderRadius = '8px 8px 0 0';
    } else {
        // Fallback styling similar to activity details
        $(titleDiv).css({ padding: '20px 0px 0px 0px', margin: '0px' });
    }

    containerDiv.appendChild(titleDiv);

    // Create loading indicator for server summary
    let loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = '<div class="spinner"></div><span class="loading-text">Loading server details...</span>';
    containerDiv.appendChild(loadingDiv);

    requestAnimationFrame(() => {
        titleHeight = $(titleDiv).outerHeight(true);
    });

    // First, get server details for summary cards
    fetchServerDetails(serverName)
        .then(serverDetails => {
            // Remove loading indicator
            $(loadingDiv).remove();

            if (serverDetails && serverDetails.success) {
                // Create summary section with cards
                let summaryDiv = document.createElement('div');
                summaryDiv.className = 'server-summary';
                summaryDiv.innerHTML = createServerSummaryHTML(serverDetails.data);
                containerDiv.appendChild(summaryDiv);
            }

            // Then load chart data
            return loadChartData(serverName, containerDiv, container);
        })
        .catch(error => {
            console.error(`Failed to load server details for ${serverName}:`, error);
            $(loadingDiv).remove();

            // Show error message in the container
            const errorDiv = document.createElement('div');
            errorDiv.style.padding = '20px';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.color = '#ff6b6b';
            errorDiv.innerHTML = `
                <h3>Server Details Unavailable</h3>
                <p>Unable to load server details for ${serverName}</p>
                <small>${error.message}</small>
            `;
            containerDiv.appendChild(errorDiv);
        });

    // Return the container div immediately
    return containerDiv;
}

/**
 * Fetch server details for summary cards
 */
function fetchServerDetails(serverName) {
    const detailsParams = {
        action: 'details',
        host: serverName
    };

    return fetch(`/index.php?page=server&${new URLSearchParams(detailsParams)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
}

/**
 * Load chart data and render charts
 */
function loadChartData(serverName, containerDiv, container) {
    // Use the existing chart API endpoint
    let req = {
        action: 'chart',
        host: serverName,
        duration: 1,
        startDate: selectedDates.start.format('YYYY-MM-DD'),
        endDate: selectedDates.end.format('YYYY-MM-DD'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return fetch(`server.php?${new URLSearchParams(req)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(callback => {
            if (!callback.success) {
                throw new Error(callback.error || 'Failed to load chart data');
            }

            var data = callback.data;
            renderCharts(containerDiv, data, container, serverName);
        })
        .catch(error => {
            console.error(`Failed to load chart data for ${serverName}:`, error);

            // Show error message for charts only
            const errorDiv = document.createElement('div');
            errorDiv.style.padding = '20px';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.color = '#ff6b6b';
            errorDiv.innerHTML = `
                <h3>Chart Data Unavailable</h3>
                <p>Unable to load chart data for ${serverName}</p>
                <small>${error.message}</small>
            `;
            containerDiv.appendChild(errorDiv);
        });
}

/**
 * Create server summary HTML template (similar to activity summary)
 */
function createServerSummaryHTML(serverData) {
    // Calculate percentage values for display
    const memPercent = serverData.maxmem ? ((serverData.mem / serverData.maxmem) * 100).toFixed(1) : 0;
    const diskPercent = serverData.maxdisk ? ((serverData.disk / serverData.maxdisk) * 100).toFixed(1) : 0;
    const availabilityPercent = serverData.availability ? (serverData.availability * 100).toFixed(2) : 0;
    const uptime = serverData.uptimeHR || 'N/A';

    return `
        <div class="summary-item">
            <div class="summary-label">Uptime</div>
            <div class="summary-value">${uptime}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Availability</div>
            <div class="summary-value">${availabilityPercent}%</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Memory Usage</div>
            <div class="summary-value">${memPercent}%</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Disk Usage</div>
            <div class="summary-value">${diskPercent}%</div>
        </div>
    `;
}

/**
 * Render charts in the container
 */
function renderCharts(containerDiv, data, container, serverName) {
    const keys = ["cpu", "mempercent", "diskpercent"];
    const filteredKeys = Object.keys(data).filter(key => keys.includes(key));

    // Create charts wrapper with proper styling (similar to activity charts)
    let chartsWrapper = document.createElement('div');
    chartsWrapper.style.padding = '10px';
    chartsWrapper.style.background = '#f8f9fa';
    chartsWrapper.style.flex = '1'; // Take remaining space
    chartsWrapper.style.display = 'flex';
    chartsWrapper.style.flexDirection = 'column';

    filteredKeys.forEach(function (key, index) {
        // Create a canvas element for each key
        let canvas = document.createElement('canvas');
        canvas.id = 'dash-chart-' + key;

        // Append the canvas to the charts wrapper instead of directly to container
        chartsWrapper.appendChild(canvas);

        let chartData = data[key];
        let labels = Object.keys(chartData);
        let points = Object.values(chartData);

        // Create the dataset
        var dataset = {
            label: key,
            data: points,
            backgroundColor: getRandomColor(index) + '20', // Add transparency like in activity charts
            borderColor: getRandomColor(index),
            fill: false, // Remove fill under the line
            tension: 0.4, // Smooth lines like activity charts
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: getRandomColor(index),
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
        };

        // Create a new chart inside each canvas with dynamic aspect ratio
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [dataset],
            },
            options: {
                responsive: true,
                aspectRatio: (container.width / (container.height - titleHeight)) * filteredKeys.length,
                plugins: {
                    title: {
                        display: true,
                        text: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
                        font: {
                            size: 14
                        },
                        color: '#343a40',
                    },
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        borderColor: getRandomColor(index),
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                const value = key === 'cpu' ? context.raw : (context.raw * 100).toFixed(2);
                                const unit = key === 'cpu' ? '' : '%';
                                return `${context.dataset.label}: ${value}${unit}`;
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
                                return index % 2 === 0 ? this.getLabelForValue(val) : '';
                            },
                        },
                    },
                    y: {
                        grid: {
                            color: '#e9ecef',
                            borderColor: '#dee2e6'
                        },
                        ticks: {
                            color: '#6c757d',
                            callback: function (val, index) {
                                if (key === 'cpu') {
                                    return val;
                                } else {
                                    const roundedPercentage = (val * 100).toFixed(2);
                                    return `${roundedPercentage}%`;
                                }
                            },
                        },
                    },
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            },
        });
    });

    // Append the charts wrapper to the container
    containerDiv.appendChild(chartsWrapper);
}
