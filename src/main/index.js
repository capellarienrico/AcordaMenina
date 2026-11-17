const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const store = require('./store');
const calendarService = require('./calendar-service');
const Scheduler = require('./scheduler');

let tray = null;
let settingsWindow = null;
let alertWindow = null;
let scheduler = null;
let currentEvents = [];
let syncIntervalTimer = null;

// Evitar múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.show();
      settingsWindow.focus();
    }
  });
}

function createAlertWindow() {
  alertWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  alertWindow.loadFile(path.join(__dirname, '../renderer/alert/alert.html'));
  alertWindow.setAlwaysOnTop(true, 'screen-saver');

  alertWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      alertWindow.hide();
    }
  });
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 780,
    height: 680,
    minWidth: 640,
    minHeight: 520,
    frame: true,
    title: 'AcordaMenina - Configurações',
    backgroundColor: '#18181b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html'));

  settingsWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      settingsWindow.hide();
    }
  });
}

function showAlertForEvent(event) {
  if (!alertWindow) {
    createAlertWindow();
  }

  const general = store.get('general');
  const alertData = {
    ...event,
    sound: general.alertSound || 'chime',
    snoozeDurations: general.snoozeDurations || [1, 3, 5]
  };

  alertWindow.webContents.send('alert-triggered', alertData);
  alertWindow.show();
  alertWindow.focus();
  alertWindow.setAlwaysOnTop(true, 'screen-saver');
}

async function performSync() {
  console.log('Sincronizando calendários...');
  const calConfig = store.get('calendars');
  const accounts = calConfig.accounts || [];

  currentEvents = await calendarService.fetchAllCalendars(accounts);
  console.log(`Encontrados ${currentEvents.length} eventos futuros.`);

  const general = store.get('general');
  const filters = store.get('eventFilters');
  scheduler.scheduleEvents(currentEvents, general, filters);
  updateTrayMenu();
}

function setupSyncInterval() {
  if (syncIntervalTimer) clearInterval(syncIntervalTimer);

  const calConfig = store.get('calendars');
  const intervalMinutes = Math.max(1, calConfig.refreshIntervalMinutes || 5);
  const intervalMs = intervalMinutes * 60 * 1000;

  syncIntervalTimer = setInterval(() => {
    performSync();
  }, intervalMs);
}

function updateAutoLaunch(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath
    });
  } catch (err) {
    console.error('Erro ao configurar inicialização automática:', err);
  }
}

function createTray() {
  // Criação de um ícone minimalista em buffer caso não exista arquivo
  const iconCanvas = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAExJREFUOE9jZKAQMFKon2HUAAYGxv9QmpHBgZGBgYFh1ACwAcTAoRkY/kMZDJpPjBgGkAz/j4bByAEMDAwMBgYGBvg0g9xL5PqDEgAAdBwOC1bOq5kAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(iconCanvas);
  tray.setToolTip('AcordaMenina - Alertas de Reuniões');

  tray.on('double-click', () => {
    if (settingsWindow) {
      settingsWindow.show();
      settingsWindow.focus();
    }
  });

  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  const nextEvent = currentEvents && currentEvents.length > 0 ? currentEvents[0] : null;
  const nextEventTitle = nextEvent
    ? `Próxima: ${nextEvent.title.substring(0, 20)}...`
    : 'Nenhuma reunião próxima';

  const contextMenu = Menu.buildFromTemplate([
    { label: '⏰ AcordaMenina', enabled: false },
    { type: 'separator' },
    { label: nextEventTitle, enabled: false },
    {
      label: 'Sincronizar agora',
      click: () => performSync()
    },
    {
      label: 'Testar alerta em tela cheia',
      click: () => {
        showAlertForEvent({
          id: 'test-now',
          title: 'Alinhamento Estratégico do Projeto',
          description: 'Reunião de teste para ver o alerta em tela cheia funcionando!',
          start: new Date(Date.now() + 60000).toISOString(),
          videoLink: 'https://meet.google.com/abc-defg-hij',
          videoPlatform: 'Google Meet',
          calendarName: 'Google Agenda'
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => {
        if (settingsWindow) {
          settingsWindow.show();
          settingsWindow.focus();
        }
      }
    },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return store.getAll();
});

ipcMain.handle('save-config', (event, newConfig) => {
  const updated = store.setAll(newConfig);
  if (newConfig.general && typeof newConfig.general.startup !== 'undefined') {
    updateAutoLaunch(newConfig.general.startup);
  }
  setupSyncInterval();
  performSync();
  return updated;
});

ipcMain.handle('sync-calendars', async () => {
  await performSync();
  return { success: true, count: currentEvents.length, events: currentEvents };
});

ipcMain.handle('test-alert', (event, customEvent) => {
  showAlertForEvent(customEvent || {
    id: 'test-manual',
    title: 'Daily do Time de Engenharia',
    description: 'Sincronização diária de tarefas e prioridades.',
    start: new Date(Date.now() + 60000).toISOString(),
    videoLink: 'https://meet.google.com/xyz-uvwx-rst',
    videoPlatform: 'Google Meet',
    calendarName: 'capellarienrico@gmail.com'
  });
  return true;
});

ipcMain.handle('open-link', (event, url) => {
  if (url) {
    shell.openExternal(url);
  }
  if (alertWindow) {
    alertWindow.hide();
  }
});

ipcMain.handle('dismiss-alert', (event, eventId) => {
  if (scheduler && eventId) {
    scheduler.dismiss(eventId);
  }
  if (alertWindow) {
    alertWindow.hide();
  }
});

ipcMain.handle('snooze-alert', (event, { event: ev, minutes }) => {
  if (scheduler && ev) {
    scheduler.snooze(ev, minutes);
  }
  if (alertWindow) {
    alertWindow.hide();
  }
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.hide();
  }
});

app.whenReady().then(() => {
  scheduler = new Scheduler((triggeredEvent) => {
    showAlertForEvent(triggeredEvent);
  });

  createTray();
  createAlertWindow();
  createSettingsWindow();

  // Exibir a janela de configurações na primeira vez
  settingsWindow.show();

  setupSyncInterval();
  performSync();
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // Manter rodando na bandeja
});
