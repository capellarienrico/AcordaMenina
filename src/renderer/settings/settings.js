let currentConfig = null;

// Elementos
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Inputs Geral
const cfgStartup = document.getElementById('cfg-startup');
const cfgAlertMin = document.getElementById('cfg-alert-min');
const cfgAlertSec = document.getElementById('cfg-alert-sec');
const cfgAlertSound = document.getElementById('cfg-alert-sound');
const btnPreviewSound = document.getElementById('btn-preview-sound');
const cfgSnooze1 = document.getElementById('cfg-snooze-1');
const cfgSnooze2 = document.getElementById('cfg-snooze-2');
const cfgSnooze3 = document.getElementById('cfg-snooze-3');

// Inputs Calendários
const cfgRefreshInterval = document.getElementById('cfg-refresh-interval');
const calendarAccountsList = document.getElementById('calendar-accounts-list');
const newCalName = document.getElementById('new-cal-name');
const newCalUrl = document.getElementById('new-cal-url');
const btnAddCalendar = document.getElementById('btn-add-calendar');
const btnSyncNow = document.getElementById('btn-sync-now');

// Inputs Filtros
const cfgDaysAhead = document.getElementById('cfg-days-ahead');
const cfgOnlyAccepted = document.getElementById('cfg-only-accepted');
const cfgOnlyVideo = document.getElementById('cfg-only-video');
const cfgShowAllDay = document.getElementById('cfg-show-allday');
const cfgAllDayTime = document.getElementById('cfg-allday-time');

// Ações Globais
const btnTestAlert = document.getElementById('btn-test-alert');
const btnSave = document.getElementById('btn-save');
const syncStatusText = document.getElementById('sync-status-text');

// Navegação de Abas
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    const targetPane = document.getElementById(tabId);
    if (targetPane) {
      targetPane.classList.add('active');
    }
  });
});

// Renderizar Calendários
function renderCalendars() {
  calendarAccountsList.innerHTML = '';
  const accounts = (currentConfig.calendars && currentConfig.calendars.accounts) || [];

  if (accounts.length === 0) {
    calendarAccountsList.innerHTML = `
      <div style="padding: 16px; background-color: var(--bg-card); border-radius: 8px; border: 1px dashed var(--border-color); text-align: center; color: var(--text-muted); font-size: 13px;">
        Nenhum calendário configurado ainda. Adicione sua URL iCal do Google Agenda abaixo para começar!
      </div>
    `;
    return;
  }

  accounts.forEach((acc, index) => {
    const item = document.createElement('div');
    item.className = 'account-item';
    item.innerHTML = `
      <div class="account-info">
        <label class="switch" style="width: 36px; height: 20px;">
          <input type="checkbox" data-idx="${index}" class="chk-cal-enabled" ${acc.enabled !== false ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <div class="account-details">
          <h4>${escapeHtml(acc.name || 'Google Agenda')}</h4>
          <span>${escapeHtml(acc.url ? (acc.url.substring(0, 48) + '...') : 'Sem URL')}</span>
        </div>
      </div>
      <div>
        <button class="btn btn-sm btn-danger btn-delete-cal" data-idx="${index}" title="Remover calendário">
          Remover
        </button>
      </div>
    `;
    calendarAccountsList.appendChild(item);
  });

  // Listeners de exclusão e checkbox
  document.querySelectorAll('.btn-delete-cal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      accounts.splice(idx, 1);
      renderCalendars();
    });
  });

  document.querySelectorAll('.chk-cal-enabled').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      accounts[idx].enabled = e.target.checked;
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Inicializar Dados
async function init() {
  if (window.api) {
    currentConfig = await window.api.getConfig();

    // Preenche Geral
    const gen = currentConfig.general || {};
    cfgStartup.checked = gen.startup !== false;
    cfgAlertMin.value = typeof gen.defaultAlertMinutes !== 'undefined' ? gen.defaultAlertMinutes : 1;
    cfgAlertSec.value = typeof gen.defaultAlertSeconds !== 'undefined' ? gen.defaultAlertSeconds : 0;
    cfgAlertSound.value = gen.alertSound || 'chime';
    const snoozes = gen.snoozeDurations || [1, 3, 5];
    cfgSnooze1.value = snoozes[0] || 1;
    cfgSnooze2.value = snoozes[1] || 3;
    cfgSnooze3.value = snoozes[2] || 5;

    // Preenche Calendários
    const cal = currentConfig.calendars || {};
    cfgRefreshInterval.value = cal.refreshIntervalMinutes || 5;
    renderCalendars();

    // Preenche Filtros
    const flt = currentConfig.eventFilters || {};
    cfgDaysAhead.value = flt.daysAhead || 7;
    cfgOnlyAccepted.checked = !!flt.onlyAccepted;
    cfgOnlyVideo.checked = !!flt.onlyWithVideo;
    cfgShowAllDay.checked = !!flt.showAllDay;
    cfgAllDayTime.value = flt.allDayTime || '09:00';
  }
}

// Adicionar Novo Calendário
btnAddCalendar.addEventListener('click', () => {
  const name = newCalName.value.trim();
  const url = newCalUrl.value.trim();

  if (!url) {
    alert('Por favor, informe a URL privada iCal do calendário.');
    return;
  }

  if (!currentConfig.calendars.accounts) {
    currentConfig.calendars.accounts = [];
  }

  currentConfig.calendars.accounts.push({
    id: 'cal-' + Date.now(),
    name: name || 'Google Agenda',
    url: url,
    enabled: true,
    color: '#38bdf8'
  });

  newCalName.value = '';
  newCalUrl.value = '';
  renderCalendars();
  alert('Calendário adicionado! Clique em "Salvar Alterações" para sincronizar.');
});

// Testar Som
btnPreviewSound.addEventListener('click', () => {
  const sound = cfgAlertSound.value;
  if (window.soundSynth) {
    window.soundSynth.play(sound);
  }
});

// Testar Alerta em Tela Cheia
btnTestAlert.addEventListener('click', async () => {
  if (window.api) {
    await window.api.testAlert({
      id: 'test-' + Date.now(),
      title: 'Alinhamento Estratégico com a Diretoria',
      description: 'Reunião importante de planejamento e alinhamento de metas.',
      start: new Date(Date.now() + 60000).toISOString(),
      videoLink: 'https://meet.google.com/abc-defg-hij',
      videoPlatform: 'Google Meet',
      calendarName: 'capellarienrico@gmail.com'
    });
  }
});

// Sincronizar Agora
btnSyncNow.addEventListener('click', async () => {
  if (window.api) {
    syncStatusText.textContent = 'Sincronizando...';
    try {
      const res = await window.api.syncCalendars();
      syncStatusText.textContent = `Sincronizado! ${res.count} eventos encontrados.`;
      setTimeout(() => {
        syncStatusText.textContent = 'AcordaMenina ativo em segundo plano';
      }, 4000);
    } catch (e) {
      syncStatusText.textContent = 'Erro ao sincronizar.';
    }
  }
});

// Salvar Configurações
btnSave.addEventListener('click', async () => {
  if (!window.api) return;

  const newConfig = {
    general: {
      startup: cfgStartup.checked,
      defaultAlertMinutes: parseInt(cfgAlertMin.value, 10) || 0,
      defaultAlertSeconds: parseInt(cfgAlertSec.value, 10) || 0,
      alertSound: cfgAlertSound.value,
      snoozeDurations: [
        parseInt(cfgSnooze1.value, 10) || 1,
        parseInt(cfgSnooze2.value, 10) || 3,
        parseInt(cfgSnooze3.value, 10) || 5
      ]
    },
    calendars: {
      refreshIntervalMinutes: parseInt(cfgRefreshInterval.value, 10) || 5,
      accounts: currentConfig.calendars.accounts || []
    },
    eventFilters: {
      daysAhead: parseInt(cfgDaysAhead.value, 10) || 7,
      onlyAccepted: cfgOnlyAccepted.checked,
      onlyWithVideo: cfgOnlyVideo.checked,
      showAllDay: cfgShowAllDay.checked,
      allDayTime: cfgAllDayTime.value || '09:00'
    }
  };

  currentConfig = await window.api.saveConfig(newConfig);
  syncStatusText.textContent = 'Configurações salvas com sucesso!';
  setTimeout(() => {
    syncStatusText.textContent = 'AcordaMenina ativo em segundo plano';
  }, 3000);
});

init();
