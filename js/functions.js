/*
    Javascript Functions
*/

let pageLoaded = false;
var rotations = 0;

function goToPage(page, replaceSelector, _this) {

  const $hexParent = $(_this).parent();// Capture parent element

  // Redirect to root if page is null
  if (!page) { page = GLOBAL.config.default_page; }

  // Else route to specified page asynchronously
  if (!$hexParent.length || ($hexParent.hasClass('hex') && $hexParent.hasClass('flipped'))) {// If it's a hexagon && flipped
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


function getRandomColor(index) {
  // Generate a random hue based on the index
  const hue = (index * 137.508) % 360;

  // Convert the HSV color to RGB
  const rgb = hsvToRgb(hue, 0.8, 0.8);

  // Convert RGB values to a CSS color string
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
}

function hsvToRgb(h, s, v) {
  let c = v * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = v - c;

  let rgb;

  if (h < 60) {
    rgb = [c, x, 0];
  } else if (h < 120) {
    rgb = [x, c, 0];
  } else if (h < 180) {
    rgb = [0, c, x];
  } else if (h < 240) {
    rgb = [0, x, c];
  } else if (h < 300) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }

  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255)
  ];
}

/**
 * Gets the final height or width of a jQuery element after transitions have occurred.
 * @param {jQuery} $element - The jQuery element whose final dimension is to be determined.
 * @param {string} dimension - The dimension to measure ('height' or 'width').
 * @returns {number} The final height or width of the element post-transition.
 */
function getFinalDimension($element, dimension) {
  // Clone the element
  const $clone = $element.clone().appendTo($element.parent()).css({
      visibility: 'hidden', // Hide the clone
      position: 'absolute', // Make sure it doesn't affect layout
  });

  // Get the final dimension from the clone
  const finalDimension = $clone[dimension]();

  // Remove the clone
  $clone.remove();

  // Return the final dimension
  return finalDimension;
}


/**
 * Creates a simple jQuery method for getFinalDimension()
 * Gets the final height of a jQuery element after transitions have occurred.
 * @returns {number} The final height of the element post-transition.
 */
$.fn.finalHeight = function() {
  return getFinalDimension(this, 'height');
};

/**
 * Creates a simple jQuery method for getFinalDimension()
 * Gets the final width of a jQuery element after transitions have occurred.
 * @returns {number} The final width of the element post-transition.
 */
$.fn.finalWidth = function() {
  return getFinalDimension(this, 'width');
};


/**
 * Highlights text within a given HTML cell element with a specified background color,
 * considering contrast ratios to determine optimal text color. The bias parameter
 * influences the decision-making process when choosing between black and white text,
 * A lower bias (e.g., close to 0) would lean more towards black text, while a higher bias
 * (e.g., close to 1) would favor white text when the contrast ratios between the
 * background color and black or white are similar.
 *
 * @param {HTMLElement} cell - The HTML cell element to be highlighted.
 * @param {string} eventColorHex - The background color in hexadecimal format.
 * @param {string} [highlightMode='cell'] - The mode of highlighting, can be 'cell' or 'text'.
 * @param {number} [bias=0.5] - A threshold to apply bias for determining text color
 *                              when contrast ratios are within a similar range.
 *
 * @returns {void} - Modifies the provided HTML cell element to apply text highlighting
 *                  or sets the background color based on the specified mode.
 */
function highlightTextWithContrast(cell, eventColorHex, highlightMode = 'cell', opacity = 1, bias = 0.52) {

  if (!(cell instanceof HTMLElement) || typeof eventColorHex !== 'string' || !eventColorHex.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Invalid input: cell must be a DOM element, and eventColorHex must be a valid hex color code.');
  }

  // Calculate the contrast ratio between the event color and black
  const contrastWithBlack = getContrastRatio(eventColorHex, '#000000');

  // Calculate the contrast ratio between the event color and white
  const contrastWithWhite = getContrastRatio(eventColorHex, '#FFFFFF');

  // Apply skew factor when the contrast ratios are within a threshold
  const textColor = Math.abs(contrastWithBlack - contrastWithWhite) < bias
      ? 'white' // Bias towards white text color
      : (contrastWithBlack > contrastWithWhite ? 'black' : 'white'); // Determine the best text color based on maximum contrast

  // Set the background color or text highlight based on the mode
  if (highlightMode === 'text') {
      var text = $(cell).text();
      var highlightDiv = $('<div/>', {
          class: 'highlighted-text',
          text: text,
          css: {
              backgroundColor: eventColorHex,
              color: textColor,
              opacity: opacity,
          }
      });
      $(cell).empty().append(highlightDiv);
  } else {
      $(cell).css({
          'background-color': eventColorHex,
          color: textColor,
          opacity: opacity,
      });
  }
}


/**
* Convert a hex color to rgba format.
*
* @param {string} hexColor - The input hex color (e.g., "#0011ff").
* @param {number} alpha - The alpha component (opacity) value between 0 and 1.
* @returns {string} The color in rgba format (e.g., "rgba(0, 17, 255, 0.5)").
*/
function hexToRgba(hexColor, alpha) {

  if (hexColor) {
      // Parse the hexadecimal color to get the individual RGB components
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      // Create the rgba color
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
      return null;
  }
}


/**
* Calculates the contrast ratio between two colors based on their luminance.
*
* @param {string} color1 - The first color in hexadecimal or color name format.
* @param {string} color2 - The second color in hexadecimal or color name format.
* @returns {number} - The contrast ratio between the two colors, normalized and adjusted for readability.
*                    A higher ratio indicates better contrast (0 means no contrast, 1 means identical colors).
*
* @example
* // Example usage:
* const contrast1 = getContrastRatio('#FFFFFF', 'red'); // Returns contrast ratio
* const contrast2 = getContrastRatio('blue', '#FFFFFF'); // Returns contrast ratio
*/
function getContrastRatio(color1, color2) {
  const hexColor1 = getColorHex(color1);
  const hexColor2 = getColorHex(color2);

  const luminance1 = getLuminance(hexColor1);
  const luminance2 = getLuminance(hexColor2);
  const brighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return ((brighter + 0.05) / (darker + 0.05) * 0.05) - 0.05; // Normalized
}

/**
* Calculates the relative luminance of a color in the sRGB color space.
*
* @param {string} color - The color in hexadecimal or color name format (e.g., '#RRGGBB' or 'red').
* @returns {number} - The luminance value, a weighted sum of the color channels,
*                    indicating the brightness of the color (between 0 and 1).
*
* @example
* // Example usage:
* const luminanceValue = getLuminance('green'); // Returns a luminance value between 0 and 1
*/
function getLuminance(color) {
  const hexColor = getColorHex(color);

  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance;
}

/**
* Converts a color name to its hex representation if the input is a valid color name.
* If the input is already a hex color, it returns the input unchanged.
*
* @param {string} color - The color in hexadecimal or color name format.
* @returns {string} - The color in hexadecimal format.
*/
function getColorHex(color) {
  // Check if the input is a valid hex color
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color;
  }

  // Convert color name to hex
  const element = document.createElement('div');
  element.style.color = color;
  const computedColor = window.getComputedStyle(document.body.appendChild(element)).color;
  document.body.removeChild(element);

  // Extract hex value from the computed color
  const hexMatch = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (hexMatch) {
      return `#${parseInt(hexMatch[1], 10).toString(16).padStart(2, '0')}${parseInt(hexMatch[2], 10).toString(16).padStart(2, '0')}${parseInt(hexMatch[3], 10).toString(16).padStart(2, '0')}`;
  }

  // Return a default color if conversion fails
  return '#000000';
}