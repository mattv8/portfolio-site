{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/hexagons.css" />

{*Page specific JS*}
<script src="js/hexagons.js"></script>
<script src="js/server.js"></script>

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