const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getEvents: () => ipcRenderer.invoke('get-events'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  syncCalendars: () => ipcRenderer.invoke('sync-calendars'),
  testAlert: (customEvent) => ipcRenderer.invoke('test-alert', customEvent),
  openLink: (url) => ipcRenderer.invoke('open-link', url),
  dismissAlert: (eventId) => ipcRenderer.invoke('dismiss-alert', eventId),
  snoozeAlert: (event, minutes) => ipcRenderer.invoke('snooze-alert', { event, minutes }),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  onAlertTriggered: (callback) => {
    ipcRenderer.on('alert-triggered', (event, data) => callback(data));
  },
  onShowAgendaTab: (callback) => {
    ipcRenderer.on('show-agenda-tab', () => callback());
  }
});
