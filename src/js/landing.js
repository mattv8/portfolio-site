/////////////
//Global variables
var animationPaused = false;// Global flag to control expand animations
var original = [];// Store original values
var center;
var breakpoint;
if (typeof breakpoint === 'undefined') {
	breakpoint = 1000;// When to switch to mobile
}

// Fetch GitLab last commit and update footer with the timestamp
$.get("index.php?request=getLastCommitTime", function (data) {
	let lastCommitData = JSON.parse(data);
	$('#last-updated').text(lastCommitData.last_commit);// Update footer span with the last commit timestamp
});

$(document).ready(function () {

	// Wait for images to load then execute scripts
	$('.hexagons').waitForImages(function () {
		$('.hexagons').hexagons(function (elems, spawnPoint, settings) {// Set up hexagons

			center = (elems.find(elem => elem.classes.includes('logo')) || {}).corner;// Save centerpoint of 'logo' class
			var animating = _.remove(elems, function (e) { return !(e.classes.includes('logo') || e.classes.includes('invisible')); }); // Remove invisible and logo hexagons
			animating.forEach(function (e) {
				$('.hexagons').on('mouseenter', () => expand(e.selector, center, e.corner, 25, 1));
				$('.hexagons').on('mouseleave', () => expand(e.selector, center, e.corner, 0, 1));
			});
		}, {
			hexWidth: 275,
			radius: 10,
		});
		$('.hexagons, .footer').fadeIn(10); // Fade in when loaded
	});

});// END $(document).ready( )


// This function calculates the slope of the line between the center and start points and uses it to determine the direction of the animation.
function expand(selector, center, start, animationDistance, timing, pauseable = false) {

	$(selector).stop(true, false);// Stop previous animations if expand() is called again

	let slope = (start.top - center.top) / (start.left - center.left);

	// Set the direction of the animation. 1 for right or up, -1 for left or down
	let direction = 1;
	if (center.left > start.left) {
		direction = -1;
	}

	let newLeft = start.left;
	let newTop = start.top;

	// If the start and center points have the same x coordinate, move vertically
	if (start.left === center.left) {
		if (center.top > start.top) {
			direction = -1;
		}
		newTop = start.top + direction * animationDistance;
	} else {
		newLeft = start.left + direction * animationDistance / Math.sqrt(1 + slope * slope);
		newTop = start.top + direction * slope * animationDistance / Math.sqrt(1 + slope * slope);
	}

	if ($(window).width() > 1000 && !animationPaused) {
		// jQuery's animate method to animate the element to the new position
		$(selector).animate({
			left: newLeft,
			top: newTop
		}, {
			duration: timing * 1000,
			easing: "swing"
		});
	}
}


function shuffleImages(selector) {
	const animTime = 500;

	// Cache all hexagons that need to be flipped
	const $hexagons = $('.hexagons.landing').find('.hex').not('.hex.logo, .hex.invisible');

	// Limit concurrency to 3 because browsers usually support 6-10 concurrent connections per domain.
	const maxConcurrency = 3;
	let counter = 0;

	async function processNextBatch() {
		for (let i = 0; i < maxConcurrency && counter < $hexagons.length; i++, counter++) {
			const $hex = $hexagons.eq(counter);// Pick up where we left off (same as $($hexagons[counter]) )
			const $hexInner = $hex.find('.hex_inner');
			const previousImage = $hexInner.css('background-image').match(/[^/]+(?="\)$)/)[0];
			flipBack($hex, animTime);
			const { success, newImage, msg } = await $.ajax({
				url: 'landing.php',
				type: 'GET',
				data: { previousImage },
				dataType: 'json',
			});
			if (success) {
				// initialize colorThief outside onload function
				const colorThief = new ColorThief();
				// use arrow function to simplify code
				const img = new Promise(resolve => {
					const img = new Image(360, 360);
					img.onload = () => {
						resolve(img);
					};
					img.src = newImage;
				});
				// Put all operations dependent on the promise inside anonymouse async function to wait for promise resolution
				(async () => {
					const image = await img;// Utilize destructuring to simplify code
					const palette = colorThief.getPalette(image, 5);// Get a palette of colors
					const color = _.sample(palette);// Choose one color at random
					$hexInner.css({
						'background-image': `url('${newImage}')`,
						transition: `background-image ${animTime}ms ease-in-out`,
					});
					$hexInner.on('mouseenter', () => flipForward($hex, animTime, color));
					$hexInner.on('mouseleave', () => flipBack($hex, animTime));
				})();
			} else {
				console.log(msg);
			}
		}
		if (counter < $hexagons.length) await processNextBatch();// Recursive call
	};

	processNextBatch();
}

function squareHex(hex, id, height, width) {
	const animTime = 500;
	const $hexInner = $(hex).find('.hex_inner');

	if ($hexInner.hasClass('squared')) {
		// Transition back to hex state
		animationPaused = false;
		const hexId = $(hex).data('hexStateId');
		if (hexId) {
			transitionSquareToHex(hex, hexId, animTime, `${id}_inner`);
			$(hex).removeData('hexStateId');
		}
		return;
	}

	if ($hexInner.find('.inner-text-flipped').css('visibility') !== 'visible') return;

	// Transition to square state
	const $hexParent = $(hex).parent();

	// Stop any ongoing expand animations to ensure proper centering
	$hexParent.stop(true, false);

	const $innerText = $(hex).find('.inner-text-flipped > p');
	const $hexWrappers = $(hex).find('.hex-wrap-before, .hex-wrap-after');
	const currentWidth = $(window).width();
	const currentHeight = $(window).height();
	const isMobile = currentWidth <= breakpoint;

	const mobile = {
		height: isMobile ? currentHeight - 20 : height,
		width: isMobile ? '100%' : width,
		top: isMobile ? '0px' : '10%',
	};

	// Store original state
	const original = {
		height: { inner: $hexInner.css('height'), parent: $hexParent.css('height') },
		width: { inner: $hexInner.css('width'), parent: $hexParent.css('width') },
		left: $hexParent.css('left'),
		top: $hexParent.css('top'),
		// translate: $hexParent.css('translate') || '0%',
		color: $hexInner.find('.inner-span').css('background-color'),
		padding: $innerText.css('padding'),
		innerSpan: {
			height: $hexInner.find('.inner-span').css('height'),
			display: $hexInner.find('.inner-span').css('display'),
			flexDirection: $hexInner.find('.inner-span').css('flex-direction'),
			overflow: $hexInner.find('.inner-span').css('overflow')
		},
		innerTextFlipped: {
			height: $hexInner.find('.inner-text-flipped').css('height'),
			transition: $hexInner.find('.inner-text-flipped').css('transition') || ''
		},
		innerTextP: {
			padding: $innerText.css('padding'),
			transition: $innerText.css('transition') || ''
		},
		flipColor: null,
	};

	const hexId = window.HexagonStateManager.store(hex, original);
	$(hex).data('hexStateId', hexId);
	$hexParent.css({ height: mobile.height });

	// Load content and apply styles
	$.get("index.php?" + $.param({ page: 'landing', request: 'getInnerHTML', id }))
		.done(function(data) {
			const $html = $(data).attr('id', `${id}_inner`);
			const containerHeight = $hexParent.finalHeight() - $innerText.finalHeight();

			$html.css({
				height: containerHeight,
				transform: 'scaleX(-1)',
				overflow: 'hidden',
				padding: '0',
				display: 'flex',
				flexDirection: 'column',
				boxSizing: 'border-box'
			});

			// Apply contrast-based text colors
			const textColor = getContrastRatio(original.color, 'white') > 0.02 ? 'white' : 'black';
			$html.find('p, h1, h2, h3').css('color', textColor);
			$html.find('#divider').css('border-color', textColor);

			$hexInner.find('.inner-span').append($html);
		})
		.then(function() {
			// Apply all transformations
			Object.assign($hexParent[0].style, {
				width: mobile.width,
				position: 'absolute',
				left: '50%',
				translate: '-50%',
				top: mobile.top,
				zIndex: '1',
				transition: `all ${animTime}ms ease-in-out`
            });

            Object.assign($hexInner[0].style, {
                width: '100%',
                height: mobile.height,
                overflow: 'hidden'
            });

			$hexInner.addClass('squared').off('mouseenter mouseleave');
			$hexWrappers.css('display', 'none');

			$innerText.css({ padding: '10px', transition: `padding ${animTime}ms ease-in-out` });
			$innerText.parent().css({ transition: `height ${animTime}ms ease-in-out`, height: 'auto' });

			$hexInner.find('.inner-span').css({
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden'
			});

			animationPaused = true;
		});
}

/*
* Cleanup function for landing page variables
*/
function cleanupLanding() {
	// Reset global variables
	animationPaused = false;
	original = [];
	center = null;

	// Clear any running animations specific to landing page
	$('.hexagons.landing .hex').stop(true, true);
}