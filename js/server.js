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

let $clone;
function openServerDetails(hex, serverName) {
    const animTime = 500;// Animation time in milliseconds
    const $hexParent = $(hex).parent();// Cache selectors
    const $hexInner = $(hex).find('.hex_inner');
    console.log(hex);
    // Modified flipForward and flibBack functions to add "third flip" when clicked
    if ($hexInner.hasClass('squared')) {// Hex is in square mode

        const originalClasses = {// Clone the node and store the original classes
            hexParent: $clone.attr('style'),
            hexInner: $clone.find('.hex_inner').attr('style')
        };
        console.log(originalClasses);

        $hexParent.replaceWith($clone);
        $clone.find('.hex_inner').on('mouseenter', function () {
            flipForward($clone, animTime, null);
        }).on('mouseleave', function () {
            flipBack($clone, animTime);
        });
    } else {// Else needs to be squared
        $clone = $hexParent.clone()// Clone the node
        const originalClasses = {// Clone the node and store the original classes
            hexParent: $hexParent.attr('class'),
            hexInner: $hexInner.attr('class')
        };

        $hexParent.css({
            position: 'fixed', // Change to fixed for absolute centering
            width: '100%',
            height: '65vh',
            left: 0, // Set the left position to the center
            top: 0, // Set the top position to the center
            opacity: '90%',
            'z-index': 1,
            transition: `all ${animTime}ms ease-in-out`,
        })

        $(hex).css({
            width: '100%',
            height: '100%',
        });

        $hexInner.toggleClass('squared')
            .css({
                width: '100%',
                height: '100%',
                backgroundColor: 'white',
                transition: `all ${animTime}ms ease-in-out`,
            })
            .off('mouseenter mouseleave')

        if ($hexParent.hasClass('flipped')) {// Flip Back

            $hexParent.addClass('flip-back')
            setTimeout(function () {
                $hexParent.find('.inner-text-flipped').css('visibility', 'hidden');
                setTimeout(function () {
                    $hexParent.removeClass('flipping flipped flip-back');
                }.bind(this), animTime / 2);
            }.bind(this), animTime / 2);

        } else {// Flip Forward

            $hexParent.addClass('flipping');
            setTimeout(function () {
                $hexParent.find('.inner-title').hide();
                $hexParent.find('.inner-text-flipped').css('visibility', 'hidden');
                setTimeout(function () {
                    $hexParent.addClass('flipped');
                }.bind(this), animTime / 2);
            }.bind(this), animTime / 2);
        }

    }

}