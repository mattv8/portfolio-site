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
        <img class="bg" src="{$image.programming}" /><span>Programming</span>
        <link href="https://git.visnovsky.us/Matt" />
        <p class="inner-text-flipped">
            Experience my code in action, click here to explore some of my programming projects.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="{$image.engineering}" /><span>Engineering</span>
        <p class="inner-text-flipped">
            Discover my engineering expertise, click here to explore my innovative projects.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('server','page-content')">
        <img class="bg" src="{$image.server}" /><span>Server</span>
        <p class="inner-text-flipped">
            Take a peek inside my datacenter. Click here for a real-time view of what's cooking in my server room!
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="{$image.devops}" /><span>DevOps</span>
        <p class="inner-text-flipped">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
        </p>
    </div>
    <div class="hex logo"> <img class="bg" src="assets/images/landing/logo.png" /></div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="{$image.livestreaming}" /><span>Livestreaming</span>
        <p class="inner-text-flipped">
            Click here to view a portfolio of some of my previous livestreaming productions.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content')">
        <img class="bg" src="{$image.bio}" /><span>Bio</span>
        <p class="inner-text-flipped">
            Get to know the person behind the code - click here to read a little about yours truly.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
</div>