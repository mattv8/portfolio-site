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
    <div class="hex rounded flip button" onclick="goToPage('server','page-content',this)">
        <img class="bg" src="{$image.server}" /><span>Homelab</span>
        <p class="inner-text-flipped">
            Live dashboard of my homelab.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="squareHex(this, 'resume', '600px', '100%')">
        <img class="bg" src="{$image.resume}" /><span>About Me</span>
        <p class="inner-text-flipped">
            Read a bit about me.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="squareHex(this, 'programming', '275px', '80%')">
        <img class="bg" src="{$image.programming}" /><span>Programming</span>
        <p class="inner-text-flipped">
            Git Repositories and other open source code.
        </p>
    </div>
    <div class="hex rounded flip button" onclick="goToPage('film','page-content',this)">
        <img class="bg" src="{$image.film}" /><span>Film Portfolio</span>
        <p class="inner-text-flipped">
            View my film resume.
        </p>
    </div>
    <div class="hex logo button" title="Shuffle images!!" onclick="shuffleImages(this)">
        <img class="bg" src="assets/images/all/vis_logo_light.png" />
    </div>
    <div class="hex rounded flip button" onclick="squareHex(this, 'placeholder', '275px', '80%')">
        <img class="bg" src="{$image.livestreaming}" /><span>Livestreaming</span>
        <p class="inner-text-flipped">
            Portfolio of my livestreaming productions.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
    <div class="hex rounded flip button" onclick="squareHex(this, 'placeholder', '275px', '80%')">
        <img class="bg" src="{$image.engineering}" /><span>Engineering</span>
        <p class="inner-text-flipped">
            Showcase of engineering projects.
        </p>
    </div>
    <div class="hex invisible"></div>{* Invisible *}
</div>

{*Footer*}
<footer class="footer" id="footer">
    <div class="footer-content">
        <div>Made with ❤️ by Matt</div>
        <div class="last-updated">Last updated on <span id="last-updated"></span></div>
    </div>
</footer>
