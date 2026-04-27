const { contextBridge } = require('electron');

// Inject CSS to hide scrollbars in the app window
window.addEventListener('DOMContentLoaded', () => {
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
