const { contextBridge } = require('electron');

// Re-enable scrollbars for workspace editors where visible scroll position matters.
const APPS_WITH_VISIBLE_SCROLLBARS = new Set([
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'sites.google.com',
  'script.google.com'
]);

function shouldShowScrollbars(hostname) {
  const normalizedHost = String(hostname || '').toLowerCase();
  return APPS_WITH_VISIBLE_SCROLLBARS.has(normalizedHost);
}

window.addEventListener('DOMContentLoaded', () => {
  if (shouldShowScrollbars(window.location.hostname)) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    *::-webkit-scrollbar {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
});
