{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/landing.css" />

{*Page specific JS*}
{if file_exists('js/hexagons.min.js')}
    <script src="js/hexagons.min.js"></script>
{else}
    <script src="js/hexagons.js"></script>
{/if}
{if file_exists('js/landing.min.js')}
    <script src="js/landing.min.js"></script>
{else}
    <script src="js/landing.js"></script>
{/if}

{if $debug}
    <style>
        .landing {
            border-style: solid;
            border-width: 1px;
            border-color: blue;
        }
    </style>
{/if}

{*Hexagons*}
<div class="hexagons landing">
    <div class="hex rounded flip link">
        <img class="bg" src="assets/images/landing/1.jpg" /><span>Programming</span>
        <link href="https://git.visnovsky.us/Matt" />
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="assets/images/landing/2.jpg" /><span>Engineering</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('server','page-content')">
        <img class="bg" src="assets/images/landing/3.jpg" /><span>Server</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="assets/images/landing/4.jpg" /><span>DevOps</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex logo"> <img class="bg" src="assets/images/landing/logo.png" /></div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="assets/images/landing/5.jpg" /><span>Livestreaming</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="assets/images/landing/6.jpg" /><span>Bio</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
</div>