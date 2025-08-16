{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/server.css" />
<link rel="stylesheet" type="text/css" href="css/utils/spinner.css" />

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
			<div class="hex rounded flip button {$server.status}" data-server-name="{$server.name}" {if $server.lazy_load}data-lazy-load="true"{/if}>
				<span>{$key}</span>
				<p class="inner-text-flipped no-wrap">
					{if $server.lazy_load}
						Loading server details...<br>
						<small>Please wait</small>
					{else}
						Type: {($server.type)?$server.type:'qemu'}<br>
						Name: {$server.name}<br>
						Status: {$server.status}<br>
						{if isset($server.availability) && $server.availability !== ''}Availability: {($server.availability*100)|round:2}%<br>{/if}
						{if isset($server.uptimeHR)}Uptime: {$server.uptimeHR}<br>{/if}
						{if isset($server.mem) && isset($server.maxmem) && $server.maxmem > 0}Mem Use: {(($server.mem / $server.maxmem)*100)|round:2}%<br>{/if}
						{if isset($server.disk) && isset($server.maxdisk) && $server.maxdisk > 0}Disk Use: {(($server.disk / $server.maxdisk)*100)|round:2}%<br>{/if}
					{/if}
				</p>
			</div>
			{* <div class="hex invisible"> </div> <!-- invisible --> *}
		{/if}
	{/foreach}
</div>