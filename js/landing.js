/////////////
//Global variables
var animationPaused = false;// Global flag to control expand animations
var original = {};// Store original values
var center;

$(document).ready(function () {

	// Wait for images to load then execute scripts
	$('.hexagons').waitForImages(function () {
		$('.hexagons').hexagons(function (elems) {// Set up hexagons

			// Programmatically set container div height and width
			// var hexWidth = elems.pop().selector.outerWidth(true);
			// var hexHeight = elems.pop().selector.outerHeight(true);
			// var rows = _.maxBy(elems, 'row').row + 1;
			// var cols = _.maxBy(elems, 'col').col + 1;
			// var divWidth = (hexWidth / 2 + hexWidth / 4 + 10) * cols + hexWidth / 4 - 10;
			// var divHeight = (hexHeight + 10) * rows - 10;
			// $('.landing').css({ 'width': divWidth, 'height': divHeight });

			center = (elems.find(elem => elem.classes.includes('logo')) || {}).corner;// Save centerpoint of 'logo' class
			var animating = _.remove(elems, function (e) { return !(e.class === 'logo' || e.class === 'invisible'); });// Remove invisible and logo classes
			animating.forEach(function (e) {
				$('.hexagons').on('mouseenter', () => expand(e.selector, center, e.corner, 25, 1));
				$('.hexagons').on('mouseleave', () => expand(e.selector, center, e.corner, 0, 1));
			});

		}, {
			hexWidth: 275,
		});
		$('.hexagons').fadeIn(10); // Fade in when loaded
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
					const color = colorThief.getColor(image);
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

function openDetails(hex) {
	const animTime = 500; // Animation time in milliseconds
	const $hexParent = $(hex).parent();
	const $hexInner = $(hex).find('.hex_inner');

	if ($hexInner.hasClass('squared')) {
		animationPaused = false;

		// Reapply original values
		$hexParent.css({
			position: 'absolute',
			width: original.width,
			height: original.height,
			left: original.left,
			top: original.top,
			opacity: '100%',
			'z-index': 'auto',
			transition: `position ${animTime}ms ease-in-out, width ${animTime}ms ease-in-out, height ${animTime}ms ease-in-out`,
		});

		$hexInner.removeClass('squared');

		$hexInner.on('mouseenter', () => flipForward($hexParent, animTime, original.color.match(/\(([^)]+)\)/)[1]))
			.on('mouseleave', () => flipBack($hexParent, animTime));
	} else {

		// Update original values
		original = {
			height: $hexParent.css('height'),
			width: $hexParent.css('width'),
			left: $hexParent.css('left'),
			top: $hexParent.css('top'),
		};

		setTimeout(function () {
			original.color = $hexInner.find('.inner-span').css('background-color');
		}, animTime / 2);

		expand($hexParent, center, original, 0, 1); // Stop animation, return div to center

		$hexInner.addClass('squared').css({
			width: '100%',
			height: '100%',
			transition: `all ${animTime}ms ease-in-out`,
		}).off('mouseenter mouseleave');

		$hexParent.css({
			position: 'absolute',
			width: '100%',
			height: '30vh',
			left: '0px',
			opacity: '90%',
			'z-index': 1,
			transition: `width ${animTime}ms ease-in-out, height ${animTime}ms ease-in-out`,
		});

		$(hex).css({
			width: '100%',
			height: '100%',
		});

		animationPaused = true;
	}
}
