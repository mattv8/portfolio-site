{* Footer Script *}
<script type="text/javascript">

  // Back button functionality
  $(window).on('popstate', function(event) {
    var page = (event.originalEvent.state) ? event.originalEvent.state : '{$default_page}';// get the page from the state of the event
    goToPage(page,'page-content');// make an AJAX request to update the page
  });

</script>

{* Load Page-specific Modals *}
{if file_exists("tpl/modals/modal.$page.tpl")}
  {include file="tpl/modals/modal.$page.tpl"}
{/if}

</html>
