/**
 * NSD Origin Page Linker
 *
 * Paste this into WooCommerce via a code snippets plugin.
 * It rewrites every link pointing to quote.neonsignsdepot.com so that the
 * current page path is carried as ?origin_page=/current-page/.
 *
 * This enables the Sales Engine dashboard to attribute quote conversions
 * back to the originating SEO landing page.
 */
(function () {
  if (typeof window === 'undefined') return;

  var QUOTE_HOST = 'quote.neonsignsdepot.com';

  function getOriginPath() {
    var p = window.location.pathname || '/';
    p = p.split('?')[0];
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p;
  }

  function tagLinks() {
    var originPath = getOriginPath();
    var links = document.querySelectorAll('a[href*="' + QUOTE_HOST + '"]');

    for (var i = 0; i < links.length; i++) {
      var href = links[i].href;
      try {
        var url = new URL(href);
        if (url.hostname !== QUOTE_HOST) continue;
        url.searchParams.set('origin_page', originPath);
        links[i].href = url.toString();
      } catch (e) {
        /* skip malformed URLs */
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tagLinks);
  } else {
    tagLinks();
  }
})();
