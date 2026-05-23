const { ipcRenderer } = require('electron');

window.ipcRenderer = ipcRenderer;

window.browserAPI = {
  getExtensionsDir: () => ipcRenderer.invoke('get-extensions-dir'),
  loadExtension: (url) => ipcRenderer.invoke('load-extension', url),
  listExtensions: () => ipcRenderer.invoke('list-extensions')
};

console.log('Mambo Preload system ready!');