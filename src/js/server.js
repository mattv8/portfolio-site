/////////////
//Global variables
var breakpoint = 1000;// When to switch to mobile

// Starting point for charts
var selectedDates = {
    start: moment().startOf('week'),
    end: moment().startOf('week').clone().add(7, 'days')
};

var influxCanvas;

// Wait for images to load then execute scripts
$(document).ready(function () {

    $('.hexagons').hexagons(function (elems, spawnPoint, settings, containerDims) {// Set up hexagons

        $('.hex.running').each(function () {
            $(this).find('.hex_inner').css("background-color", "green");
        })

        $('.hex.stopped').each(function () {
            $(this).find('.hex_inner').css("background-color", "gray");
        })

        // const currentHeight = $(window).height();
        // $('.hexagons').css({
        //     top: currentHeight <= containerDims.height ? '0px' : '50%',
        //     // transform: currentHeight <= containerDims.height ? `translate(${leftTranslate}, 10px)` : 'translate(-50%, -50%)',
        // });

    }, {
        hexWidth: 200,
    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});

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


    // Modify the AJAX request parameters
    let req = {
        request: 'getChartData',
        serverName: serverName,
        startDate: selectedDates.start.format('YYYY-MM-DD'),
        endDate: selectedDates.end.format('YYYY-MM-DD'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    $.get("server.php?" + $.param(req), function (callback) {
        // Extract JSON
        callback = JSON.parse(callback);
        var data = callback.data;

        const keys = ["cpu", "mempercent", "diskpercent"];

        const filteredKeys = Object.keys(data).filter(key => keys.includes(key));// Filter out keys not in the keys array

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
                                    const roundedPercentage = (val * 100).toFixed(2); // Rounds to 2 decimal places
                                    return `${roundedPercentage}%`;
                                },
                            },
                        },
                    },
                },
            });
        });
    });

    // Return the container div with the canvases
    return containerDiv;
}
