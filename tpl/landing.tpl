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
    <div class="hex logo button" title="Shuffle images!!" onclick="shuffleImages(this)">
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

{*Programming Hex Inner HTML*}
<style>
    .row {
        display: flex;
        height: 70%;
        transform: scaleX(-1);
    }

    .column {
        flex: 1;
        padding: 20%;
        justify-content: center;
        align-items: center;
        text-align: center;
        /* Center the text */
        position: relative;
        /* Create a stacking context */
    }

    /* Style the links as buttons */
    .button-link {
        cursor: url('/assets/images/cursors/link.svg'), auto;
        text-decoration: none;
        background-color: #0066ff;
        color: #fff;
        padding: 20px;
        margin: 0px 30px 20px 30px;
        border-radius: 5px;
        transition: background-color 0.5s ease;
    }

    .button-link:hover {
        background-color: rgb(0, 3, 189)
    }

    /* Style the images inside the buttons */
    .button-link img {
        filter: drop-shadow(2px 2px 5px black);
        width: 100%;
        height: 80%;
    }
</style>

<div class="row" id="programming-links" style="display:none;">
    <a class="column button-link" href="https://github.com/mattv8" target="_blank">
        <img src="assets/images/landing/programming-logos/github.svg" alt="GitHub">
        <p class="inner-text" style="font-size:20px;">GitHub</p>
    </a>
    <a class="column button-link" href="https://git.visnovsky.us/Matt" target="_blank" style="margin-left:0px;">
        <img src="assets/images/landing/programming-logos/gitlab.svg" alt="GitLab">
        <p class="inner-text" style="font-size:20px;">GitLab</p>
    </a>
</div>