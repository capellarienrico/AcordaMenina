const ical = require('node-ical');

class CalendarService {
  /**
   * Extrai link de videoconferência da descrição ou localização do evento.
   */
  extractVideoLink(event) {
    const textPool = [
      event.location || '',
      event.description || '',
      event.summary || ''
    ].join('\n');

    // Google Meet
    const meetMatch = textPool.match(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}[^\s<>"']*/i) ||
                      textPool.match(/https:\/\/meet\.google\.com\/[a-zA-Z0-9_\-]+[^\s<>"']*/i);
    if (meetMatch) {
      return { url: meetMatch[0], platform: 'Google Meet' };
    }

    // Zoom
    const zoomMatch = textPool.match(/https:\/\/[a-zA-Z0-9\.\-]*zoom\.us\/[j|w]\/[0-9]+[^\s<>"']*/i);
    if (zoomMatch) {
      return { url: zoomMatch[0], platform: 'Zoom' };
    }

    // Microsoft Teams
    const teamsMatch = textPool.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"']*/i) ||
                       textPool.match(/https:\/\/teams\.live\.com\/meet\/[^\s<>"']*/i);
    if (teamsMatch) {
      return { url: teamsMatch[0], platform: 'Microsoft Teams' };
    }

    // Webex
    const webexMatch = textPool.match(/https:\/\/[a-zA-Z0-9\.\-]+\.webex\.com\/[^\s<>"']*/i);
    if (webexMatch) {
      return { url: webexMatch[0], platform: 'Webex' };
    }

    return { url: null, platform: null };
  }

  /**
   * Valida e ajusta a URL do calendário
   */
  sanitizeCalendarUrl(rawUrl) {
    let url = (rawUrl || '').trim();
    if (!url) return '';

    // Substitui webcal:// por https://
    if (url.startsWith('webcal://')) {
      url = 'https://' + url.substring(9);
    }

    return url;
  }

  /**
   * Baixa e processa um feed iCal a partir de uma URL.
   */
  async fetchCalendarFromUrl(calendarAccount) {
    try {
      const url = this.sanitizeCalendarUrl(calendarAccount.url);
      if (!url) return [];

      // Dica de debug no console
      if (!url.includes('.ics') && !url.includes('/ical/')) {
        console.warn(`[Aviso] A URL da conta "${calendarAccount.name}" não parece ser um feed .ics válido: ${url}`);
      }

      const events = await ical.async.fromURL(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AcordaMenina/1.0'
        }
      });

      const parsedEvents = [];
      const now = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setDate(now.getDate() + 14); // Busca até 14 dias futuros

      for (const key in events) {
        if (!Object.prototype.hasOwnProperty.call(events, key)) continue;
        const ev = events[key];

        if (ev.type !== 'VEVENT') continue;

        const { url: videoLink, platform: videoPlatform } = this.extractVideoLink(ev);
        const isAllDay = !ev.start.getHours && !ev.start.getMinutes;

        // Se for evento recorrente (RRULE), calcula as ocorrências no período
        if (ev.rrule) {
          const duration = (ev.end && ev.start) ? (new Date(ev.end).getTime() - new Date(ev.start).getTime()) : 3600000;
          const searchStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const occurrences = ev.rrule.between(searchStart, maxFutureDate, true);

          occurrences.forEach((occDate, idx) => {
            const start = new Date(occDate);
            const end = new Date(start.getTime() + duration);

            if (end >= now && start <= maxFutureDate) {
              parsedEvents.push({
                id: `${ev.uid || calendarAccount.id}-${start.getTime()}-${idx}`,
                title: ev.summary || 'Sem título',
                description: ev.description || '',
                location: ev.location || '',
                start: start.toISOString(),
                end: end.toISOString(),
                isAllDay,
                calendarId: calendarAccount.id,
                calendarName: calendarAccount.name || 'Google Agenda',
                color: calendarAccount.color || '#4285F4',
                videoLink,
                videoPlatform,
                status: ev.status || 'CONFIRMED'
              });
            }
          });
          continue;
        }

        // Evento único normal
        const start = ev.start ? new Date(ev.start) : null;
        const end = ev.end ? new Date(ev.end) : null;

        if (!start || isNaN(start.getTime())) continue;

        // Apenas eventos futuros ou em andamento
        if (end && end < now) continue;
        if (start > maxFutureDate) continue;

        parsedEvents.push({
          id: ev.uid || `${calendarAccount.id}-${start.getTime()}`,
          title: ev.summary || 'Sem título',
          description: ev.description || '',
          location: ev.location || '',
          start: start.toISOString(),
          end: end ? end.toISOString() : null,
          isAllDay,
          calendarId: calendarAccount.id,
          calendarName: calendarAccount.name || 'Google Agenda',
          color: calendarAccount.color || '#4285F4',
          videoLink,
          videoPlatform,
          status: ev.status || 'CONFIRMED'
        });
      }

      // Ordenar por horário de início
      parsedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return parsedEvents;
    } catch (error) {
      console.error(`Erro ao sincronizar calendário [${calendarAccount.name}]:`, error.message);
      return [];
    }
  }

  /**
   * Sincroniza todas as contas ativas configuradas.
   */
  async fetchAllCalendars(accounts) {
    const allEvents = [];
    const activeAccounts = accounts.filter(acc => acc.enabled !== false && acc.url);

    for (const acc of activeAccounts) {
      const events = await this.fetchCalendarFromUrl(acc);
      allEvents.push(...events);
    }

    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return allEvents;
  }
}

module.exports = new CalendarService();
