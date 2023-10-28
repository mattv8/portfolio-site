/////////////
//Global variables
var original = {};// Store original values
var breakpoint = 1000;// When to switch to mobile


// Wait for images to load then execute scripts
$(document).ready(function () {

    $('.hexagons').hexagons(function (elems) {// Set up hexagons
        $('.hex.running').each(function () {
            $(this).find('.hex_inner').css("background-color", "green");
        })

        $('.hex.stopped').each(function () {
            $(this).find('.hex_inner').css("background-color", "gray");
        })

    }, {
        hexWidth: 250,
    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});

function openDetails(hex, serverName) {
    const animTime = 500; // Animation time in milliseconds
    const $hexParent = $(hex).parent();
    const $hexInner = $(hex).find('.hex_inner');
    const $innerText = $(hex).find('p');
    const $hexWrappers = {
        before: $(hex).find('.hex-wrap-before'),
        after: $(hex).find('.hex-wrap-after'),
    }

    var currentWidth = $(window).width();// Get width of window
    var mobile = {// Dynamic hex width
        height: (currentWidth <= breakpoint) ? '80vh' : '50vh',// vh = % of viewport height
        width: (currentWidth <= breakpoint) ? '100%' : '80%',
    }

    // Pull static logo HTML from the DOM
    const $innerDiv = $("#server-details");

    if ($hexInner.hasClass('squared')) {// Transition back to hex state
        $innerDiv.hide();

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
        $hexInner.css({ backgroundColor: original.color })
        $hexWrappers.before.add($hexWrappers.after).css('display', 'block');
        $innerText.css({ padding: original.padding });
        $hexInner.removeClass('squared').css({ height: original.height });
        $hexInner.on('mouseenter', () => flipForward($hexParent, animTime, original.color.match(/\(([^)]+)\)/)[1]));
        $hexInner.on('mouseleave', () => flipBack($hexParent, animTime));
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
            padding: $innerText.css('padding'),
            color: $hexInner.css('background-color'),
        };

        // Append Github and GitLab logos
        if (!$hexInner.find('#server-details').length) {
            $hexInner.find('.inner-span').append($innerDiv);
        }
        $innerDiv.show();

        $hexInner.addClass('squared').css({
            width: '100%', // Do not change this number!
            height: mobile.height,
            transition: `all ${animTime}ms ease-in-out`,
            backgroundColor: 'white',
        }).off('mouseenter mouseleave');

        $hexInner.find('.inner-span').css({
            backgroundColor: 'white',
            transition: `all ${animTime}ms ease-in-out`,
        });

        $hexParent.css({
            width: mobile.width,
            position: 'absolute',
            left: '50%',
            translate: '-50%',
            'z-index': 1,
            transition: `all ${animTime}ms ease-in-out`,
        });

        $hexWrappers.before.add($hexWrappers.after).css('display', 'none');

        $innerText.css({
            padding: '10px',
            transition: `padding ${animTime}ms ease-in-out`,
        })

    }

}
