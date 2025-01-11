{* Footer Script *}
<script type="text/javascript">
  $(window).on('popstate hashchange', function(event) { // Back/Forward button functionality
    var page = (event.originalEvent.state === GLOBAL.config.default_page) ? null : event.originalEvent.state;
    goToPage(page, 'page-content');
  });
</script>

{* Load Page-specific Modals *}
{if file_exists("tpl/modals/modal.$page.tpl")}
  {include file="tpl/modals/modal.$page.tpl"}
{/if}

</html>