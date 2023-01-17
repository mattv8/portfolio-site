{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/hexagons.css" />

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

<div class="hexagons" style="width:100%;">
{foreach from=$servers item=server key=key}
	<div class="hex button {$server.status}" onclick="this.remove()">
		<span>{$key}</span>
		<p class="inner-text-flipped">
			Type: {($server.type)?$server.type:'qemu'}<br>
			Name: {$server.name}<br>
			Status: {$server.status}<br>
			Availability: {$server.availability}%<br>
			Uptime: {$server.uptimeHR}<br>
			Disk Use: {({$server.disk / $server.maxdisk}*100)|round:2}%<br>
			Mem Use: {({$server.mem / $server.maxmem}*100)|round:2}%<br>
		</p>
	</div>
	{* <div class="hex invisible"> </div> <!-- invisible --> *}
{/foreach}
</div>