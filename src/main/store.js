const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Store {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.configPath = path.join(this.userDataPath, 'config.json');
    this.defaults = {
      general: {
        startup: true,
        defaultAlertMinutes: 1,
        defaultAlertSeconds: 0,
        alertSound: 'chime',
        snoozeDurations: [1, 3, 5]
      },
      calendars: {
        refreshIntervalMinutes: 5,
        accounts: []
      },
      eventFilters: {
        daysAhead: 7,
        onlyAccepted: false,
        onlyWithAlert: false,
        onlyWithVideo: false,
        showAllDay: false,
        allDayTime: '09:00'
      }
    };
    this.data = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          general: { ...this.defaults.general, ...(parsed.general || {}) },
          calendars: { ...this.defaults.calendars, ...(parsed.calendars || {}) },
          eventFilters: { ...this.defaults.eventFilters, ...(parsed.eventFilters || {}) }
        };
      }
    } catch (e) {
      console.error('Erro ao ler config:', e);
    }
    return JSON.parse(JSON.stringify(this.defaults));
  }

  saveConfig() {
    try {
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Erro ao salvar config:', e);
    }
  }

  get(section) {
    return this.data[section] || {};
  }

  getAll() {
    return this.data;
  }

  set(section, updates) {
    this.data[section] = { ...(this.data[section] || {}), ...updates };
    this.saveConfig();
    return this.data[section];
  }

  setAll(newConfig) {
    this.data = {
      general: { ...this.data.general, ...(newConfig.general || {}) },
      calendars: { ...this.data.calendars, ...(newConfig.calendars || {}) },
      eventFilters: { ...this.data.eventFilters, ...(newConfig.eventFilters || {}) }
    };
    this.saveConfig();
    return this.data;
  }
}

module.exports = new Store();
