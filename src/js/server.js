/////////////
//Global variables
var breakpoint = 1000;// When to switch to mobile

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

                    console.log(`✅ Updated server: ${hexInfo.identifier}`);
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
    console.log(container.top);

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

        var influx = initializeChart(serverName, container);
        const hexId = transitionHexToSquare(hex, container, animTime, influx, 'server-details');
        // console.log('Storing hexId:', hexId);
        $(hex).data('hexStateId', hexId); // Store the hex ID for later retrieval
    }
}

var titleHeight = 0;
function initializeChart(serverName, container) {

    // Create the outer div element
    let containerDiv = document.createElement('div');
    containerDiv.style.transform = 'scaleX(-1)';
    // containerDiv.className = 'column';
    containerDiv.id = 'server-details';

    let titleDiv = document.createElement('h1');
    titleDiv.innerHTML = `${serverName}`;
    $(titleDiv).css({ padding: '20px 0px 0px 0px', margin: '0px' });
    containerDiv.appendChild(titleDiv);

    requestAnimationFrame(() => {
        titleHeight = $(titleDiv).outerHeight(true);
    });

    // Use the new API endpoint with caching
    let req = {
        action: 'chart',
        host: serverName,
        duration: 1,
        startDate: selectedDates.start.format('YYYY-MM-DD'),
        endDate: selectedDates.end.format('YYYY-MM-DD'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Use fetch for better error handling and modern async
    fetch(`server.php?${new URLSearchParams(req)}`)
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

            // Show error message in the container
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

    // Return the container div immediately
    return containerDiv;
}

/**
 * Render charts in the container
 */
function renderCharts(containerDiv, data, container, serverName) {
    const keys = ["cpu", "mempercent", "diskpercent"];
    const filteredKeys = Object.keys(data).filter(key => keys.includes(key));

    filteredKeys.forEach(function (key, index) {
        // Create a canvas element for each key
        let canvas = document.createElement('canvas');
        canvas.id = 'dash-chart-' + key;
        canvas.style.padding = '20px';

        // Append the canvas to the container div
        containerDiv.appendChild(canvas);

        let chartData = data[key];
        let labels = Object.keys(chartData);
        let points = Object.values(chartData);

        // Create the dataset
        var dataset = {
            label: key,
            data: points,
            backgroundColor: getRandomColor(index),
            borderColor: getRandomColor(index),
            fill: true,
            tension: 0,
            borderJoinStyle: 'round',
        };

        // Create a new chart inside each canvas
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [dataset],
            },
            options: {
                responsive: true,
                aspectRatio: (container.width / (container.height - titleHeight)) * keys.length,
                plugins: {
                    title: {
                        display: true,
                        text: key,
                        font: { size: '14px' },
                    },
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            callback: function (val, index) {
                                return index != 0 && index % 2 === 0 ? this.getLabelForValue(val) : '';
                            },
                        },
                    },
                    y: {
                        ticks: {
                            callback: function (val, index) {
                                const roundedPercentage = (val * 100).toFixed(2);
                                return `${roundedPercentage}%`;
                            },
                        },
                    },
                },
            },
        });
    });
}
