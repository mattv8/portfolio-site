/*
	Hexagon Building Code
	Written by Matthew Visnovsky
	(c) 2023
*/

(function($) {

$.fn.hexagons = function(callback, options) {
	
	// Defaults. Can be overridden by options input.
	var settings = $.extend({
		hexWidth: 250,
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
		let elems = await reorder(true, false);// Arrange the hexagons, save cornerpoints
		$(window).resize(function(){
			debouncedReorder(true, true);// Debounced reorder() function when window resizes
		});
		return elems;

	}// END initialize(container)


	/*
	* All DOM building must go here. Function is called at end of script.
	* This is to prevent half-loading of the page.
	*/
	async function buildHtml(){

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

		// Hex Default
		$container.find('.hex').not('.hex.rounded').each(function(){
			$(this).attr('style', 'filter: drop-shadow(-5px 5px 10px black);');// Drop Shadow
		})

		// Hex with Rounded Corners
		$container.find('.hex.rounded').each(function(){
			$(this).attr('style', 'filter: url(#rounded-edges) drop-shadow(-5px 5px 10px black)');
		})
		
		// Hex Links
		$container.find('.hex.link').each(function(){
			var link = $(this).find("link").attr("href"); // Find its associated anchor
			if(link) { $(this).find('.hex_inner').wrap('<a href="'+link+'" class="link"></a>'); } // wrap the <a></a>
		})
		
		// Hex Buttons
		$container.find('.hex.button').each(function(){
			var button = $(this).attr("onclick"); // Find its associated anchor
			if (button){
				$(this).removeAttr('onclick');// Remove the extra onclick action
				$(this).find('.hex_inner').wrap('<button onclick="'+button+'" class="button"></button>'); // wrap the <a></a>
			}
		})
		
		// Hex Image
		var hex_index = 0;
		$container.find('.hex').each(function(){
			
			hex_index = hex_index + 1; // iterate hex index counter (counts total # of hexagons)
			var bg_img_src = $(this).find('.bg').attr('src');//Get uri's of class='bg' images
			var hvr_img_src = $(this).find('.hvr').attr('src');//Get uri's of class='hvr' images
			var p = $(this).find('p').text();//Get uri's of class='hvr' images
			
			// For hexagons with links or solid color hover backgrounds
			if(bg_img_src !== undefined){ //if image is defined
				
				// colorThief variables
				var img_obj = new Image(360, 360); // build image object
				img_obj.src = bg_img_src; //attach bg image uri
				var colorThief = new ColorThief(); // initialize colorThief
				var color = colorThief.getColor(img_obj); // Get the dominant color of image
									
				// Attach bg image
				$(this).find('.hex_inner').attr('style', 'background-image: url("'+bg_img_src+'");');

				// When hovering, show dominant color of image
				$(this).mouseenter(function(){
					$(this).find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color: rgb(' + color + ')');
				});
				$(this).mouseleave(function(){
					$(this).find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color:none');
				});

			}
			
			// For hexagons with an image when hovering
			if(hvr_img_src !== undefined){// if hover image is defined
				$(this).mouseenter(function(){
					$(this).find('.inner-span').attr('style', 'background-image: url("'+hvr_img_src+'")');
				})
				$(this).mouseleave(function(){
					$(this).find('.inner-span').attr('style', 'background-image: none');
				})
			}

			// For hexagons with programmatically defined background colors
			if(bg_img_src === undefined) {// If image is not defined
				// Attach bg image and drop shadow
				$(this).find('.hex_inner').attr('style', 'background-color: white');
				$(this).attr('style', 'filter: drop-shadow(-5px 5px 10px black);');

			}

			// For hexagons with inner text
			if($(this).find('span').length > 0){ // If span is defined
				$(this).find('.inner-span .inner-title').html($(this).find('span'));
			}else{
				$(this).find('.inner-span').remove();
			}

			// For hexagons with inner sub-text
			if($(this).find('p').length > 0){// If span is defined
				$(this).find('.inner-span .inner-text')
				.html($(this).find('p').html())
				.removeClass('inner-text')
				.addClass($(this).find('p').attr('class'));
				$(this).find('p').remove();
			}else{
				$(this).find('.inner-text').remove();
			}
			
		});// END $(container).find('.hex').each(function()
		
		$container.find('img, span, link, p').not('.inner-title > span').detach();// Hide hex builder tags
		
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
			hexWidth = ( $container.width() + settings.margin*2 ) / 2;// Dynamic hex width
			if (currentWidth < settings.breakpoint && prevWidth >= settings.breakpoint) {// Window is AT lower breakpoint
				logo.el.detach();// Detach logo element(s)
				invisible.el.detach();// Detach invisible element(s)
			}
		} else {// Else window is larger than breakpoint
			hexWidth = settings.hexWidth;// Static hex width
			if (currentWidth >= settings.breakpoint && prevWidth < settings.breakpoint) {// Window is AT upper breakpoint
				$.each(logo.neighbor, function(i, neighbor) { $(logo.el[i]).insertAfter(neighbor); });// Replace logo element(s)
				$.each(invisible.neighbor, function(i, neighbor) { $(invisible.el[i]).insertAfter(neighbor); });// Replace invisible element(s)
			}
		}
		prevWidth = currentWidth;

		var hexHeight = ( Math.sqrt(3) * hexWidth )/2;
											
		var row = 0;// start at row 0
		var col = 0;// start at col 0
		var offset = 1;// 1 is down
		var left = left = (currentWidth <= settings.breakpoint)?settings.margin:0;// Add left margin if <= breakpoint
		var top = 0;// pos top

		spawnPoint.left = spawnPoint.top -= hexWidth/2 + settings.margin;// Compensate for bounding box of hexagon element
		
		$container.find('.hex').each(function(i){

			// console.log("Col: "+col, "Row: "+row);

			top = ( row * (hexHeight + settings.margin) ) + (offset * (hexHeight/2 + (settings.margin/2)));// determines top margin of hexagons
			offset ^= 1;// determines up/down in-line alignment of hexagons, alternating for every other column (using bitwise XOR "^" operator)
			
			var topLevelClass = $(this).attr('class').split(' ')[1];
			elem[i] = {class:topLevelClass, corner:{left:left,top:top}, selector:$(this)};

			// Set positional values
			if(animate && !reorder){// animate if specified
				$(this).css('left', spawnPoint.left).css('top', spawnPoint.top + settings.margin*2);// Set initial pos to center of container
				$(this).animate({'left': left, 'top': top});
			} 				// Update CSS value for this iteration
			else if(reorder){// Reorder event
				$(this).stop(true, false);// Stop previous animations if reorder() is called again
				$(this).animate({'left': left, 'top': top});
			} else{
				$(this).css('left', left).css('top', top);
			}

			// Update values for the next iteration
			left += ( hexWidth - (hexWidth / 4) + settings.margin );// determines left margin of hexagons
			
			if(left + hexWidth > $container.width()){// "Wrap" to next row
				left = (currentWidth <= settings.breakpoint)?settings.margin:0;// Add left margin if <= breakpoint
				col = 0;// Reset
				row++;// Move to next row
				offset = 1;// Reset offset
			} else {
				col++;// Move to next column
			}

		});

		setTimeout(function() { updateScales(hexWidth,hexHeight); }, (!reorder)?150:0);// Update hex width/height
		
		return elem;
		
	};// END reorder


	/*
	* Debounce reorder() using Lodash
	*/
	const debouncedReorder = _.debounce(reorder, 100);// Debounced resize with Lodash


	/*
	* Update all scale values
	*/
	function updateScales(hexWidth,hexHeight){
		let textHeight;// initialize hex scale factor

		$container.find('.hex').width(hexWidth).height(hexHeight);
		$container.find('.hex_inner').width(hexWidth).height(hexHeight);
		
		textHeight = hexHeight*.15;// Initial pixel height of text as percentage of hex height
		$container.find('.hexagons, .inner-title').css({'font-size': textHeight + 'px'});// Set initial text height
		
		// Recalculate text height if it exceeds the boundaries of the hexagon
		var maxTitleWidth = hexWidth*.92;// Max width of .inner-title text relative to hexWidth
		$container.find('.hexagons, .inner-title > span').each(function(){
			var textWidth = $(this).outerWidth();// Get outer width of inner-title <span>
			if (textWidth > maxTitleWidth) {
				$(this).parent().css({
					'display': 'inline-block',
					'width': maxTitleWidth,
					'font-size': (maxTitleWidth/textWidth)*textHeight + 'px'
				});
			}
		});

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
		each: this.each(function() {
			initialize(this).then(function(points) {
				if(callback){ callback(points); };
			});
		}),
	};

} // END $.fn.hexagons = function(options) {}

}(jQuery));