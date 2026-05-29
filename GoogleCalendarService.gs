// GoogleCalendarService.gs

/**
 * Consulta a disponibilidade (FreeBusy) de múltiplos usuários/calendários.
 * Requer ativação do Advanced Google Services > Calendar API v3.
 * @param {string[]} calendarIds - Lista de IDs de calendários (e-mails dos membros).
 * @param {string} timeMin - Início do intervalo (ISO 8601).
 * @param {string} timeMax - Fim do intervalo (ISO 8601).
 * @returns {Object} Mapa calendarId -> array de períodos ocupados.
 */
function getCalendarsFreeBusy(calendarIds, timeMin, timeMax) {
  var request = {
    timeMin: timeMin,
    timeMax: timeMax,
    items: calendarIds.map(function(id) { return { id: id }; })
  };
  var response = Calendar.Freebusy.query(request);
  return response.calendars;
}
/**
 * @overview Módulo de integração com o Google Calendar para agendamento de eventos.
 *           Permite criar, atualizar e excluir eventos no Google Calendar
 *           relacionados a prazos de projetos e tarefas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID do calendário padrão.
 *   - Logger.gs: Para registrar operações do calendário.
 *
 * @integrations
 *   - Google Calendar API: Gerenciamento de eventos de calendário.
 *
 * @description
 *   Este módulo facilita a sincronização de prazos de projetos e tarefas com o Google Calendar.
 *   Ele permite que o sistema crie automaticamente eventos no calendário dos usuários
 *   ou em um calendário de equipe compartilhado, garantindo que todos estejam cientes
 *   dos próximos marcos e datas de entrega. Funções para criar, atualizar e excluir
 *   eventos são fornecidas, tornando a gestão de tempo mais eficiente.
 */

function getDefaultCalendarId() {
  // Pode ser configurado em Config.gs ou usar o calendário padrão do usuário
  return Config.getProperty("DEFAULT_CALENDAR_ID") || Session.getActiveUser().getEmail();
}

function createCalendarEvent(title, startTime, endTime, description, guests, calendarId) {
  var calId = calendarId || getDefaultCalendarId();
  try {
    var calendar = CalendarApp.getCalendarById(calId);
    if (!calendar) {
      throw new Error(`Calendário com ID ${calId} não encontrado.`);
    }
    var event = calendar.createEvent(title, new Date(startTime), new Date(endTime), {
      description: description,
      guests: guests ? guests.join(",") : ""
    });
    Logger.log(`Evento de calendário criado: ${title} (${event.getId()}) no calendário ${calId}`);
    return { success: true, message: "Evento criado com sucesso.", eventId: event.getId(), eventUrl: event.getGuestListUrl() };
  } catch (e) {
    Logger.log(`Erro ao criar evento de calendário: ${e.message}`);
    throw new Error(`Erro ao criar evento de calendário: ${e.message}`);
  }
}

function updateCalendarEvent(eventId, title, startTime, endTime, description, guests, calendarId) {
  var calId = calendarId || getDefaultCalendarId();
  try {
    var calendar = CalendarApp.getCalendarById(calId);
    if (!calendar) {
      throw new Error(`Calendário com ID ${calId} não encontrado.`);
    }
    var event = calendar.getEventById(eventId);
    if (!event) {
      throw new Error(`Evento com ID ${eventId} não encontrado.`);
    }
    event.setTitle(title);
    event.setTime(new Date(startTime), new Date(endTime));
    event.setDescription(description);
    event.setGuests(guests ? guests.join(",") : "");
    Logger.log(`Evento de calendário atualizado: ${title} (${event.getId()}) no calendário ${calId}`);
    return { success: true, message: "Evento atualizado com sucesso.", eventId: event.getId(), eventUrl: event.getGuestListUrl() };
  } catch (e) {
    Logger.log(`Erro ao atualizar evento de calendário: ${e.message}`);
    throw new Error(`Erro ao atualizar evento de calendário: ${e.message}`);
  }
}

function deleteCalendarEvent(eventId, calendarId) {
  var calId = calendarId || getDefaultCalendarId();
  try {
    var calendar = CalendarApp.getCalendarById(calId);
    if (!calendar) {
      throw new Error(`Calendário com ID ${calId} não encontrado.`);
    }
    var event = calendar.getEventById(eventId);
    if (!event) {
      throw new Error(`Evento com ID ${eventId} não encontrado.`);
    }
    event.deleteEvent();
    Logger.log(`Evento de calendário deletado: ID ${eventId} do calendário ${calId}`);
    return { success: true, message: "Evento deletado com sucesso." };
  } catch (e) {
    Logger.log(`Erro ao deletar evento de calendário: ${e.message}`);
    throw new Error(`Erro ao deletar evento de calendário: ${e.message}`);
  }
}
