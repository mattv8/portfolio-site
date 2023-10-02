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
    <div class="hex rounded flip button" onclick="openDetails(this)">
        <img class="bg" src="{$image.programming}" /><span>Programming</span>
        <p class="inner-text-flipped">
            Click here to explore some of my open-source programming projects.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content',this)">
        <img class="bg" src="{$image.engineering}" /><span>Engineering</span>
        <p class="inner-text-flipped">
            Click here to explore some of the engineering projects I am most proud of.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('server','page-content',this)">
        <img class="bg" src="{$image.server}" /><span>Datacenter</span>
        <p class="inner-text-flipped">
            Click here for a real-time view of my datacenter.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('film','page-content')">
        <img class="bg" src="{$image.film}" /><span>Film Portfolio</span>
        <p class="inner-text-flipped">
        Film has always been a passion of mine. Visit my film resume by clicking here.
        </p>
    </div>
    <div class="hex logo button" title="Shuffle images!!"onclick="shuffleImages(this)">
        <img class="bg" src="assets/images/all/vis_logo_light.png" />
    </div>
    <div class="hex rounded flip button" onclick="goToPage('placeholder','page-content',this)">
        <img class="bg" src="{$image.livestreaming}" /><span>Livestreaming</span>
        <p class="inner-text-flipped">
            Click here to view a portfolio of some of my previous livestreaming productions.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
    <div class="hex rounded flip button" onclick="goToPage('resume','page-content',this)">
        <img class="bg" src="{$image.resume}" /><span>Résumé</span>
        <p class="inner-text-flipped">
            Get to know the person behind the code.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
</div>