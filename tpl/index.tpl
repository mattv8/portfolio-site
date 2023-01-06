{include file="tpl/header.tpl"}

<body id="body">

<div id="loading-animation" style="display:none">
  <div class="spinner">
    <div class="bounce1"></div>
    <div class="bounce2"></div>
    <div class="bounce3"></div>
    <div class="bounce4"></div>
    <div class="bounce5"></div>
    <div class="bounce6"></div>
  </div>
</div>

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