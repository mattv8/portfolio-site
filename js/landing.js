$(document).ready(function() {

	// Wait for images to load then execute scripts
	$('.hexagons').waitForImages(function() {
		$('.hexagons').hexagons(); // Set up hexagons
		$('.hexagons').fadeIn(10); // Fade in when loaded
	});

	// Play video after it has finished loading
	var e = document.getElementById("bgvideo");
	if(e) {
		e.style.opacity = 0;
		var vid = document.getElementById("bgvideo");
		var tim = setInterval(function() {
			if ( vid.readyState === 4) {
			clearInterval(tim);
			fade(e);
			}
		}, 100);
	}

	document.getElementById('loading-animation').style.display = 'none';// Hide the loading animation

});// END $(document).ready( )