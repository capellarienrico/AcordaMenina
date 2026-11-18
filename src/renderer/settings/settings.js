let currentConfig = null;
let currentEventsList = [];

// Elementos
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Elementos Agenda
const eventsListContainer = document.getElementById('events-list-container');
const agendaSubtitle = document.getElementById('agenda-subtitle');
const btnAgendaSync = document.getElementById('btn-agenda-sync');
const agendaDateFilter = document.getElementById('agenda-date-filter');

// Inputs Geral
const cfgStartup = document.getElementById('cfg-startup');
const cfgAlert1Enable = document.getElementById('cfg-alert-1-enable');
const cfgAlert1Min = document.getElementById('cfg-alert-1-min');
const cfgAlert1Sec = document.getElementById('cfg-alert-1-sec');
const cfgAlert2Enable = document.getElementById('cfg-alert-2-enable');
const cfgAlert2Min = document.getElementById('cfg-alert-2-min');
const cfgAlert2Sec = document.getElementById('cfg-alert-2-sec');
const cfgAlert3Enable = document.getElementById('cfg-alert-3-enable');
const cfgAlert3Min = document.getElementById('cfg-alert-3-min');
const cfgAlert3Sec = document.getElementById('cfg-alert-3-sec');

const cfgAlertSound = document.getElementById('cfg-alert-sound');
const btnBrowseSound = document.getElementById('btn-browse-sound');
const btnPreviewSound = document.getElementById('btn-preview-sound');
const customSoundPathDisplay = document.getElementById('custom-sound-path-display');
const cfgAlertVolume = document.getElementById('cfg-alert-volume');
const volumeLabel = document.getElementById('volume-label');
const cfgSoundRepeat = document.getElementById('cfg-sound-repeat');
const cfgSnooze1 = document.getElementById('cfg-snooze-1');
const cfgSnooze2 = document.getElementById('cfg-snooze-2');
const cfgSnooze3 = document.getElementById('cfg-snooze-3');

let currentCustomSoundPath = '';

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
function selectTab(tabName) {
  tabButtons.forEach(b => {
    if (b.dataset.tab === tabName) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  tabPanes.forEach(p => {
    if (p.id === `tab-${tabName}`) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  if (tabName === 'agenda') {
    loadAndRenderEvents();
  }
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectTab(btn.dataset.tab);
  });
});

// Renderizar Agenda
async function loadAndRenderEvents() {
  if (!window.api) return;

  try {
    currentEventsList = await window.api.getEvents();
    renderAgendaEvents();
  } catch (err) {
    console.error('Erro ao buscar eventos:', err);
  }
}

function renderAgendaEvents() {
  eventsListContainer.innerHTML = '';

  if (!currentEventsList || currentEventsList.length === 0) {
    agendaSubtitle.textContent = 'Nenhuma reunião agendada para os próximos dias.';
    eventsListContainer.innerHTML = `
      <div style="padding: 24px; background-color: var(--bg-card); border-radius: 10px; border: 1px dashed var(--border-color); text-align: center; color: var(--text-muted);">
        <p style="font-size: 15px; margin-bottom: 8px;">Nenhum compromisso encontrado.</p>
        <p style="font-size: 13px;">Verifique se a sua agenda está cadastrada e ativada na aba <b>Calendários</b> ou clique em <b>Sincronizar</b>.</p>
      </div>
    `;
    return;
  }

  const now = new Date();
  const filterType = agendaDateFilter ? agendaDateFilter.value : '7days';

  // Calcular data limite
  let maxDate = new Date(now);
  if (filterType === 'today') {
    maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterType === '3days') {
    maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59, 999);
  } else {
    // 7days
    maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
  }

  const filteredEvents = currentEventsList.filter(ev => {
    const evDate = new Date(ev.start);
    return evDate <= maxDate;
  });

  if (filteredEvents.length === 0) {
    const periodLabel = filterType === 'today' ? 'no dia atual' : (filterType === '3days' ? 'nos próximos 3 dias' : 'nos próximos 7 dias');
    agendaSubtitle.textContent = `Nenhum compromisso encontrado para ${periodLabel}.`;
    eventsListContainer.innerHTML = `
      <div style="padding: 24px; background-color: var(--bg-card); border-radius: 10px; border: 1px dashed var(--border-color); text-align: center; color: var(--text-muted);">
        <p style="font-size: 14px;">Sem compromissos agendados para este período (${periodLabel}).</p>
      </div>
    `;
    return;
  }

  const periodDesc = filterType === 'today' ? 'hoje' : (filterType === '3days' ? 'próximos 3 dias' : 'próximos 7 dias');
  agendaSubtitle.textContent = `${filteredEvents.length} compromisso(s) encontrado(s) (${periodDesc}).`;

  // Agrupar por data (Hoje, Amanhã, Data)
  const groups = {};
  const todayStr = now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  filteredEvents.forEach(ev => {
    const evDate = new Date(ev.start);
    const evDateStr = evDate.toDateString();

    let groupTitle = '';
    if (evDateStr === todayStr) {
      groupTitle = 'Hoje';
    } else if (evDateStr === tomorrowStr) {
      groupTitle = 'Amanhã';
    } else {
      groupTitle = evDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    }

    if (!groups[groupTitle]) {
      groups[groupTitle] = [];
    }
    groups[groupTitle].push(ev);
  });

  for (const title in groups) {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'event-day-group';

    const dayTitleEl = document.createElement('div');
    dayTitleEl.className = 'event-day-title';
    dayTitleEl.textContent = title;
    dayGroup.appendChild(dayTitleEl);

    groups[title].forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card';

      const startDate = new Date(ev.start);
      const endDate = ev.end ? new Date(ev.end) : null;
      const isNow = now >= startDate && endDate && now <= endDate;
      if (isNow) {
        card.classList.add('happening-now');
      }

      const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      let videoButtonHtml = '';
      if (ev.videoLink) {
        videoButtonHtml = `
          <button class="btn-meet btn-open-video" data-url="${escapeHtml(ev.videoLink)}">
            📹 Entrar no ${escapeHtml(ev.videoPlatform || 'Meet')}
          </button>
        `;
      }

      card.innerHTML = `
        <div class="event-card-left">
          <div class="event-card-time">
            <span class="event-time-start">${startTimeStr}</span>
            <span class="event-time-end">${endTimeStr || 'Início'}</span>
          </div>
          <div class="event-card-details">
            <h4>${escapeHtml(ev.title || 'Sem título')}</h4>
            <div class="event-badges">
              <span class="badge-cal">${escapeHtml(ev.calendarName || 'Google Agenda')}</span>
              ${ev.videoPlatform ? `<span class="badge-video">📹 ${escapeHtml(ev.videoPlatform)}</span>` : ''}
              ${isNow ? '<span style="color: #22c55e; font-weight: 700;">• Em andamento</span>' : ''}
            </div>
          </div>
        </div>
        <div>
          ${videoButtonHtml}
        </div>
      `;

      dayGroup.appendChild(card);
    });

    eventsListContainer.appendChild(dayGroup);
  }

  // Listeners de clique nos links de vídeo
  document.querySelectorAll('.btn-open-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.currentTarget.dataset.url;
      if (url && window.api) {
        window.api.openLink(url);
      }
    });
  });
}

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

    // Listener para quando o processo principal terminar uma sincronização
    window.api.onSyncFinished((events) => {
      currentEventsList = events || [];
      renderAgendaEvents();
    });

    window.api.onShowAgendaTab(() => {
      selectTab('agenda');
    });

    // Renderiza inicialmente e dispara sincronização imediata ao abrir
    loadAndRenderEvents();
    agendaSubtitle.textContent = 'Sincronizando agendas automaticamente...';
    window.api.syncCalendars().then(res => {
      currentEventsList = (res && res.events) || [];
      renderAgendaEvents();
    }).catch(() => {});

    // Preenche Geral
    const gen = currentConfig.general || {};
    cfgStartup.checked = gen.startup !== false;

    // Preenche os 3 tempos de alerta
    const alertTimes = gen.alertTimes || [
      { minutes: typeof gen.defaultAlertMinutes !== 'undefined' ? gen.defaultAlertMinutes : 15, seconds: gen.defaultAlertSeconds || 0, enabled: true },
      { minutes: 5, seconds: 0, enabled: true },
      { minutes: 0, seconds: 0, enabled: true }
    ];

    if (alertTimes[0]) {
      cfgAlert1Enable.checked = alertTimes[0].enabled !== false;
      cfgAlert1Min.value = typeof alertTimes[0].minutes !== 'undefined' ? alertTimes[0].minutes : 15;
      cfgAlert1Sec.value = alertTimes[0].seconds || 0;
    }
    if (alertTimes[1]) {
      cfgAlert2Enable.checked = alertTimes[1].enabled !== false;
      cfgAlert2Min.value = typeof alertTimes[1].minutes !== 'undefined' ? alertTimes[1].minutes : 5;
      cfgAlert2Sec.value = alertTimes[1].seconds || 0;
    }
    if (alertTimes[2]) {
      cfgAlert3Enable.checked = alertTimes[2].enabled !== false;
      cfgAlert3Min.value = typeof alertTimes[2].minutes !== 'undefined' ? alertTimes[2].minutes : 0;
      cfgAlert3Sec.value = alertTimes[2].seconds || 0;
    }

    cfgAlertSound.value = gen.alertSound || 'acorda-menina';
    cfgAlertVolume.value = typeof gen.alertVolume !== 'undefined' ? gen.alertVolume : 90;
    volumeLabel.textContent = `${cfgAlertVolume.value}%`;
    cfgSoundRepeat.value = gen.soundRepeatMode || 'until-closed';
    currentCustomSoundPath = gen.customSoundPath || '';
    updateCustomSoundVisibility();

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

if (agendaDateFilter) {
  agendaDateFilter.addEventListener('change', () => {
    renderAgendaEvents();
  });
}

btnAgendaSync.addEventListener('click', async () => {
  if (window.api) {
    agendaSubtitle.textContent = 'Sincronizando compromissos...';
    try {
      const res = await window.api.syncCalendars();
      currentEventsList = res.events || [];
      renderAgendaEvents();
    } catch (e) {
      agendaSubtitle.textContent = 'Erro ao sincronizar.';
    }
  }
});

// Link rápido para abrir o Google Agenda
const linkOpenGcal = document.getElementById('link-open-gcal');
if (linkOpenGcal) {
  linkOpenGcal.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.api) {
      window.api.openLink('https://calendar.google.com/calendar/u/0/r/settings');
    }
  });
}

// Adicionar Novo Calendário
btnAddCalendar.addEventListener('click', () => {
  const name = newCalName.value.trim();
  let url = newCalUrl.value.trim();

  if (!url) {
    alert('Por favor, informe a URL do calendário.');
    return;
  }

  // Validação preventiva de URL do Google Calendar
  if (url.includes('calendar.google.com/calendar/u/') || url.includes('/cid=') || url.includes('/embed?')) {
    const confirmUse = confirm(
      'Atenção: Esse link parece ser da página web do Google Agenda e não um feed de eventos.\n\n' +
      'Para sincronizar os compromissos, copie o "Endereço secreto no formato iCal" (que termina com .ics) nas configurações da sua agenda.\n\n' +
      'Deseja adicionar esse link mesmo assim?'
    );
    if (!confirmUse) return;
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
  alert('Calendário adicionado! Clique em "Salvar Alterações" para sincronizar seus compromissos.');
});

// Controle de Som e Volume
function updateCustomSoundVisibility() {
  const isCustom = cfgAlertSound.value === 'custom';
  btnBrowseSound.style.display = isCustom ? 'inline-flex' : 'none';
  customSoundPathDisplay.style.display = (isCustom && currentCustomSoundPath) ? 'block' : 'none';
  if (currentCustomSoundPath) {
    customSoundPathDisplay.textContent = `Arquivo: ${currentCustomSoundPath}`;
  }
}

cfgAlertSound.addEventListener('change', updateCustomSoundVisibility);

cfgAlertVolume.addEventListener('input', () => {
  volumeLabel.textContent = `${cfgAlertVolume.value}%`;
});

btnBrowseSound.addEventListener('click', async () => {
  if (window.api) {
    const selected = await window.api.selectCustomSound();
    if (selected) {
      currentCustomSoundPath = selected;
      updateCustomSoundVisibility();
      // Toca um pequeno preview
      if (window.soundSynth) {
        window.soundSynth.play('custom', parseInt(cfgAlertVolume.value, 10), currentCustomSoundPath);
      }
    }
  }
});

// Testar Som
btnPreviewSound.addEventListener('click', () => {
  const sound = cfgAlertSound.value;
  const vol = parseInt(cfgAlertVolume.value, 10) || 90;
  if (window.soundSynth) {
    window.soundSynth.play(sound, vol, currentCustomSoundPath);
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

  const alertTimesConfig = [
    {
      enabled: cfgAlert1Enable.checked,
      minutes: parseInt(cfgAlert1Min.value, 10) || 0,
      seconds: parseInt(cfgAlert1Sec.value, 10) || 0
    },
    {
      enabled: cfgAlert2Enable.checked,
      minutes: parseInt(cfgAlert2Min.value, 10) || 0,
      seconds: parseInt(cfgAlert2Sec.value, 10) || 0
    },
    {
      enabled: cfgAlert3Enable.checked,
      minutes: parseInt(cfgAlert3Min.value, 10) || 0,
      seconds: parseInt(cfgAlert3Sec.value, 10) || 0
    }
  ];

  const newConfig = {
    general: {
      startup: cfgStartup.checked,
      defaultAlertMinutes: parseInt(cfgAlert1Min.value, 10) || 15,
      defaultAlertSeconds: parseInt(cfgAlert1Sec.value, 10) || 0,
      alertTimes: alertTimesConfig,
      alertSound: cfgAlertSound.value,
      alertVolume: parseInt(cfgAlertVolume.value, 10) || 90,
      soundRepeatMode: cfgSoundRepeat.value || 'until-closed',
      customSoundPath: currentCustomSoundPath || '',
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
