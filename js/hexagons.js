/*
	Hexagon Building Code
	Written by Matthew Visnovsky
	(c) 2023
*/

(function ($) {

	$.fn.hexagons = function (callback, options) {

		// Defaults. Can be overridden by options input.
		var settings = $.extend({
			hexWidth: 300,
			margin: 10,
			breakpoint: 1000,
			rows: 3,
			cols: 3,
			radius: 5,
		}, options);

		// Cached Selectors
		const $container = this;
		const $invisible = $('.invisible');

		/*
		* Initialization of the Hexagon DOM. Done asynchronously so objects are returned in proper timing.
		*/
		async function initialize() {

			await buildHtml();// Build the initial DOM
			let elems = reorder(true, false);// Arrange the hexagons, save cornerpoints
			$(window).resize(function () {
				debouncedReorder(true, true);// Debounced reorder() function when window resizes
			});
			return elems;

		}// END initialize(container)


		/*
		* All DOM building must go here. Function is called at end of script.
		* This is to prevent half-loading of the page.
		*/
		async function buildHtml() {

			$container.find('.hex').append('<div class="hex_inner"></div>');
			$container.find('.hex_inner').append('<div class="inner-span"><div class="inner-title"></div></div>');
			$container.find('.inner-span').append('<div class="inner-text"></div>');

			// SVG defining the rounding of hex corners
			const svgFilter = `
			<svg style="visibility: hidden;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
				<filter id="rounded-edges"><feGaussianBlur in="SourceGraphic" stdDeviation="${settings.radius}" result="blur" />
					<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="rounded-edges" />
					<feComposite in="SourceGraphic" in2="rounded-edges" operator="atop"/>
				</filter>
			</svg>`;
			$container.append(svgFilter);

			// Hex Links
			$container.find('.hex.link').each(function () {
				var link = $(this).find("link").attr("href"); // Find its associated anchor
				if (link) { $(this).find('.hex_inner').wrap('<a href="' + link + '" class="hex_link"></a>'); } // wrap the <a></a>
			})

			// Hex Buttons
			$container.find('.hex.button').each(function () {
				var button = $(this).attr("onclick"); // Find its associated anchor
				if (button) {
					$(this).removeAttr('onclick');// Remove the extra onclick action
					$(this).find('.hex_inner').wrap('<button onclick="' + button + '" class="hex_button"></button>'); // wrap the <a></a>
				}
			})

			// Hex Image
			$container.find('.hex').each(function (hexId) {

				const $hex = $(this);

				var bg_img_src = $hex.find('.bg').attr('src');//Get uri's of class='bg' images
				var hvr_img_src = $hex.find('.hvr').attr('src');//Get uri's of class='hvr' images

				// Hex CSS Modifiers
				if ($hex.hasClass('rounded')) {
					$hex.css('filter', 'url(#rounded-edges) drop-shadow(-5px 5px 10px black)');
				} else {
					$hex.css('filter', 'drop-shadow(-5px 5px 10px black)');
				}

				// For hexagons with links or solid color hover backgrounds
				if (bg_img_src !== undefined) { //if image is defined

					// colorThief variables
					var img_obj = new Image(360, 360); // build image object
					img_obj.src = bg_img_src; //attach bg image uri
					var colorThief = new ColorThief(); // initialize colorThief
					var color = colorThief.getColor(img_obj); // Get the dominant color of image

					// Attach bg image
					$hex.find('.hex_inner').attr('style', `background-image: url("${bg_img_src}")`);// Attach bg image


					if (!$hex.hasClass('flip')) {// .flip is special class handled later
						$hex.mouseenter(function () {// When hovering, show dominant color of image
							$hex.find('.inner-span').attr('style', `transition: background-color 0.3s ease;  background-color: rgb(${color})`);
						});
						$hex.mouseleave(function () {// Remove background color
							$hex.find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color:none');
						});
					}
				}

				// For hexagons with an image when hovering
				if (hvr_img_src !== undefined) {// if hover image is defined
					$hex.mouseenter(function () {
						$hex.find('.inner-span').attr('style', `background-image: url("${hvr_img_src}")`);
					})
					$hex.mouseleave(function () {
						$hex.find('.inner-span').attr('style', 'background-image: none');
					})
				}

				// For hexagons with programmatically defined background colors
				if (bg_img_src === undefined) {// If image is not defined
					// Attach bg image and drop shadow
					$hex.find('.hex_inner').attr('style', 'background-color: white');
				}

				// For hexagons with inner text
				if ($hex.find('span').length > 0) { // If span is defined
					$hex.find('.inner-span .inner-title').html($hex.find('span')).attr('id', `title-${hexId}`);
				} else {
					$hex.find('.inner-span').remove();
				}

				// For hexagons with inner sub-text
				if ($hex.find('p').length > 0) {// If span is defined
					$hex.find('.inner-span .inner-text')
						.html($hex.find('p').html())
						.removeClass('inner-text')
						.addClass($hex.find('p').attr('class'));
					$hex.find('p').remove();
				} else {
					$hex.find('.inner-text').remove();
				}

				// For hexagons with flipped text
				const animTime = 500;// This must be same as CSS .flip and .flip-back time
				if ($hex.hasClass('flip')) {

					// Wrapped inner text
					$hex.find('.inner-text-flipped').attr('id', `fliptext-${hexId}`)// Add an ID
						.not('.no-wrap')
						.wrapInner('<p></p>')// This is the inner text content
						.prepend('<div class="hex-wrap-after"></div>')// shape-outside on the left
						.prepend('<div class="hex-wrap-before"></div>')// shape-outside on the right
						.css({
							'transform': 'scaleX(-1)',
						});

					// Non-wrapped inner text
					$hex.find('.inner-text-flipped.no-wrap').attr('id', `fliptext-${hexId}`)// Add an ID
						.wrapInner('<p></p>')// This is the inner text content
						.css({
							'position': 'absolute',
							'top': '50%',
							'left': '50%',
							'width': '100%',
							'transform': 'translate(-50%, -50%) scaleX(-1)',
						});

					$hex.find('.hex_inner').on({
						mouseenter: function () {
							flipForward($hex, animTime, color);
						},
						mouseleave: function () {
							flipBack($hex, animTime);
						}
					});
				}

			});// END $(container).find('.hex').each(function()

			$container.find('img, span, link, p').not('.inner-title > span, .inner-text-flipped > p').detach();// Hide hex builder tags

			$invisible.hide();// Remove invisible hexagons

		}// END buildHtml()


		/*
		* Div re-size animation function. Returns updated div dimensions.
		*/
		let prevWidth;
		const invisible = { el: $invisible, neighbor: $invisible.prev() }
		const logo = { el: $container.find('.logo'), neighbor: $container.find('.logo').prev() }
		const spawnPoint = centerpoint($container);// Get constant centerpoint of container
		async function reorder(animate, reorder) {

			var elem = Array(); // Initialize corners array
			var currentWidth = $(window).width();// Get width of window

			let hexWidth;// Initialize
			if (currentWidth <= settings.breakpoint) {// If window is smaller than breakpoint
				hexWidth = ($container.width() + settings.margin * 2) / 2;// Dynamic hex width
				if (currentWidth < settings.breakpoint && (prevWidth >= settings.breakpoint || !prevWidth)) {// Window is AT lower breakpoint
					invisible.el.detach();// Detach invisible element(s)
					$container.prepend($(logo.el))// Replace logo element(s)
				}
			} else {// Else window is larger than breakpoint
				hexWidth = settings.hexWidth;// Static hex width
				if (currentWidth >= settings.breakpoint && prevWidth < settings.breakpoint) {// Window is AT upper breakpoint
					$.each(logo.neighbor, function (i, neighbor) { $(logo.el[i]).insertAfter(neighbor); });// Replace logo element(s)
					$.each(invisible.neighbor, function (i, neighbor) { $(invisible.el[i]).insertAfter(neighbor); });// Replace invisible element(s)
				}
			}
			prevWidth = currentWidth;

			var hexHeight = (Math.sqrt(3) * hexWidth) / 2;

			var row = 0;// start at row 0
			var col = 0;// start at col 0
			var offset = 1;// 1 is down
			var left = (currentWidth <= settings.breakpoint) ? settings.margin : 0;// Add left margin if <= breakpoint
			var top = 0;// pos top

			spawnPoint.left = spawnPoint.top -= hexWidth / 2 + settings.margin;// Compensate for bounding box of hexagon element

			$container.find('.hex').each(function (i) {

				const $hex = $(this);

				// console.log(`Col: ${col}, "Row: ${row} Top: ${top} Left: ${left} Offset: ${offset}`);

				if (currentWidth <= settings.breakpoint) {
					top = (row * (hexHeight + settings.margin * 2)) + (col * (hexHeight / 2 + (settings.margin)));// determines top margin of hexagons
				} else {
					top = (row * (hexHeight + settings.margin)) + (offset * (hexHeight / 2 + (settings.margin / 2)));// determines top margin of hexagons
					offset ^= 1;// determines up/down in-line alignment of hexagons, alternating for every other column (using bitwise XOR "^" operator)
				}

				var topLevelClass = $hex.attr('class').split(' ')[1];
				elem[i] = { class: topLevelClass, corner: { left: left, top: top }, selector: $hex };

				// Set positional values
				if (animate && !reorder) {// animate if specified
					$hex.css('left', spawnPoint.left).css('top', spawnPoint.top + settings.margin * 2);// Set initial pos to center of container
					$hex.animate({ 'left': left, 'top': top });
				} 				// Update CSS value for this iteration
				else if (reorder) {// Reorder event
					$hex.stop(true, false);// Stop previous animations if reorder() is called again
					$hex.animate({ 'left': left, 'top': top });
				} else {
					$hex.css('left', left).css('top', top);
				}

				// Update values for the next iteration
				left += (hexWidth - (hexWidth / 4) + settings.margin);// determines left margin of hexagons

				if (left + hexWidth > $container.width()) {// "Wrap" to next row
					left = (currentWidth <= settings.breakpoint) ? settings.margin : 0;// Add left margin if <= breakpoint
					col = 0;// Reset
					row++;// Move to next row
					offset = 1;// Reset offset
				} else {
					col++;// Move to next column
				}

			});

			await updateScales(hexWidth, hexHeight, reorder);// Update hex width/height

			return elem;

		};// END reorder


		/*
		* Debounce reorder() using Lodash
		*/
		const debouncedReorder = _.debounce(reorder, 100);// Debounced resize with Lodash


		/*
		* Update all scale values
		*/
		let prevTextHeight;
		async function updateScales(hexWidth, hexHeight, reorder) {
			let textHeight;// initialize hex scale factor

			// Set container heights and widths
			$container.find('.hex').width(hexWidth).height(hexHeight);
			$container.find('.hex_inner').width(hexWidth).height(hexHeight);
			$container.find('.hex-wrap-before, .hex-wrap-after')// Sets the width and height of the shape-outside for text wrapping
				.width((1 / 2 * hexHeight) / Math.tan(60 * Math.PI / 180))// This calculates the width of a hex triangle
				.height(hexHeight);

			// Center flip text vertically in the div by adding calculated padding
			if (!reorder) {
				$container.find('.inner-text-flipped > p').each(function () {
					// var pLineHeight = parseInt(window.getComputedStyle(this).lineHeight);// Get the computed line-height
					// var padding = (hexHeight - this.offsetHeight - pLineHeight) / 2;
					var padding = (hexHeight - this.offsetHeight) / 2;
					$(this).attr('style', `padding: ${padding}px 0px;`);
				});
			}

			textHeight = hexHeight * .15;// Initial pixel height of text as percentage of hex height
			if (prevTextHeight !== textHeight) {
				$container.find('.hexagons, .inner-title').css({ 'font-size': textHeight + 'px' });// Set initial text height
				prevTextHeight = textHeight;
			}

			if (reorder) {
				scaleFonts(hexWidth);// Update hex title font
			} else {
				setTimeout(function () { scaleFonts(hexWidth); }, 150);// Update hex title font giving DOM enough time to build
			}

			function scaleFonts(hexWidth) {
				// Recalculate text height if it exceeds the boundaries of the hexagon
				var maxTitleWidth = hexWidth * 0.92; // Max width of .inner-title text relative to hexWidth
				var $elementsToUpdate = $container.find('.inner-title > span').filter(function () {
					return this.offsetWidth > maxTitleWidth;
				});
				$elementsToUpdate.each(function () {
					var $parent = $(this).parent();
					$parent.css({
						display: 'inline-block',
						width: maxTitleWidth,
						'font-size': (maxTitleWidth / this.offsetWidth) * textHeight + 'px'
					});
				});
			}

		}// END updateScales()


		/*
		* Local centerpoint function:
		* Returns object containing top and left position relative to input element
		*/
		function centerpoint(element) {
			let center;
			var position = element.position();
			var width = element.width();
			var height = element.height();
			return center = {
				left: position.left + width / 2,
				top: position.top + height / 2
			}
		}

		/*
		 * RETURNS
		*/
		return {
			each: this.each(function () {
				initialize(this).then(function (points) {
					if (callback) { callback(points); };
				});
			}),
		};

	} // END $.fn.hexagons = function(options) {}

}(jQuery));


function flipBack(elem, animTime) {
	if (elem.hasClass('flipped')) {
		elem.addClass('flip-back');
		setTimeout(function () {
			elem.find('.inner-title').show();
			elem.find('.inner-text-flipped').css('visibility', 'hidden');
			elem.css('filter', 'url(#rounded-edges) drop-shadow(-5px 5px 10px black)');
			elem.find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color:none');
			setTimeout(function () {
				elem.removeClass('flipping flipped flip-back');
			}.bind(this), animTime / 2);
		}.bind(this), animTime / 2);
	}
}


function flipForward(elem, animTime, color) {
	if (!elem.hasClass('flipped')) {
		elem.addClass('flipping');
		setTimeout(function () {
			elem.find('.inner-title').hide();
			elem.find('.inner-text-flipped').css('visibility', 'visible');
			elem.css('filter', 'url(#rounded-edges)  drop-shadow(5px 5px 10px black)');
			elem.find('.inner-span').attr('style', `background-color: rgb(${color})`);
			setTimeout(function () {
				elem.addClass('flipped');
			}.bind(this), animTime / 2);
		}.bind(this), animTime / 2);
	}
}