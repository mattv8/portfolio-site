/////////////
//Global variables
var original = {};// Store original values
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
    const $hexParent = $(hex).parent();
    const $hexInner = $(hex).find('.hex_inner');
    const $hexFlipText = $(hex).find('.inner-text-flipped');
    const $hexWrappers = {
        before: $(hex).find('.hex-wrap-before'),
        after: $(hex).find('.hex-wrap-after'),
    }

    var currentWidth = $(window).width();// Get width of window
    var currentHeight = $(window).height();// Get width of window
    var container = {// Dynamic hex width
        height: (currentWidth <= breakpoint) ? $(window).height() * .98 : $container.height(),
        width: (currentWidth <= breakpoint) ? $container.width() : $container.width() * .8,
        top: (currentHeight <= $container.height()) ? `${window.scrollY}px` : '0px',
    }
    console.log(container.top);

    if ($hexInner.hasClass('squared')) {// Transition back to hex state

        if ($hexInner.find('#server-details').length) {
            $hexInner.find('#server-details').remove();
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
        })
        $hexInner.css({ backgroundColor: original.color });
        $hexFlipText.css({ display: 'block' });
        $hexWrappers.before.add($hexWrappers.after).css('display', 'block');
        $hexInner.removeClass('squared').css({ height: original.height });
        $hexInner.on('mouseenter', () => flipForward($hexParent, animTime, original.color.match(/\(([^)]+)\)/)[1]));
        $hexInner.on('mouseleave', () => flipBack($hexParent, animTime));
        flipBack($hexParent, animTime);// Flip back to details

    } else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') {// Transition to square

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
        var influx = initializeChart(serverName, container);
        $hexInner.find('.inner-span').append(influx);

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
