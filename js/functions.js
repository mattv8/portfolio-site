/*
    Javascript Functions
*/

let pageLoaded = false;
var rotations = 0;

function goToPage(page, replaceSelector, _this) {

	const $hexParent = $(_this).parent();

  // Redirect to root if page is null
  if (!page) { page = GLOBAL.config.default_page; }

  // Else route to specified page asynchronously
  if ($hexParent.hasClass('flipped')) {
    $.ajax({
      url: 'index.php',
      type: 'GET',
      data: { page: page },
      beforeSend: function () {// Start loading animation
        pageLoaded = false;
        rotations = 0;// Reset rotations
        if (_this) { rotate(_this, .5, 2); }
      },
      complete: function () {// Stop loading animation
        pageLoaded = true;// Stop the rotate function with flag
      },
      success: function (response) {
        let selector;
        if (replaceSelector) {
          selector = document.getElementById(replaceSelector);
          selector.style.transition = 'opacity 500ms';
          selector.style.opacity = 0;
        } else {
          document.body.style.transition = 'opacity 500ms';
          document.body.style.opacity = 0;
        }
        setTimeout(function () {
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

        var popstate = (page === GLOBAL.config.default_page) ? '/' : `/?page=${page}`;
        history.pushState(page, null, popstate);// add the page to the browser's history
      },
    });
  }
}


function fade(element) {
  var op = 0;
  var timer = setInterval(function () {
    if (op >= 1) clearInterval(timer);
    element.style.opacity = op;
    element.style.filter = 'alpha(opacity=' + op * 100 + ")";
    op += op * 0.1 || 0.1;
  }, 20);
}


// Continuously Rotate Function
function rotate(selector, time, decayTime) {
  let element;
  if (typeof selector === 'string') {
    element = document.querySelector(selector);
  } else if (typeof selector === 'object' && selector.nodeType === 1) {
    element = selector;
  } else {
    element = selector.get(0);
  }

  // Static styles
  element.style.setProperty('transform-style', 'preserve-3d');
  element.style.setProperty('perspective', '1000px');

  if (element && !pageLoaded) {

    // Linearly decrease the rotation speed with decayTime
    const slope = time / (decayTime * 1000); // slope of the line connecting (0, time) and (decayTime, 0)
    const newTime = Math.max(time - slope * rotations, 0); // new time = time - slope * current rotations

    // Dynamic styles
    element.style.transition = `transform ${time}s cubic-bezier(.59,.22,.36,.81)`;
    element.style.transform = `rotateY(${rotations}deg)`;
    rotations += 180;

    // Recurse, with new time
    console.log(newTime);
    setTimeout(rotate, newTime * 1000, selector, time, decayTime);
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
  var radius = (rad) ? rad : 5;// Default 5px
  var dot = document.createElement("div");
  dot.style.width = radius + "px";
  dot.style.height = radius + "px";
  dot.style.borderRadius = "50%";
  dot.style.background = "red";
  dot.style.position = "absolute";
  dot.style.left = xy.left - radius / 2 + "px";
  dot.style.top = xy.top - radius / 2 + "px";
  parent.append(dot);
}


/**
 * Function to handle the display of the background video
 *
 * This function checks if the video has already been cached from a previous page load.
 * If the video is not cached, it sets an interval to check if the video is ready to play.
 * Once the video is ready, it calls the fade function.
 */
function loadVideo(videoId) {
  const vid = document.getElementById(videoId);
  if (vid && window.performance && window.performance.getEntriesByType("navigation")[0].type !== "back_forward") {
    vid.style.opacity = 0;
    var time = setInterval(function () {
      if (vid.readyState === 4) {
        clearInterval(time);
        fade(vid);
      }
    }, 100);
  }
}
