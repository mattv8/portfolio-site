/*
    Javascript Functions
*/

function goToPage(page,replaceSelector) {
  
  // Redirect to root if page is null
  if(page == null){ window.location.href = '/'; return; }

  // Get logo selector
  const logo = $('.logo');

  // Else route to specified page asynchronously
  $.ajax({
      url: 'index.php',
      type: 'GET',
      data: { page: page },
      beforeSend: function() {// Start loading animation
        if (logo) { rotate(logo,500); }
      },
      complete: function() {// Stop loading animation

      },
      success: function(response) {
        let selector;
        if (replaceSelector) { 
            selector = document.getElementById(replaceSelector);
            selector.style.transition = 'opacity 500ms';
            selector.style.opacity = 0;
        } else {
            document.body.style.transition = 'opacity 500ms';
            document.body.style.opacity = 0;
        }
        setTimeout(function() {
            if (replaceSelector) {
                var parser = new DOMParser();
                var newDoc = parser.parseFromString(response, 'text/html');
                var container = newDoc.getElementById(replaceSelector);
                selector.innerHTML = container.innerHTML;
        
                var scripts = container.getElementsByTagName('script');
                for (var i = 0; i < scripts.length; i++) {
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = scripts[i].src;
                    selector.appendChild(script);
                }
        
                selector.style.transition = 'opacity 500ms';
                selector.style.opacity = 1;
            } else {
                var parser = new DOMParser();
                var newDoc = parser.parseFromString(response, 'text/html');
                document.head.innerHTML = newDoc.head.innerHTML;
                document.body.innerHTML = newDoc.body.innerHTML;
        
                var scripts = newDoc.getElementsByTagName('script');
                for (var i = 0; i < scripts.length; i++) {
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = scripts[i].src;
                    document.body.appendChild(script);
                }
        
                document.body.style.transition = 'opacity 500ms';
                document.body.style.opacity = 1;
            }
        }, 500);
          
          history.pushState(page, null, '/?page=' + page);// add the page to the browser's history
      },
  });
}


function fade(element) {
  var op = 0;
  var timer = setInterval(function() {
    if (op >= 1) clearInterval(timer);
    element.style.opacity = op;
    element.style.filter = 'alpha(opacity=' + op * 100 + ")";
    op += op * 0.1 || 0.1;
  }, 20);
}


// Continuously Rotate Function
var step = 0;
function rotate(selector,time) {
  if(selector){
    const element = selector.get(0);
    element.style.transition = 'transform 0.75s cubic-bezier(.61,.01,.41,.99)';
    element.style.setProperty('transform-style', 'preserve-3d');
    element.style.setProperty('perspective', '1000px');
    element.style.transform = `rotateY(${step}deg)`;
    step += 180;
    setTimeout(rotate, time, selector, (step)?time:step);
  }
}

//Loading Animation
function showLoadingAnimation() {
  document.getElementById('loading-animation').style.display = 'block';
}


function centerpoint(element) {
	var position = element.position();
	var width = element.width();
	var height = element.height();
	return center = {
	  left: position.left + width / 2,
	  top: position.top + height / 2
	}
}


function drawDot(xy, parent, rad) {
  var radius = (rad)?rad:5;// Default 5px
	var dot = document.createElement("div");
	dot.style.width = radius + "px";
	dot.style.height = radius + "px";
	dot.style.borderRadius = "50%";
	dot.style.background = "red";
	dot.style.position = "absolute";
	dot.style.left = xy.left - radius/2 + "px";
	dot.style.top = xy.top - radius/2 + "px";
	parent.append(dot);
}
