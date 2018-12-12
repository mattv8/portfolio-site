(function($) {

$.fn.hexagons = function(options) {
	
	// Defaults
	var settings = $.extend({
		hexWidth: 250,
		margin: 10,
		bg_color: '#68B0BE'
	}, options);

	function initialise(element) {

		var width = 0;
		var hexWidth = 0;
		var hexHeight = 0;
		var num = 0;
		var $wrapper = null;

		/**
		 * Build the dom
		 */
		function buildHtml(){

			// add the 2 other boxes
			//$(element).find('.hex').wrapAll('<div class="hexagons-inner-wrapper"></div>');
			$wrapper = $(element).find('.hexagons');

			$(element).find('.hex').append('<div class="hex_l"></div>');
			$(element).find('.hex_l').append('<div class="hex_r"></div>');
			$(element).find('.hex_r').append('<div class="hex_inner"></div>');
			$(element).find('.hex_inner').append('<div class="inner-span"><div class="inner-text"></div></div>');

			// Hex Links
			$(element).find('.link').each(function(){
				var link = $(this).find("link").attr("href"); // Find its associated anchor
				$(this).find('.hex_inner').wrap('<a href="'+link+'" class="link"></a>'); // wrap the <a></a>
			});

			num = 0;
			$(element).find('.hex').each(function(){
				num = num + 1;
				var image = $(this).find('img').attr('src');
				var css = 'url("'+image+'") ';

				$(this).find('.hex_inner').attr('style', 'background-image: '+css);

				if($(this).find('span').length > 0){ // If span is defined
					$(this).find('.inner-span .inner-text').html($(this).find('span').html());
				}else{
					$(this).find('.inner-span').remove();
				};

			});

			//$(element).find('img, span, .inner-span').hide(); //hide .inner-span
			$(element).find('img, span, link').hide();
		}

		/**
		 * Update all scale values
		 */
		function updateScales(){
			hexWidth = settings.hexWidth;
			hexHeight = ( Math.sqrt(3) * hexWidth ) / 2;
			edgeWidth = hexWidth / 2;

			$(element).find('.hex').width(hexWidth).height(hexHeight);
			$(element).find('.hex_l, .hex_r').width(hexWidth).height(hexHeight);
			$(element).find('.hex_inner').width(hexWidth).height(hexHeight);
		}

		/**
		 * update css classes
		 */
		function reorder(animate){

			updateScales();
			width = $(element).width();

			newWidth = ( num / 1.5) * settings.hexWidth;

			if(newWidth < width){
				width = newWidth;
			}

			$wrapper.width(width);

			var row = 0; // current row
			var upDown = 1; // 1 is down
			var left = 0; // pos left
			var top = 0; // pos top

			var cols = 0;

			$(element).find('.hex').each(function(index){

				top = ( row * (hexHeight + settings.margin) ) + (upDown * (hexHeight / 2 + (settings.margin / 2)));

				if(animate == true){
					$(this).stop(true, false);
					$(this).animate({'left': left, 'top': top});
				}else{
					$(this).css('left', left).css('top', top);
				}

				left = left + ( hexWidth - hexWidth / 4 + settings.margin );
				upDown = (upDown + 1) % 2;

				if(row == 0){
					cols = cols + 1;
				}

				if(left + hexWidth > width){
					left = 0;
					row = row + 1;
					upDown = 1;
				}
			});

			$wrapper
				.width(cols * (hexWidth / 4 * 3 + settings.margin) + hexWidth / 4)
				.height((row + 1) * (hexHeight + settings.margin) + hexHeight / 2);
		}

		$(window).resize(function(){
			reorder(true);
		});

		// Experimental https://github.com/akfish/node-vibrant/
		/*$(element).find('.hex').each(function(){
			var image = $(this).find('img').attr('src');
			$.getScript('js/vibrant.min.js'), function() {
				var v = new Vibrant(image);
			}
			console.log(v);
		});*/
				
		// Mouseover events
		$(element).find('.hex').mouseenter(function(){
			$(this).find('.inner-text').attr('style', 'transition: color 0.5s ease;  color:black');
			$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color:'+settings.bg_color);
		});

		$(element).find('.hex').mouseleave(function(){
			$(this).find('.inner-text').attr('style', 'transition: color 0.5s ease;  color:inherit');
			$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color:none');
		});

		buildHtml();
		reorder(false);
	}

	return this.each(function() {
		initialise(this);
	});

}

}(jQuery));