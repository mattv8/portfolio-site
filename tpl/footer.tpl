{* Footer Script *}
<script type="text/javascript">
    var page = event.originalEvent.state;
  $(window).on('popstate hashchange', function(event) { // Back/Forward button functionality
    goToPage(page, 'page-content');
  });
</script>

{* Load Page-specific Modals *}
{if file_exists("tpl/modals/modal.$page.tpl")}
  {include file="tpl/modals/modal.$page.tpl"}
{/if}

</html>