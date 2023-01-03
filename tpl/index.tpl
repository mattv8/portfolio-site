{include file="tpl/header.tpl"}

<body id="body">

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
	
</body>

{include file="tpl/footer.tpl"}