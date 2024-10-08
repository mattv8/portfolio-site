/////////////
//Global variables
var animationPaused = false;// Global flag to control expand animations
var original = [];// Store original values
var center;
var breakpoint = 1000;// When to switch to mobile

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

	const animTime = 500; // Animation time in milliseconds
	const $hexParent = $(hex).parent();
	const $hexInner = $(hex).find('.hex_inner');
	const $innerText = $(hex).find('.inner-text-flipped > p');
	const $hexWrappers = $(hex).find('.hex-wrap-before, .hex-wrap-after');
	const currentWidth = $(window).width();
	const currentHeight = $(window).height();
	const mobile = {
		height: (currentWidth <= breakpoint) ? currentHeight - 20 : height,
		width: (currentWidth <= breakpoint) ? '100%' : width,
		top: (currentWidth <= breakpoint) ? '0px' : '10%',
	}

	if ($hexInner.hasClass('squared')) {// Transition back to hex state
		animationPaused = false;

		// Reapply original CSS
		$hexParent.css({
			position: 'absolute',
			width: original[id].width.parent,
			height: original[id].height.parent,
			left: original[id].left,
			top: original[id].top,
			'z-index': 'auto',
			translate: '0%',
			transition: `position ${animTime}ms ease-in-out, width ${animTime}ms ease-in-out, height ${animTime}ms ease-in-out`,
		});
		$hexInner.css({
			height: original[id].height.inner,
			width: original[id].width.inner,
		})
		$hexWrappers.css('display', 'block');
		$innerText.css({ padding: original[id].padding });
		$hexInner.removeClass('squared').css({
			height: original[id].height,
		});
		$hexInner.on('mouseenter', () => flipForward($hexParent, animTime, original[id].color.match(/\(([^)]+)\)/)[1]));
		$hexInner.on('mouseleave', () => flipBack($hexParent, animTime));
		$(`#${id}_inner`).remove();

	} else if ($hexInner.find('.inner-text-flipped').css('visibility') === 'visible') {// Transition to square

		// Update original CSS values
		original[id] = {
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
			color: $hexInner.find('.inner-span').css('background-color'),
		};

		// Set height property first so $hexParent.finalHeight() will be correct
		$hexParent.css({
			height: mobile.height,
		});

		// Do the GET request for inner HTML from the respective template
		let req = {
			page: 'landing',// landing.php
			request: 'getInnerHTML',
			id: id,
		};
		$.get("index.php?" + $.param(req), function (data) {

			let $html = $(data);// Create a new jQuery object from the HTML string
			$html.attr('id', `${id}_inner`);// Set the id attribute on the jQuery object

			const containerHeight = $hexParent.finalHeight() - $innerText.finalHeight();
			$html.css({
				height: containerHeight,
				transform: 'scaleX(-1)',
				overflow: 'scroll',
				padding: 'none',
			});

			// Calculate contrast ratio and determine text color
			const color = getContrastRatio(original[id].color, 'white') > 0.02 ? 'white' : 'black';

			$html.find('p, h1, h2, h3').css('color', color);// Set text color within $html
			$html.find('#divider').css('border-color', color);// Set the border color within $html

			$hexInner.find('.inner-span').append($html);// Append the modified HTML

		}).then(function () {

			expand($hexParent, center, original, 0, 1); // Stop animation, return div to center

			$hexParent.css({
				width: mobile.width,
				position: 'absolute',
				left: '50%',
				translate: '-50%',
				top: mobile.top,
				'z-index': 1,
				transition: `all ${animTime}ms ease-in-out`,
			});

			$hexInner.addClass('squared').css({
				width: '100%',// Do not change this number!
				height: mobile.height,
				transition: `all ${animTime}ms ease-in-out`,
			}).off('mouseenter mouseleave');

			$hexWrappers.css('display', 'none');

			$innerText.css({
				padding: '10px',
				transition: `padding ${animTime}ms ease-in-out`,
			});

			animationPaused = true;

		});

	}
}