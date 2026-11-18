class Scheduler {
  constructor(onTriggerAlert) {
    this.onTriggerAlert = onTriggerAlert;
    this.timers = new Map(); // timerKey -> timeoutId
    this.firedAlerts = new Set(); // timerKey de alertas já disparados
    this.activeEvents = [];
  }

  /**
   * Obtém a lista de tempos de antecedência configurados em milissegundos.
   */
  getAlertLeadsMs(generalConfig) {
    if (Array.isArray(generalConfig.alertTimes) && generalConfig.alertTimes.length > 0) {
      return generalConfig.alertTimes
        .filter(t => t.enabled !== false)
        .map(t => ((parseInt(t.minutes, 10) || 0) * 60 + (parseInt(t.seconds, 10) || 0)) * 1000);
    }

    // Fallback legado
    const mins = typeof generalConfig.defaultAlertMinutes !== 'undefined' ? generalConfig.defaultAlertMinutes : 15;
    const secs = typeof generalConfig.defaultAlertSeconds !== 'undefined' ? generalConfig.defaultAlertSeconds : 0;
    return [(mins * 60 + secs) * 1000];
  }

  /**
   * Atualiza a lista de eventos e reprograma os alertas.
   */
  scheduleEvents(events, generalConfig, filterConfig) {
    this.activeEvents = events;
    this.clearAllTimers();

    const now = Date.now();
    const leadsMs = this.getAlertLeadsMs(generalConfig);

    for (const event of events) {
      // Filtros
      if (filterConfig.onlyWithVideo && !event.videoLink) continue;
      if (filterConfig.onlyAccepted && event.status === 'TENTATIVE') continue;
      if (event.isAllDay && !filterConfig.showAllDay) continue;

      const eventStartMs = new Date(event.start).getTime();

      for (const leadMs of leadsMs) {
        const timerKey = `${event.id}-lead-${leadMs}`;
        if (this.firedAlerts.has(timerKey)) continue;

        const triggerTimeMs = eventStartMs - leadMs;
        const delay = triggerTimeMs - now;

        // Se o disparo for no futuro
        if (delay > 0) {
          const timerId = setTimeout(() => {
            this.trigger(event, timerKey);
          }, delay);
          this.timers.set(timerKey, timerId);
        } else if (delay <= 0 && delay > -30000 && (now - eventStartMs) < 5 * 60 * 1000) {
          // Se estiver na janela de disparo recente (até 30s de tolerância)
          this.trigger(event, timerKey);
        }
      }
    }
  }

  trigger(event, timerKey) {
    this.firedAlerts.add(timerKey);
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey));
      this.timers.delete(timerKey);
    }
    if (this.onTriggerAlert) {
      this.onTriggerAlert(event);
    }
  }

  snooze(event, minutes) {
    const snoozeMs = minutes * 60 * 1000;
    const snoozeKey = `${event.id}-snooze-${Date.now()}`;

    const timerId = setTimeout(() => {
      this.trigger(event, snoozeKey);
    }, snoozeMs);

    this.timers.set(snoozeKey, timerId);
    console.log(`Evento "${event.title}" adiado por ${minutes} minutos.`);
  }

  dismiss(eventId) {
    // Apenas marca que dispensou o alerta visual atual
  }

  clearAllTimers() {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }
}

module.exports = Scheduler;
