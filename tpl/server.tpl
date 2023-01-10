{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/hexagons.css" />

{*Page specific JS*}
<script src="js/hexagons.js"></script>
<script src="js/server.js"></script>

<div class="hexagons" style="width:100%;">
{foreach from=$servers item=server key=key}
	<div class="hex button {$server.status}" onclick="this.remove()"><span>{$key}</span><p>Uptime: {$server.availability}%</p></div>
	{* <div class="hex invisible"> </div> <!-- invisible --> *}
{/foreach}
</div>