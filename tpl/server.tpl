{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/server.css" />

{*Page specific JS*}
{if file_exists('js/hexagons.min.js')}
	<script src="js/hexagons.min.js"></script>
{else}
	<script src="js/hexagons.js"></script>
{/if}
{if file_exists('js/server.min.js')}
	<script src="js/server.min.js"></script>
{else}
	<script src="js/server.js"></script>
{/if}

{if $debug}
	<style>
		.server {
			border-style: solid;
			border-width: 1px;
			border-color: blue;
		}
	</style>
{/if}

<div class="hexagons server">
	{foreach from=$servers item=server key=key}
		{if isset($server.status)}
			<div class="hex rounded flip button {$server.status}" onclick="openDetails(this, '{$server.name}')">
				<span>{$key}</span>
				<p class="inner-text-flipped no-wrap">
					Type: {($server.type)?$server.type:'qemu'}<br>
					Name: {$server.name}<br>
					Status: {$server.status}<br>
					Availability: {$server.availability*100}%<br>
					Uptime: {$server.uptimeHR}<br>
					Disk Use: {({$server.disk / $server.maxdisk}*100)|round:2}%<br>
					Mem Use: {({$server.mem / $server.maxmem}*100)|round:2}%<br>
				</p>
			</div>
			{* <div class="hex invisible"> </div> <!-- invisible --> *}
		{/if}
	{/foreach}
</div>

{*Programming Hex Inner HTML*}
<div class="row" id="server-details" style="display:none;">
    <a class="column button-link" href="https://github.com/mattv8" target="_blank">
        <img src="assets/images/landing/programming-logos/github.svg" alt="GitHub">
        <p class="inner-text" style="font-size:20px;">GitHub</p>
    </a>
    <a class="column button-link" href="https://git.visnovsky.us/Matt" target="_blank" style="margin-left:0px;">
        <img src="assets/images/landing/programming-logos/gitlab.svg" alt="GitLab">
        <p class="inner-text" style="font-size:20px;">GitLab</p>
    </a>
</div>