let currentEvent = null;
let countdownInterval = null;

// Elementos
const countdownEl = document.getElementById('countdown');
const platformIconEl = document.getElementById('platform-icon');
const calendarNameEl = document.getElementById('calendar-name');
const eventTitleEl = document.getElementById('event-title');
const eventTimeEl = document.getElementById('event-time');
const eventDescEl = document.getElementById('event-description');
const btnAction = document.getElementById('btn-action');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');
const btnDismiss = document.getElementById('btn-dismiss');
const snoozeContainer = document.getElementById('snooze-buttons-container');

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateCountdown() {
  if (!currentEvent || !currentEvent.start) return;

  const now = Date.now();
  const startMs = new Date(currentEvent.start).getTime();
  const diffSec = Math.floor((startMs - now) / 1000);

  if (diffSec > 60) {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    countdownEl.textContent = `Começa em ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    countdownEl.style.color = '#38bdf8';
  } else if (diffSec > 0) {
    countdownEl.textContent = `Começa em ${diffSec}s!`;
    countdownEl.style.color = '#fbbf24';
  } else if (diffSec >= -60) {
    countdownEl.textContent = 'Começando agora!';
    countdownEl.style.color = '#22c55e';
  } else {
    const minsLate = Math.floor(Math.abs(diffSec) / 60);
    countdownEl.textContent = `Em andamento há ${minsLate} min`;
    countdownEl.style.color = '#f87171';
  }
}

function renderAlert(data) {
  currentEvent = data;

  // Tocar som configurado
  if (window.soundSynth) {
    window.soundSynth.play(data.sound || 'chime');
  }

  // Título e Detalhes
  eventTitleEl.textContent = data.title || 'Compromisso sem título';
  calendarNameEl.textContent = data.calendarName || 'Google Agenda';

  const startTimeStr = formatTime(data.start);
  const endTimeStr = data.end ? ` - ${formatTime(data.end)}` : '';
  eventTimeEl.textContent = `Horário: ${startTimeStr}${endTimeStr}`;

  if (data.description && data.description.trim()) {
    eventDescEl.textContent = data.description.trim();
    eventDescEl.style.display = 'block';
  } else {
    eventDescEl.style.display = 'none';
  }

  // Configuração do Botão de Ação
  if (data.videoLink) {
    btnAction.style.display = 'inline-flex';
    btnText.textContent = `Entrar no ${data.videoPlatform || 'Google Meet'}`;
    if (data.videoPlatform === 'Google Meet') {
      platformIconEl.textContent = '🟢';
      btnIcon.textContent = '📹';
    } else if (data.videoPlatform === 'Zoom') {
      platformIconEl.textContent = '🔵';
      btnIcon.textContent = '📹';
    } else if (data.videoPlatform === 'Microsoft Teams') {
      platformIconEl.textContent = '🟣';
      btnIcon.textContent = '👥';
    } else {
      platformIconEl.textContent = '🔗';
      btnIcon.textContent = '🚀';
    }
  } else {
    btnIcon.textContent = '✓';
    btnText.textContent = 'Entendido / Fechar';
  }

  // Botões de Soneca Dinâmicos
  snoozeContainer.innerHTML = '';
  const snoozes = data.snoozeDurations || [1, 3, 5];
  snoozes.forEach((min) => {
    const btn = document.createElement('button');
    btn.className = 'btn-pill';
    btn.textContent = `+${min} min`;
    btn.addEventListener('click', () => {
      if (window.api && currentEvent) {
        window.api.snoozeAlert(currentEvent, min);
      }
    });
    snoozeContainer.appendChild(btn);
  });

  // Atualizar Contagem
  if (countdownInterval) clearInterval(countdownInterval);
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function closeAlert() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (window.api) {
    const id = currentEvent ? currentEvent.id : 'dismiss';
    window.api.dismissAlert(id);
  }
}

// Ações
btnAction.addEventListener('click', () => {
  if (currentEvent && currentEvent.videoLink) {
    window.api.openLink(currentEvent.videoLink);
  } else {
    closeAlert();
  }
});

btnDismiss.addEventListener('click', closeAlert);

const btnCloseOverlay = document.getElementById('btn-close-overlay');
if (btnCloseOverlay) {
  btnCloseOverlay.addEventListener('click', closeAlert);
}

// Atalhos de teclado (ESC = dispensar, Enter = entrar na reunião)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAlert();
  } else if (e.key === 'Enter') {
    btnAction.click();
  }
});

// Listener do IPC
if (window.api) {
  window.api.onAlertTriggered((data) => {
    renderAlert(data);
  });
}
