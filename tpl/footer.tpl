{* Footer Script *}
<script type="text/javascript">

  // Back/Forward button functionality
  $(window).on('popstate hashchange', function(event) {
    var page = event.originalEvent.state;
    goToPage(page, 'page-content');
  });


</script>

{* Load Page-specific Modals *}
{if file_exists("tpl/modals/modal.$page.tpl")}
  {include file="tpl/modals/modal.$page.tpl"}
{/if}

</html>
