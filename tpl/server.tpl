{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/hexagons.css" />

{*Page specific JS*}
<script src="js/server.js"></script>

<div class="tab">
	<button class="tablinks" onclick="openTab(event, 'Overview')" id="defaultOpen">Overview</button>
	<button class="tablinks" onclick="openTab(event, 'Details')">Details</button>
	<button class="tablinks" onclick="window.location.href='https\:\/\/metrics.galaxyclass.net/d/THhuyhWmk/cluster-metrics?refresh=30s&orgId=1&kiosk'">Dashboard</button>
	<button class="tablinks" onclick="window.location.href='/'">Home</button>
</div>

<div id="Overview" class="tabcontent">
	<div class="hexagons" style="width:100%;">
		<!-- <div class="hex link"> <img class="bg" src="" /> <span></span> <link href="#"></link> </div> -->
		<div class="hex metrics"> <span>Clancy</span> </div>
		<div class="hex metrics"> <span>CRM</span> </div>
		<div class="hex metrics"> <span>File</span> </div>
		<div class="hex metrics"> <span>Git</span> </div>
		<div class="hex metrics"> <span>Lindsay</span> </div>
		<div class="hex metrics"> <span>Metrics</span> </div>
		<div class="hex metrics"> <span>Proxy</span> </div>
		<div class="hex metrics"> <span>Sandstorm</span> </div>
		<div class="hex metrics"> <span>Serenity</span> </div>
		<div class="hex metrics"> <span>TeamSpeak</span> </div>
		<div class="hex invisible"> </div> <!-- invisible -->
		<div class="hex metrics"> <span>Web</span> </div>
	</div>	
</div>

<script>
$( document ).ready(function() {
	// reorder(true);
});
</script>