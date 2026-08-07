// SPA redirect handler (moved out of index.html so the CSP can drop 'unsafe-inline').
// Decodes the ?/path querystring produced by the 404.html fallback back into a real route.
(function (l) {
  if (l.search[1] === '/') {
    var decoded = l.search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&');
      })
      .join('?');
    window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
  }
})(window.location);
