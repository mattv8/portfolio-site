{include file="tpl/header.tpl"}

<body id="body">

{*Vide Background*}
<video autoplay muted loop id="bgvideo">
    <source src="assets/videos/BigTreesHI.mp4" type="video/mp4">
</video>

<div id="page-content">
{if $error or $page eq 'error'}
	<div class="alert alert-danger">
		<i class="fa fa-fw fa-exclamation-circle"></i> {$error}
	</div>
{else}
	{if file_exists("tpl/$page.tpl")}
		{include file="tpl/$page.tpl"}
	{else}
		{include file="tpl/placeholder.tpl"}
	{/if}
{/if}
</div>
	
</body>

{include file="tpl/footer.tpl"}