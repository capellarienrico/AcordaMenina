class Scheduler {
  constructor(onTriggerAlert) {
    this.onTriggerAlert = onTriggerAlert;
    this.timers = new Map(); // eventId -> timeoutId
    this.dismissedEvents = new Set();
    this.activeEvents = [];
  }

  /**
   * Atualiza a lista de eventos e reprograma os alertas.
   */
  scheduleEvents(events, generalConfig, filterConfig) {
    this.activeEvents = events;
    this.clearAllTimers();

    const now = Date.now();
    const alertLeadMs = ((generalConfig.defaultAlertMinutes || 1) * 60 +
                         (generalConfig.defaultAlertSeconds || 0)) * 1000;

    for (const event of events) {
      if (this.dismissedEvents.has(event.id)) continue;

      // Filtros
      if (filterConfig.onlyWithVideo && !event.videoLink) continue;
      if (filterConfig.onlyAccepted && event.status === 'TENTATIVE') continue;
      if (event.isAllDay && !filterConfig.showAllDay) continue;

      const eventStartMs = new Date(event.start).getTime();
      const triggerTimeMs = eventStartMs - alertLeadMs;
      const delay = triggerTimeMs - now;

      // Se o evento está nos próximos instantes ou começou recentemente (até 5 min atrás) e ainda não foi alertado
      if (delay > 0) {
        const timerId = setTimeout(() => {
          this.trigger(event);
        }, delay);
        this.timers.set(event.id, timerId);
      } else if (delay <= 0 && (now - eventStartMs) < 5 * 60 * 1000) {
        // Se já está na hora ou atrasado até 5 min
        this.trigger(event);
      }
    }
  }

  trigger(event) {
    this.dismissedEvents.add(event.id);
    if (this.timers.has(event.id)) {
      clearTimeout(this.timers.get(event.id));
      this.timers.delete(event.id);
    }
    if (this.onTriggerAlert) {
      this.onTriggerAlert(event);
    }
  }

  snooze(event, minutes) {
    const snoozeMs = minutes * 60 * 1000;
    this.dismissedEvents.delete(event.id);

    if (this.timers.has(event.id)) {
      clearTimeout(this.timers.get(event.id));
    }

    const timerId = setTimeout(() => {
      this.trigger(event);
    }, snoozeMs);

    this.timers.set(event.id, timerId);
    console.log(`Evento "${event.title}" adiado por ${minutes} minutos.`);
  }

  dismiss(eventId) {
    this.dismissedEvents.add(eventId);
    if (this.timers.has(eventId)) {
      clearTimeout(this.timers.get(eventId));
      this.timers.delete(eventId);
    }
  }

  clearAllTimers() {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }
}

module.exports = Scheduler;
