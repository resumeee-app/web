/**
 * @file theme-init.js
 * Synchronous client-side theme initialization script.
 *
 * Runs synchronously in the document `<head>` prior to first paint to prevent
 * Flash of Unstyled Content (FOUC) while strictly adhering to Content Security
 * Policy (CSP) directives requiring external scripts (`script-src 'self'`).
 *
 * Inspects `localStorage` for the persisted user theme (`resumeee-theme`). If unset
 * or set to 'system', evaluates the client's OS color scheme preference via
 * `window.matchMedia('(prefers-color-scheme: dark)')`. Synchronously toggles the
 * `.dark` class on `document.documentElement` before the DOM body renders.
 */
(function () {
  try {
    var stored = localStorage.getItem('resumeee-theme') || 'system';
    var isDark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // Gracefully handle storage access restrictions (e.g. private browsing or sandboxed iframes)
  }
})();
