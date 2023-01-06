{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/hexagons.css" />

{*Page specific JS*}
<script src="js/hexagons.js"></script>

{*Vide Background*}
<video autoplay muted loop id="bgvideo">
    <source src="assets/videos/BigTreesHI.mp4" type="video/mp4">
</video>

{*Hexagons*}
<div class="hexagons landing">
    <div class="hex link"> <img class="bg" src="assets/images/landing/1.jpg" /><span>Programming</span><link href="https://git.visnovsky.us/Matt" /></div>
    <div class="hex button" onclick="goToPage('placeholder')"><img class="bg" src="assets/images/landing/2.jpg" /><span>Engineering</span></div>
    <div class="hex button" onclick="goToPage('server')"><img class="bg" src="assets/images/landing/3.jpg" /><span>Server</span></div>
    <div class="hex button" onclick="goToPage('placeholder')"><img class="bg" src="assets/images/landing/4.jpg" /><span>Photography</span></div>
    <div class="hex logo"> <img class="bg" src="assets/images/landing/logo.png" /></div>
    <div class="hex button" onclick="goToPage('placeholder')"><img class="bg" src="assets/images/landing/5.jpg" /><span>Film</span></div>
    <div class="hex invisible"></div>{* Invisible *}
    <div class="hex button" onclick="goToPage('placeholder')"><img class="bg" src="assets/images/landing/6.jpg" /><span>Bio</span></div>
    <div class="hex invisible"></div>{* Invisible *}
</div>
