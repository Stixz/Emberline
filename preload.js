const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openApp: (url) => ipcRenderer.send('open-app', url),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window')
});

// Inject CSS to hide scrollbars
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
