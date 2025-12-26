const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend port for API calls
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),

  // License management
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },

  // Support
  sendFeedback: (data) => ipcRenderer.invoke('send-feedback', data),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Check if running in Electron
  isElectron: true
});
