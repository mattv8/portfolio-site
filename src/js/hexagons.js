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
			radius: 5,
			outlineColor: 'black',
			outlineThickness: 2,
		}, options);

		// Cached Selectors
		const $container = this;
		const $invisible = $('.invisible');

		// Prevent multiple initializations on the same container
		if ($container.hasClass('hexagons-initialized')) {
			console.warn('Hexagons already initialized for this container');
			if (callback) {
				// Still call the callback but skip re-initialization
				const elems = $container.data('hexagon-elems') || [];
				const spawnPoint = $container.data('hexagon-spawn') || centerpoint($container);
				const containerDims = $container.data('hexagon-dims') || { height: $container.height(), width: $container.width() };
				callback(elems, spawnPoint, settings, containerDims);
			}
			return this;
		}

		/*
		* Initialization of the Hexagon DOM. Done asynchronously so objects are returned in proper timing.
		*/
		async function initialize() {

			await buildHtml();// Build the initial DOM
			const elems = await reorder(true, false);// Arrange the hexagons, save cornerpoints
			const containerDims = await updateContainerDimensions($container, elems, settings);

			$(window).resize(function () {
				debouncedReorder(true, true);// Debounced reorder() function when window resizes
			});

			// Mark container as initialized and store data
			$container.addClass('hexagons-initialized');
			$container.data('hexagon-elems', elems);
			$container.data('hexagon-spawn', spawnPoint);
			$container.data('hexagon-dims', containerDims);

			const result = {
				elems: elems,
				spawnPoint: spawnPoint,
				settings: settings,
				containerDims: containerDims,
			};

			return result;

		}// END initialize(container)


		/*
		* Builds basic hexagon DOM structure for given hexagons
		*/
		function buildHexagonStructure($hexes) {
			// Only build structure for hexagons that don't already have .hex_inner
			$hexes = $hexes.not(':has(.hex_inner)');

			if ($hexes.length === 0) {
				console.warn('No new hexagons to build - all already have structure');
				return;
			}

			$hexes.append('<div class="hex_inner"></div>');
			$hexes.find('.hex_inner').append('<div class="inner-span"><div class="inner-title"></div></div>');
			$hexes.find('.inner-span').append('<div class="inner-text"></div>');
		}

		/*
		* Processes buttons and links for given hexagons
		*/
		function processHexagonInteractions($hexes) {
			// Hex Links
			$hexes.filter('.link').each(function () {
				var link = $(this).find("link").attr("href");
				if (link) { $(this).find('.hex_inner').wrap('<a href="' + link + '" class="hex_link"></a>'); }
			});

			// Hex Buttons
			$hexes.filter('.button').each(function () {
				var button = $(this).attr("onclick");
				if (button) {
					$(this).removeAttr('onclick');
					$(this).find('.hex_inner').wrap('<button onclick="' + button + '" class="hex_button"></button>');
					$(this).find('button.hex_button').css({ 'width': '100%' });
				}
			});
		}

		/*
		* Processes individual hexagon properties (images, colors, scaling, etc.)
		*/
		function processHexagonProperties($hex, hexId) {
			var bg_img_src = $hex.find('.bg').attr('src');
			var hvr_img_src = $hex.find('.hvr').attr('src');
			var color = [255, 255, 255]; // Default color for flip

			// For solid color hexagons - extract the color from the hex_inner background
			// Use setTimeout(0) for true nextTick behavior to ensure all styles are applied first
			setTimeout(function () {
				var $hexInner = $hex.find('.hex_inner');
				var currentBgColor = $hexInner.css('background-color');

				if (currentBgColor && currentBgColor !== 'rgba(0, 0, 0, 0)' && currentBgColor !== 'transparent') {
					// Parse RGB values from the computed background color
					var rgbMatch = currentBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
					if (rgbMatch) {
						color = [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];

						// Store the extracted color in the state manager for this hexagon
						window.HexagonStateManager.updateFlipColor($hex[0], color);

						// Update the flip handlers with the correct color if this is a flip hexagon
						if ($hex.hasClass('flip')) {
							$hex.find('.hex_inner').off('mouseenter mouseleave').on({
								mouseenter: function () {
									flipForward($hex, 500, color);
								},
								mouseleave: function () {
									flipBack($hex, 500);
								}
							});
						}
					}
				}
			}, 0);

			// For hexagons with links or solid color hover backgrounds
			if (bg_img_src !== undefined) {
				// Attach bg image
				$hex.find('.hex_inner').attr('style', `background-image: url("${bg_img_src}")`);

				// colorThief variables - wait for image to load and update color
				const img_obj = new Image(360, 360);
				img_obj.onload = function () {
					const colorThief = new ColorThief();
					const palette = colorThief.getPalette(img_obj, 5);
					const extractedColor = _.sample(palette);

					// Store the extracted color in the state manager
					window.HexagonStateManager.updateFlipColor($hex[0], extractedColor);

					// Update the flip handlers with the new color
					if ($hex.hasClass('flip')) {
						$hex.find('.hex_inner').off('mouseenter mouseleave').on({
							mouseenter: function () {
								flipForward($hex, 500, extractedColor);
							},
							mouseleave: function () {
								flipBack($hex, 500);
							}
						});
					}
				};
				img_obj.src = bg_img_src;

				if (!$hex.hasClass('flip')) {
					const animTime = 500;
					$hex.mouseenter(function () {
						// For image hexagons, we'll use a default color until image loads
						$hex.find('.inner-span').css({
							transition: `background-color 0.3s ease;  background-color: rgb(${color})`,
							transition: `all ${animTime}ms ease-in-out`,
						});
					});
					$hex.mouseleave(function () {
						$hex.find('.inner-span').css({
							transition: `background-color 0.3s ease;  background-color: unset`
						});
					});
				}
			}

			// For hexagons with an image when hovering
			if (hvr_img_src !== undefined) {
				$hex.mouseenter(function () {
					$hex.find('.inner-span').attr('style', `background-image: url("${hvr_img_src}")`);
				});
				$hex.mouseleave(function () {
					$hex.find('.inner-span').attr('style', 'background-image: none');
				});
			}

			// For hexagons with programmatically defined background colors (only if not a color- hexagon)
			if (bg_img_src === undefined && !$hex.is('[class*="color-"]')) {
				$hex.find('.hex_inner').attr('style', 'background-color: white');
			}

			// For hexagons with inner text
			if ($hex.find('span').length > 0) {
				$hex.find('.inner-span .inner-title').html($hex.find('span')).attr('id', `title-${hexId}`);
			} else {
				$hex.find('.inner-span').remove();
			}

			// For hexagons with inner sub-text
			if ($hex.find('p').length > 0) {
				$hex.find('.inner-span .inner-text')
					.html($hex.find('p').html())
					.removeClass('inner-text')
					.addClass($hex.find('p').attr('class'));
				$hex.find('p').remove();
			} else {
				$hex.find('.inner-text').remove();
			}

			// For hexagons with flipped text
			const animTime = 500;
			if ($hex.hasClass('flip')) {
				// Wrapped inner text
				$hex.find('.inner-text-flipped').attr('id', `fliptext-${hexId}`)
					.not('.no-wrap')
					.wrapInner('<p></p>')
					.prepend('<div class="hex-wrap-after"></div>')
					.prepend('<div class="hex-wrap-before"></div>')
					.css({
						'transform': 'scaleX(-1)',
						'height': calculateHexHeight(settings.hexWidth),
						'visibility': 'hidden',
					});

				// Non-wrapped inner text
				$hex.find('.inner-text-flipped.no-wrap').attr('id', `fliptext-${hexId}`)
					.wrapInner('<p></p>')
					.css({
						'position': 'absolute',
						'top': '50%',
						'left': '50%',
						'width': '100%',
						'height': calculateHexHeight(settings.hexWidth),
						'transform': 'translate(-50%, -50%) scaleX(-1)',
						'visibility': 'hidden',
						'display': 'flex',
						'align-items': 'center',
						'justify-content': 'center',
					});

				// Set up flip handlers (will be updated for background images in img.onload)
				$hex.find('.hex_inner').on({
					mouseenter: function () {
						flipForward($hex, animTime, color);
					},
					mouseleave: function () {
						flipBack($hex, animTime);
					}
				});
			}

			// For scaled hexagons
			if ($hex.is('[class*="scale-"]')) {
				var scaleClass = $hex.attr('class').match(/scale-(\d+)/);
				let scale = 1;
				if (scaleClass !== null) {
					scale = parseFloat(scaleClass[1]) / 10;
				}
				var $hexInner = $hex.find('.hex_inner');
				$hexInner.css('transform', `scale(${scale})`);
			}

			// For hexagons with extra margin
			if ($hex.is('[class*="margin-"]')) {
				var marginClass = $hex.attr('class').match(/margin-(\d+)/);
				let margin = 0;
				if (marginClass !== null) {
					margin = parseFloat(marginClass[1]);
				}
				$hex.css('margin', `-${margin}px 0px`);
			}

			applyCSSModifiers($hex);
		}

		/*
		* Applies font scaling to given hexagons
		*/
		function applyFontScaling($hexes, hexWidth, hexHeight) {
			const textHeight = hexHeight * .15;
			$hexes.find('.inner-title').css({ 'font-size': textHeight + 'px' });

			// Apply font scaling logic
			const maxTitleWidth = hexWidth * 0.92;
			$hexes.find('.inner-title > span').each(function () {
				if (this.offsetWidth > maxTitleWidth) {
					const $parent = $(this).parent();
					$parent.css({
						display: 'inline-block',
						width: maxTitleWidth,
						'font-size': (maxTitleWidth / this.offsetWidth) * textHeight + 'px'
					});
				}
			});

			// Center flip text vertically by adding calculated padding
			$hexes.find('.inner-text-flipped > p').each(function () {
				var padding = (hexHeight - this.offsetHeight) / 2;
				$(this).attr('style', `padding: ${padding}px 0px;`);
			});

			// Set proper dimensions for hex wrap elements
			$hexes.find('.hex-wrap-before, .hex-wrap-after')
				.width((1 / 2 * hexHeight) / Math.tan(60 * Math.PI / 180))
				.height(hexHeight);
		}

		/*
		* All DOM building must go here. Function is called at end of script.
		* This is to prevent half-loading of the page.
		*/
		async function buildHtml() {

			buildHexagonStructure($container.find('.hex'));

			// SVG defining the rounding of hex corners
			const roundedSVG = `
			<svg style="visibility: hidden;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
				<filter id="rounded-edges"><feGaussianBlur in="SourceGraphic" stdDeviation="${settings.radius}" result="blur" />
					<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="rounded-edges" />
					<feComposite in="SourceGraphic" in2="rounded-edges" operator="atop"/>
				</filter>
			</svg>
			`;
			$container.append(roundedSVG);

			// SVG defining the outline of hexagons
			const outlineSVG = `
			<svg style="visibility: hidden;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
			<filter id="outline">
				<feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="${settings.outlineThickness}"></feMorphology>
				<feFlood flood-color="${settings.outlineColor}" flood-opacity="1" result="ALPHA"></feFlood>
				<feComposite in="ALPHA" in2="DILATED" operator="in" result="OUTLINE"></feComposite>
				<feMerge>
					<feMergeNode in="OUTLINE" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			</svg>
			`;
			$container.append(outlineSVG);

			processHexagonInteractions($container.find('.hex'));

			// Hex Image - Process each hexagon
			$container.find('.hex').each(function (hexId) {
				processHexagonProperties($(this), hexId);
			});

			$container.find('img, span, link, p').not('.inner-title > span, .inner-text-flipped > p').detach();

			$invisible.hide();

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

			var hexHeight = calculateHexHeight(hexWidth);

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

				var classes = $hex.attr('class').split(' ');
				elem[i] = {
					classes: classes,
					corner: { left: left, top: top },
					width: hexWidth,
					height: calculateHexHeight(hexWidth),
					selector: $hex,
					row: row,
					col: col
				};

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
			await updateContainerDimensions($container, elem, settings);// Update container sizing
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
			// Safety check: ensure element exists and is attached to DOM
			if (!element || !element.length || !element.parent().length) {
				console.warn('centerpoint: element not found or not attached to DOM', element);
				return { left: 0, top: 0 };
			}

			// If element is not visible but exists, still try to get position for layout calculations
			let center;
			var position = element.position();

			// Additional safety check for position
			if (!position) {
				console.warn('⚠️ centerpoint: position not available for element', element);
				// Try to get offset position as fallback
				position = element.offset();
				if (!position) {
					return { left: 0, top: 0 };
				}
			}

			var width = element.width() || 0;
			var height = element.height() || 0;
			return center = {
				left: position.left + width / 2,
				top: position.top + height / 2
			}
		}		/*
		 * Add new hexagons incrementally without full reinitialization
		 */
		async function addNewHexagons() {
			// Process only new hexagons that don't have .hex_inner
			const $newHexes = $container.find('.hex').not(':has(.hex_inner)');

			if ($newHexes.length === 0) return;

			// Build basic structure for new hexagons
			buildHexagonStructure($newHexes);

			// Process interactions (buttons/links) for new hexagons
			processHexagonInteractions($newHexes);

			// Process each new hexagon's properties
			$newHexes.each(function (hexId) {
				processHexagonProperties($(this), hexId);
			});

			// Hide hex builder tags for new hexagons
			$newHexes.find('img, span, link, p').not('.inner-title > span, .inner-text-flipped > p').detach();

			// Reposition all hexagons
			const elems = await reorder(false, true);

			// Apply proper font scaling to new hexagons
			const currentWidth = $(window).width();
			const hexWidth = currentWidth <= settings.breakpoint ?
				($container.width() + settings.margin * 2) / 2 :
				settings.hexWidth;
			const hexHeight = calculateHexHeight(hexWidth);

			// Apply font scaling to new hexagons
			applyFontScaling($newHexes, hexWidth, hexHeight);

			return elems;
		}

		/*
		 * RETURNS
		*/
		return {
			each: this.each(async function () {
				const result = await initialize(this);
				if (callback) {
					callback(result.elems, result.spawnPoint, result.settings, result.containerDims);
				}
			}),
			addHexagons: async function (callback) {
				const elems = await addNewHexagons();
				if (callback && elems) {
					callback(elems, spawnPoint, settings, await updateContainerDimensions($container, elems, settings));
				}
				return elems;
			},
			enableLazyLoading: async function (lazyOptions = {}) {
				// Convenience method to enable lazy loading for this hexagon container
				const containerSelector = '.' + $container.attr('class').split(' ').join('.');
				return await window.HexagonLazyLoader.initialize(containerSelector, lazyOptions);
			}
		};

	} // END $.fn.hexagons = function(options) {}

}(jQuery));


function flipBack(elem, animTime) {
	if (elem.hasClass('flipped')) {
		elem.addClass('flip-back');
		setTimeout(function () {
			elem.find('.inner-title').show();
			elem.find('.inner-text-flipped').css('visibility', 'hidden');
			elem.find('.inner-span').css({ 'background-color': 'unset' });
			applyCSSModifiers(elem);
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
			// Convert color array to CSS rgb string
			const colorString = Array.isArray(color) ? color.join(',') : color;
			elem.find('.inner-span').css({ 'background-color': `rgb(${colorString})` });
			applyCSSModifiers(elem);
			setTimeout(function () {
				elem.addClass('flipped');
			}.bind(this), animTime / 2);
		}.bind(this), animTime / 2);
	}
}


/**
 *	Additional CSS modifiers
 * @param {element} hex
 */
function applyCSSModifiers(hex) {
	switch (true) {
		case hex.hasClass('outlined', 'rounded'):
			hex.css('filter', `url(#rounded-edges) url(#outline) drop-shadow(-5px 5px 10px black)`);
			break;
		case hex.hasClass('rounded'):
			hex.css('filter', `url(#rounded-edges) drop-shadow(-5px 5px 10px black)`);
			break;
		case hex.hasClass('outlined'):
			hex.css('filter', `url(#outline) drop-shadow(-5px 5px 10px black)`);
			break;
		default:
			hex.css('filter', 'drop-shadow(-5px 5px 10px black)');
			break;
	}
}


function calculateHexHeight(hexWidth) {
	return Math.sqrt(3) * (hexWidth / 2);
}


async function updateContainerDimensions(container, elems, settings) {
	let containerHeight, containerWidth;
	const visibleElems = elems.filter(elem => !elem.classes.includes('invisible'));
	const lowestElem = _.maxBy(visibleElems, elem => elem.corner.top);
	const rightmostElem = _.maxBy(visibleElems, elem => elem.corner.left);

	if (lowestElem && rightmostElem) {
		containerHeight = lowestElem.corner.top + lowestElem.height;
		containerWidth = rightmostElem.corner.left + rightmostElem.width;

		// Check if window width is less than the breakpoint
		const windowWidth = $(window).width();
		if (windowWidth < settings.breakpoint) {
			containerWidth = windowWidth - settings.margin * 2;
		}

		container.css({
			'height': containerHeight,
			'width': containerWidth
		});
	}
	return { height: containerHeight, width: containerWidth };
}


/*
* Utility for managing per-hexagon state storage to prevent conflicts when multiple hexagons are squared
*/
if (typeof window.HexagonStateManager === 'undefined') {
	window.HexagonStateManager = {
		states: new Map(),

		// Store state for a specific hexagon using its unique identifier
		store: function (hexElement, state) {
			const hexId = this.getHexId(hexElement);

			// Preserve existing flipColor if it exists in another state entry
			const existingFlipColor = this.findFlipColorForHex(hexElement);
			if (existingFlipColor) {
				state.flipColor = existingFlipColor;
			}

			this.states.set(hexId, state);
			return hexId;
		},

		// Find flip color for this hex element across all state entries
		findFlipColorForHex: function (hexElement) {
			const $hex = $(hexElement);
			const content = $hex.find('.inner-title').text() || $hex.find('span').text() || '';
			const contentKey = content.replace(/\s+/g, '_');

			// Search all states for an entry with matching content that has a flipColor
			for (let [stateId, state] of this.states) {
				if (stateId.includes(contentKey) && state.flipColor) {
					return state.flipColor;
				}
			}
			return null;
		},

		// Update flip color for a specific hexagon
		updateFlipColor: function (hexElement, flipColor) {
			const hexId = this.getHexId(hexElement);
			const existingState = this.states.get(hexId);
			if (existingState) {
				existingState.flipColor = flipColor;
				this.states.set(hexId, existingState);
			} else {
				// Create a minimal state entry just for the flip color
				this.states.set(hexId, { flipColor: flipColor });
			}
		},

		// Get flip color for a specific hexagon
		getFlipColor: function (hexElement, hexId = null) {
			const id = hexId || this.getHexId(hexElement);
			const state = this.states.get(id);
			const flipColor = state ? state.flipColor : null;
			return flipColor;
		},

		// Retrieve state for a specific hexagon
		retrieve: function (hexElement) {
			const hexId = this.getHexId(hexElement);
			return this.states.get(hexId);
		},

		// Remove state for a specific hexagon
		remove: function (hexElement) {
			const hexId = this.getHexId(hexElement);
			const state = this.states.get(hexId);
			this.states.delete(hexId);
			return state;
		},

		// Remove state by hexId directly
		removeById: function (hexId) {
			const state = this.states.get(hexId);
			this.states.delete(hexId);
			return state;
		},

		// Generate unique ID for hexagon based on its position and content
		getHexId: function (hexElement) {
			const $hex = $(hexElement);
			// Use the element's own position, not the parent's
			const left = $hex.css('left') || '0';
			const top = $hex.css('top') || '0';
			const content = $hex.find('.inner-title').text() || $hex.find('span').text() || '';
			// Include a data attribute or index as fallback for uniqueness
			const index = $hex.index();
			return `hex_${left}_${top}_${content.replace(/\s+/g, '_')}_${index}`.substring(0, 50);
		},

		// Clean up all states (for page navigation)
		destroy: function () {
			this.states.clear();
		}
	};
}

/*
* Utility function to transition hexagon to square modal state
*/
function transitionHexToSquare(hex, container, animTime, contentElement, detailsId) {
	// Ensure we're working with the .hex element, handling different possible input types
	const $hexElement = hex.jquery ? hex : $(hex);
	let $actualHex;

	if ($hexElement.hasClass('hex')) {
		// Direct .hex element
		$actualHex = $hexElement;
	} else if ($hexElement.find('.hex').length) {
		// Parent element containing .hex child
		$actualHex = $hexElement.find('.hex').first();
	} else {
		// Element is likely a child/descendant of .hex, find the parent .hex
		$actualHex = $hexElement.closest('.hex');
	}

	// Debug logging to understand what's happening
	if (!$actualHex.length) {
		console.error('No hex element found for transition');
		console.error('Original element:', hex);
		console.error('$hexElement:', $hexElement);
		console.error('$hexElement classes:', $hexElement.attr('class'));
		console.error('Tried .closest(".hex"):', $hexElement.closest('.hex'));
		return null;
	}

	const $hexInner = $actualHex.find('.hex_inner');
	// Check if the hexagon is properly initialized (has hex_inner structure)
	if (!$hexInner.length) {
		console.warn('Hexagon not yet initialized, please wait for hexagons to finish loading');
		return null;
	}

	const $hexFlipText = $actualHex.find('.inner-text-flipped');
	const $hexWrappers = {
		before: $actualHex.find('.hex-wrap-before'),
		after: $actualHex.find('.hex-wrap-after'),
	};

	// Store original CSS values for restoration using the state manager
	const original = {
		height: {
			inner: $hexInner.css('height'),
			parent: $actualHex.css('height')
		},
		width: {
			inner: $hexInner.css('width'),
			parent: $actualHex.css('width')
		},
		left: $actualHex.css('left'),
		top: $actualHex.css('top'),
		position: $actualHex.css('position'),
		transform: $actualHex.css('transform'),
		translate: $actualHex.css('translate'),
		zIndex: $actualHex.css('z-index'),
		color: $hexInner.css('background-color'),
		filter: $actualHex.css('filter'),
		flipColor: window.HexagonStateManager.getFlipColor($actualHex[0]),
		innerTextFlipped: {
			display: $hexFlipText.css('display') || ''
		}
	};

	// Store the state using the state manager
	const hexId = window.HexagonStateManager.store($actualHex[0], original);

	// Hide flip text and add content
	$hexFlipText.css({ display: 'none' });
	$hexInner.find('.inner-span').append(contentElement);

	// Use the working container-based positioning approach
	$hexInner.addClass('squared').css({
		width: '100%',
		height: container.height,
		transition: `all ${animTime}ms ease-in-out`,
		backgroundColor: 'white',
		overflow: 'auto', // Enable scrolling if content exceeds height
	}).off('mouseenter mouseleave');

	$hexInner.find('.inner-span').css({
		backgroundColor: 'white',
		transition: `all ${animTime}ms ease-in-out`,
		minHeight: '100%', // Ensure content takes full height
		boxSizing: 'border-box',
	});

	// Position the hex element using the working approach
	$actualHex.css({
		width: container.width,
		position: 'absolute',
		top: container.top,
		left: '50%',
		translate: '-50%',
		'z-index': 1,
		transition: `all ${animTime}ms ease-in-out`,
	});

	$hexWrappers.before.add($hexWrappers.after).css('display', 'none');

	return hexId; // Return the hex ID for later state retrieval
}

/*
* Utility function to transition square modal back to hexagon state
*/
function transitionSquareToHex(hex, hexId, animTime, detailsId) {
	// Ensure we're working with the .hex element, handling different possible input types
	const $hexElement = hex.jquery ? hex : $(hex);
	let $actualHex;

	if ($hexElement.hasClass('hex')) {
		// Direct .hex element
		$actualHex = $hexElement;
	} else if ($hexElement.find('.hex').length) {
		// Parent element containing .hex child
		$actualHex = $hexElement.find('.hex').first();
	} else {
		// Element is likely a child/descendant of .hex, find the parent .hex
		$actualHex = $hexElement.closest('.hex');
	}

	if (!$actualHex.length) {
		console.error('No hex element found for transition back');
		console.error('Original element:', hex);
		console.error('$hexElement:', $hexElement);
		console.error('Tried .closest(".hex"):', $hexElement.closest('.hex'));
		return;
	}

	const $hexInner = $actualHex.find('.hex_inner');
	const $hexFlipText = $actualHex.find('.inner-text-flipped');
	const $hexWrappers = {
		before: $actualHex.find('.hex-wrap-before'),
		after: $actualHex.find('.hex-wrap-after'),
	};

	// Retrieve the original state for this specific hexagon
	const original = hexId ? window.HexagonStateManager.removeById(hexId) : window.HexagonStateManager.remove($actualHex[0]);

	if (!original) {
		console.error('No original state found for hexagon', hexId ? `(ID: ${hexId})` : '');
		return;
	}

	// Remove the details content
	if ($hexInner.find(`#${detailsId}`).length) {
		$hexInner.find(`#${detailsId}`).remove();
	}

	// Restore original CSS using the working approach
	$actualHex.css({
		position: original.position || 'absolute',
		width: original.width.parent,
		height: original.height.parent,
		left: original.left,
		top: original.top,
		'z-index': original.zIndex || 'auto',
		translate: original.translate || '',
		transform: '', // Clear any transforms to prevent mirroring issues
		transition: `width ${animTime}ms ease-in-out, height ${animTime}ms ease-in-out, left ${animTime}ms ease-in-out, top ${animTime}ms ease-in-out`,
	});

	// Restore filter after other properties to ensure CSS modifiers are applied correctly
	applyCSSModifiers($actualHex);

	$hexInner.css({
		height: original.height.inner,
		width: original.width.inner,
		backgroundColor: original.color,
		overflow: 'visible', // Reset overflow from squared state
		position: '', // Clear any position overrides
		top: '',
		left: '',
		zIndex: '',
		transition: `all ${animTime}ms ease-in-out`,
	});

	// Reset inner-span styles that were modified during squared state
	$hexInner.find('.inner-span').css({
		backgroundColor: '',  // Empty string removes the inline style completely
		minHeight: '',
		boxSizing: '',
		transition: '',
		height: original.innerSpan ? original.innerSpan.height : '',
		display: original.innerSpan ? original.innerSpan.display : '',
		flexDirection: original.innerSpan ? original.innerSpan.flexDirection : '',
		overflow: original.innerSpan ? original.innerSpan.overflow : ''
	});

	// Reset inner-text-flipped transitions
	if (original.innerTextFlipped) {
		$hexFlipText.css({
			display: original.innerTextFlipped.display || '',
			height: original.innerTextFlipped.height || '',
			transition: original.innerTextFlipped.transition || ''
		});
	}

	// Reset paragraph transitions
	if (original.innerTextP) {
		$hexFlipText.find('p').css({
			padding: original.innerTextP.padding || '',
			transition: original.innerTextP.transition || ''
		});
	}

	$hexWrappers.before.add($hexWrappers.after).css('display', '');
	$hexInner.removeClass('squared');

	// Re-attach flip handlers using stored flip color
	const flipColor = original.flipColor || [255, 255, 255];

	$hexInner.on('mouseenter', () => flipForward($actualHex, animTime, flipColor));
	$hexInner.on('mouseleave', () => flipBack($actualHex, animTime));

	// After the transition back to hex is complete, remove the transition properties
	setTimeout(() => {
		$actualHex.css('transition', '');
		$hexInner.css('transition', '');
	}, animTime);
}

/*
* Global cleanup function for page navigation
* Call this before navigating to a new page to prevent variable conflicts
*/
function cleanupHexagons() {
	// Clear the HexagonStateManager
	if (typeof window.HexagonStateManager !== 'undefined') {
		window.HexagonStateManager.destroy();
	}

	// Clear the HexagonLazyLoader
	if (typeof window.HexagonLazyLoader !== 'undefined') {
		window.HexagonLazyLoader.destroy();
	}

	// Remove initialization flags and data
	$('.hexagons').removeClass('hexagons-initialized');
	$('.hexagons').removeData('hexagon-elems hexagon-spawn hexagon-dims');

	// Remove any event listeners
	$('.hexagons').off();
	$(window).off('resize.hexagons');

	// Clear any running animations
	$('.hex').stop(true, true);

	// Call page-specific cleanup functions if they exist
	if (typeof cleanupRunning === 'function') {
		cleanupRunning();
	}
	if (typeof cleanupLanding === 'function') {
		cleanupLanding();
	}
	if (typeof cleanupServer === 'function') {
		cleanupServer();
	}
}

/*
* Lazy Loading Manager for Hexagons
*/
if (typeof window.HexagonLazyLoader === 'undefined') {
	window.HexagonLazyLoader = {
		instances: new Map(),

		// Create a new lazy loader instance
		create: function (containerSelector, options = {}) {
			const defaultOptions = {
				apiEndpoint: options.apiEndpoint || '/index.php?page=server',
				loadingClass: options.loadingClass || 'hex-loading',
				loadedClass: options.loadedClass || 'hex-loaded',
				errorClass: options.errorClass || 'hex-error',
				retryAttempts: options.retryAttempts || 3,
				retryDelay: options.retryDelay || 1000,
				staggerDelay: options.staggerDelay || 150,
				cacheResults: options.cacheResults !== false,
				updateContentCallback: options.updateContentCallback || this.defaultUpdateContent,
				...options
			};

			const instance = {
				containerSelector: containerSelector,
				options: defaultOptions,
				cache: new Map(),
				loadingQueue: [],
				isLoading: false,
				performanceStats: {
					totalHexes: 0,
					loadedHexes: 0,
					cacheHits: 0,
					totalLoadTime: 0,
					startTime: null
				}
			};

			this.instances.set(containerSelector, instance);
			return instance;
		},

		// Initialize lazy loading for a specific container
		initialize: async function (containerSelector, options = {}) {
			// Check if already initialized to prevent duplicates
			if (this.instances.has(containerSelector)) {
				console.warn(`Lazy loader already initialized for ${containerSelector}`);
				return this.instances.get(containerSelector);
			}

			const instance = this.instances.get(containerSelector) || this.create(containerSelector, options);
			const container = $(containerSelector);
			const hexesToLoad = container.find('.hex[data-lazy-load="true"], .hex[data-server-name]').toArray();

			if (hexesToLoad.length === 0) {
				console.wanr(`No hexagons found that require lazy loading in ${containerSelector}`);
				return instance;
			}

			instance.performanceStats.totalHexes = hexesToLoad.length;
			instance.performanceStats.startTime = Date.now();

			// Add hexes to loading queue
			instance.loadingQueue = hexesToLoad.map(hex => ({
				element: hex,
				$element: $(hex),
				identifier: $(hex).data('server-name') || $(hex).data('identifier') || $(hex).find('span').text().trim(),
				attempts: 0
			}));

			// Start loading process with staggered timing
			await this.processLoadingQueue(instance);

			return instance;
		},

		// Process the loading queue with staggered requests
		processLoadingQueue: async function (instance) {
			instance.isLoading = true;

			const promises = instance.loadingQueue.map((hexInfo, index) => {
				return new Promise(resolve => {
					setTimeout(async () => {
						await this.loadHexagonDetails(instance, hexInfo);
						resolve();
					}, index * instance.options.staggerDelay);
				});
			});

			await Promise.all(promises);
			instance.isLoading = false;
		},

		// Load detailed data for a specific hexagon
		loadHexagonDetails: async function (instance, hexInfo) {
			const { element, $element, identifier } = hexInfo;

			try {
				// Add loading state
				$element.addClass(instance.options.loadingClass);

				// Check cache first
				const cacheKey = `hex_details_${identifier}`;
				let data;

				if (instance.options.cacheResults && instance.cache.has(cacheKey)) {
					data = instance.cache.get(cacheKey);
					instance.performanceStats.cacheHits++;
				} else {
					// Fetch from API
					const startTime = Date.now();
					data = await this.fetchData(instance, identifier);
					const loadTime = Date.now() - startTime;
					instance.performanceStats.totalLoadTime += loadTime;

					// Cache the result
					if (instance.options.cacheResults && data.success) {
						instance.cache.set(cacheKey, data);
					}
				}

				if (data.success) {
					await instance.options.updateContentCallback(hexInfo, data.data, instance);
					$element.removeClass(instance.options.loadingClass).addClass(instance.options.loadedClass);
					instance.performanceStats.loadedHexes++;

					// Trigger custom event
					$element.trigger('hexagon:loaded', [data.data, instance]);
				} else {
					throw new Error(data.error || 'Failed to load hexagon details');
				}

			} catch (error) {
				console.error(`Failed to load hexagon for ${identifier}:`, error);
				await this.handleLoadError(instance, hexInfo, error);
			}
		},

		// Fetch data from API - Generic implementation that can be overridden
		fetchData: async function (instance, identifier) {
			// If a custom fetchData function is provided, use it
			if (instance.options.fetchData && typeof instance.options.fetchData === 'function') {
				return await instance.options.fetchData(instance, identifier);
			}

			// Default generic implementation
			const url = new URL(instance.options.apiEndpoint, window.location.origin);

			// Use custom API parameters if provided, otherwise use defaults
			const apiParams = instance.options.apiParams || {
				action: 'details',
				identifier_param: 'host'
			};

			// Set the action parameter
			if (apiParams.action) {
				url.searchParams.set('action', apiParams.action);
			}

			// Set the identifier parameter
			const identifierParam = apiParams.identifier_param || 'host';
			url.searchParams.set(identifierParam, identifier);

			// Add any additional parameters
			if (apiParams.extra) {
				Object.keys(apiParams.extra).forEach(key => {
					url.searchParams.set(key, apiParams.extra[key]);
				});
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		},

		// Default content update function (can be overridden) - Generic implementation
		defaultUpdateContent: function (hexInfo, responseData, instance) {
			const { $element } = hexInfo;
			const $flipText = $element.find('.inner-text-flipped');
			const $title = $element.find('.inner-title');

			// If custom updateContent function is provided, use it
			if (instance.options.updateContent && typeof instance.options.updateContent === 'function') {
				return instance.options.updateContent(hexInfo, responseData, instance);
			}

			// Generic default implementation
			if ($flipText.length > 0 && responseData) {
				// Try to find some generic data to display
				let displayText = 'Details loaded successfully';

				// Check if responseData has common properties we can display
				const data = responseData.data || responseData;
				if (data && typeof data === 'object') {
					displayText = Object.keys(data).map(key => {
						const value = data[key];
						if (typeof value === 'string' || typeof value === 'number') {
							return `${key}: ${value}`;
						}
						return null;
					}).filter(Boolean).slice(0, 5).join('<br>') || displayText;
				}

				$flipText.html(displayText);

				// Remove the lazy load flag
				$element.removeAttr('data-lazy-load').removeData('lazy-load');
			}

			// Update title if possible
			if ($title.length > 0 && responseData) {
				const data = responseData.data || responseData;
				if (data && (data.name || data.title || data.identifier)) {
					$title.html(`<span>${data.name || data.title || data.identifier}</span>`);
				}
			}

			console.log(`✅ Generic update completed for: ${hexInfo.identifier}`);
		},

		// Handle loading errors with retry logic
		handleLoadError: async function (instance, hexInfo, error) {
			const { $element } = hexInfo;

			hexInfo.attempts++;

			if (hexInfo.attempts < instance.options.retryAttempts) {
				console.warn(`Retrying load for ${hexInfo.identifier} (attempt ${hexInfo.attempts + 1})`);

				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, instance.options.retryDelay));

				// Retry loading
				await this.loadHexagonDetails(instance, hexInfo);
			} else {
				// Max retries reached
				$element.removeClass(instance.options.loadingClass).addClass(instance.options.errorClass);

				// Show error state in hexagon
				const $flipText = $element.find('.inner-text-flipped');
				if ($flipText.length > 0) {
					$flipText.html(`
						<span style="color: #ff6b6b;">
							Error loading<br>
							${hexInfo.identifier}<br>
							<small>Click to retry</small>
						</span>
					`);

					// Add retry click handler
					$element.off('click.retry').on('click.retry', async (e) => {
						e.stopPropagation();
						hexInfo.attempts = 0;
						$element.removeClass(instance.options.errorClass);
						await this.loadHexagonDetails(instance, hexInfo);
					});
				}

				console.error(`Failed to load ${hexInfo.identifier} after ${instance.options.retryAttempts} attempts:`, error);
			}
		},

		// Preload specific hexagon by identifier
		preloadHexagon: async function (containerSelector, identifier) {
			const instance = this.instances.get(containerSelector);
			if (!instance) return;

			const hexInfo = instance.loadingQueue.find(h => h.identifier === identifier);
			if (hexInfo && !hexInfo.$element.hasClass(instance.options.loadedClass)) {
				await this.loadHexagonDetails(instance, hexInfo);
			}
		},

		// Get cache statistics for an instance
		getCacheStats: function (containerSelector) {
			const instance = this.instances.get(containerSelector);
			if (!instance) return null;

			return {
				cacheSize: instance.cache.size,
				cacheHits: instance.performanceStats.cacheHits,
				hitRate: instance.performanceStats.totalHexes > 0 ?
					(instance.performanceStats.cacheHits / instance.performanceStats.totalHexes * 100).toFixed(1) + '%' : '0%'
			};
		},

		// Clear cache for specific instance or all instances
		clearCache: function (containerSelector = null) {
			if (containerSelector) {
				const instance = this.instances.get(containerSelector);
				if (instance) {
					instance.cache.clear();
					console.log(`Cache cleared for ${containerSelector}`);
				}
			} else {
				this.instances.forEach((instance, selector) => {
					instance.cache.clear();
				});
			}
		},

		// Destroy all instances (for cleanup)
		destroy: function () {
			this.instances.clear();
		}
	};
}