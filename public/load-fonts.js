// Non-blocking webfont loading (replaces the inline onload="this.media='all'" handler,
// which would be blocked once 'unsafe-inline' is removed from script-src).
(function () {
  var links = document.querySelectorAll('link[data-swap-media]');
  for (var i = 0; i < links.length; i++) {
    (function (link) {
      if (link.sheet) {
        link.media = 'all';
      } else {
        link.addEventListener('load', function () {
          link.media = 'all';
        });
      }
    })(links[i]);
  }
})();
