const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage, Notification } = require('electron');
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

// Garante apenas uma instância
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

function getAppIcon() {
  const icoPath = path.join(__dirname, '../assets/icon.ico');
  try {
    return nativeImage.createFromPath(icoPath);
  } catch (e) {
    return null;
  }
}

function createAlertWindow() {
  if (alertWindow && !alertWindow.isDestroyed()) {
    return alertWindow;
  }

  alertWindow = new BrowserWindow({
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
  alertWindow.setAlwaysOnTop(true, 'floating');

  alertWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      alertWindow.hide();
    }
  });

  return alertWindow;
}

function createSettingsWindow() {
  const icon = getAppIcon();

  settingsWindow = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 680,
    minHeight: 550,
    center: true,
    frame: true,
    title: 'AcordaMenina - Configurações',
    backgroundColor: '#18181b',
    icon: icon || undefined,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    settingsWindow.focus();
  });

  settingsWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      settingsWindow.hide();

      if (Notification.isSupported()) {
        new Notification({
          title: 'AcordaMenina',
          body: 'O aplicativo continua ativo na bandeja do sistema para monitorar suas reuniões.',
          icon: icon || undefined
        }).show();
      }
    }
  });
}

function showAlertForEvent(event) {
  const win = createAlertWindow();

  const general = store.get('general');
  const alertData = {
    ...event,
    sound: general.alertSound || 'chime',
    snoozeDurations: general.snoozeDurations || [1, 3, 5]
  };

  win.webContents.send('alert-triggered', alertData);
  win.show();
  win.focus();
  win.setAlwaysOnTop(true, 'floating');
}

async function performSync() {
  try {
    const calConfig = store.get('calendars');
    const accounts = calConfig.accounts || [];

    currentEvents = await calendarService.fetchAllCalendars(accounts);
    console.log(`Encontrados ${currentEvents.length} eventos futuros.`);

    const general = store.get('general');
    const filters = store.get('eventFilters');
    if (scheduler) {
      scheduler.scheduleEvents(currentEvents, general, filters);
    }
    updateTrayMenu();
  } catch (err) {
    console.error('Erro na sincronização:', err);
  }
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
  try {
    const icon = getAppIcon();
    tray = new Tray(icon || nativeImage.createEmpty());
    tray.setToolTip('AcordaMenina - Alertas de Reuniões');

    tray.on('click', () => {
      if (!settingsWindow) {
        createSettingsWindow();
        return;
      }
      if (settingsWindow.isVisible()) {
        settingsWindow.focus();
      } else {
        settingsWindow.show();
        settingsWindow.focus();
      }
      // Avisa o renderer para focar na aba de agenda
      settingsWindow.webContents.send('show-agenda-tab');
    });

    tray.on('double-click', () => {
      if (settingsWindow) {
        settingsWindow.show();
        settingsWindow.focus();
        settingsWindow.webContents.send('show-agenda-tab');
      }
    });

    updateTrayMenu();
  } catch (err) {
    console.error('Erro ao inicializar Tray:', err);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const menuItems = [
    { label: '⏰ AcordaMenina', enabled: false },
    { type: 'separator' }
  ];

  if (currentEvents && currentEvents.length > 0) {
    menuItems.push({ label: '📅 Próximos Compromissos:', enabled: false });

    currentEvents.slice(0, 5).forEach((ev) => {
      const timeStr = ev.start ? new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const label = `${timeStr} - ${ev.title.substring(0, 22)}${ev.title.length > 22 ? '...' : ''}`;

      menuItems.push({
        label: label,
        click: () => {
          if (ev.videoLink) {
            shell.openExternal(ev.videoLink);
          } else if (settingsWindow) {
            settingsWindow.show();
            settingsWindow.focus();
            settingsWindow.webContents.send('show-agenda-tab');
          }
        }
      });
    });
    menuItems.push({ type: 'separator' });
  } else {
    menuItems.push({ label: 'Nenhuma reunião próxima', enabled: false });
    menuItems.push({ type: 'separator' });
  }

  menuItems.push(
    {
      label: '🔄 Sincronizar Agora',
      click: () => performSync()
    },
    {
      label: '🔔 Testar Alerta em Tela Cheia',
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
      label: '⚙️ Abrir AcordaMenina',
      click: () => {
        if (settingsWindow) {
          settingsWindow.show();
          settingsWindow.focus();
          settingsWindow.webContents.send('show-agenda-tab');
        }
      }
    },
    {
      label: '❌ Sair do AcordaMenina',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return store.getAll();
});

ipcMain.handle('get-events', () => {
  return currentEvents || [];
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
  createSettingsWindow();

  setupSyncInterval();
  performSync();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
