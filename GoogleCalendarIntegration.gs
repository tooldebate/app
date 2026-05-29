/**
 * Cria evento de revisão de projeto com link do Google Meet e prepara integração para atas automáticas.
 * @param {string} projectId
 * @param {string} dateTime - Data/hora da reunião (ISO 8601)
 * @returns {Object} Dados do evento criado (inclui link do Meet)
 */
function createProjectReviewEvent(projectId, dateTime) {
  var project = ProjectManagement.getProjectById(projectId);
  if (!project) throw new Error('Projeto não encontrado.');
  var title = `Revisão do Projeto: ${project.NomeProjeto}`;
  var description = `Reunião de revisão do projeto "${project.NomeProjeto}".\nStatus: ${project.Status}`;
  var guests = [];
  if (project.ResponsavelID) {
    var responsible = UserManagement.getUserById(project.ResponsavelID);
    if (responsible && responsible.Email) guests.push(responsible.Email);
  }
  // Cria evento com link do Meet
  var event = Calendar.Events.insert({
    summary: title,
    description: description,
    start: { dateTime: dateTime },
    end: { dateTime: dateTime },
    attendees: guests.map(function(email) { return { email: email }; }),
    conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
  }, getDefaultCalendarId(), { conferenceDataVersion: 1 });
  // Salva o ID do evento no projeto, se necessário
  // ProjectManagement.setReviewEventId(projectId, event.id);
  return { eventId: event.id, meetLink: event.conferenceData.entryPoints[0].uri };
}

/**
 * Após a reunião, usa Gemini para resumir atas do Google Docs e posta no ProjectComments.gs
 * @param {string} docId - ID do Google Docs com as notas da reunião
 * @param {string} projectId
 */
function summarizeAndPostMeetingNotes(docId, projectId) {
  var doc = DocumentApp.openById(docId);
  var text = doc.getBody().getText();
  var resumo = GeminiChatService.summarize(text); // Supondo função de resumo
  ProjectComments.addComment(projectId, 'Resumo da reunião: ' + resumo);
}
/**
 * Recebe notificações push do Google Calendar (webhook) para sincronização bidirecional.
 * Endpoint para ser chamado pelo Google Calendar quando eventos forem alterados.
 * Exemplo de uso: .../exec?action=calendarWebhook
 */
function doPost(e) {
  if (e.parameter.action === 'calendarWebhook') {
    // Parse notification (verifique headers e payload conforme documentação do Google Calendar API)
    var channelId = e.parameter.channelId || '';
    var resourceId = e.parameter.resourceId || '';
    var resourceState = e.parameter.resourceState || '';
    // TODO: Validar assinatura, autenticação e segurança
    // TODO: Buscar evento alterado via Calendar API e atualizar Google Sheet conforme necessário
    Logger.log('Webhook recebido: channelId=' + channelId + ', resourceId=' + resourceId + ', state=' + resourceState);
    // Exemplo: atualizar campo Prazo na Sheet se evento for modificado
    // updateTaskDeadlineFromCalendar(resourceId);
    return ContentService.createTextOutput('OK');
  }
}

// Função exemplo para atualizar prazo da tarefa a partir do evento do Calendar
function updateTaskDeadlineFromCalendar(resourceId) {
  // TODO: Buscar evento pelo resourceId, identificar tarefa vinculada e atualizar Sheet
  // Exemplo: var event = Calendar.Events.get(calendarId, eventId);
  // TaskManagement.updateTaskDeadline(taskId, event.start.dateTime);
}
/**
 * Endpoint doGet para gerar feed .ics dinâmico por usuário.
 * Exemplo de uso: .../exec?token=xyz&action=ical
 */
function doGet(e) {
  if (e.parameter.action === 'ical' && validarToken(e.parameter.token)) {
    var userId = getUserIdByToken(e.parameter.token);
    var icalData = gerarStringICAL(userId);
    return ContentService.createTextOutput(icalData)
      .setMimeType(ContentService.MimeType.ICAL);
  }
}

/**
 * Valida o token de acesso ao feed .ics.
 * @param {string} token
 * @returns {boolean}
 */
function validarToken(token) {
  // Implemente sua lógica de validação de token seguro
  return !!token;
}

/**
 * Obtém o userId a partir do token (exemplo simplificado).
 * @param {string} token
 * @returns {string}
 */
function getUserIdByToken(token) {
  // Implemente a lógica real de mapeamento token -> userId
  return token;
}

/**
 * Gera string .ics com os eventos do usuário.
 * @param {string} userId
 * @returns {string}
 */
function gerarStringICAL(userId) {
  // Exemplo: buscar tarefas do usuário e gerar eventos .ics
  var tasks = TaskManagement.getTasksByUserId(userId) || [];
  var ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CrawDebate//GAS//PT-BR'
  ];
  tasks.forEach(function(task) {
    if (!task.Prazo) return;
    ical.push('BEGIN:VEVENT');
    ical.push('SUMMARY:' + task.Descricao);
    ical.push('DTSTART:' + formatDateToICS(task.Prazo));
    ical.push('DTEND:' + formatDateToICS(task.Prazo));
    ical.push('DESCRIPTION:' + (task.Detalhes || ''));
    ical.push('END:VEVENT');
  });
  ical.push('END:VCALENDAR');
  return ical.join('\n');
}

/**
 * Formata data para o padrão ICS (UTC, basic).
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateToICS(date) {
  var d = new Date(date);
  return Utilities.formatDate(d, 'UTC', 'yyyyMMdd\'T\'HHmmss\'Z\'');
}

// GoogleCalendarIntegration.gs

/**
 * Sugere os 3 melhores horários em comum para reunião de kickoff, consultando a disponibilidade dos membros.
 * @param {string[]} memberEmails - Lista de e-mails dos membros.
 * @param {string} date - Data alvo (yyyy-mm-dd).
 * @param {number} durationMinutes - Duração da reunião em minutos.
 * @returns {Array} Lista dos 3 melhores horários sugeridos (ISO 8601).
 */
function suggestKickoffTimes(memberEmails, date, durationMinutes) {
  var timeMin = date + 'T08:00:00-03:00'; // início do expediente
  var timeMax = date + 'T18:00:00-03:00'; // fim do expediente
  var busyMap = GoogleCalendarService.getCalendarsFreeBusy(memberEmails, timeMin, timeMax);
  var slots = [];
  var slotStart = new Date(timeMin);
  var slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
  while (slotEnd <= new Date(timeMax)) {
    var conflict = false;
    for (var i = 0; i < memberEmails.length; i++) {
      var busyPeriods = (busyMap[memberEmails[i]] && busyMap[memberEmails[i]].busy) || [];
      for (var j = 0; j < busyPeriods.length; j++) {
        var busyStart = new Date(busyPeriods[j].start);
        var busyEnd = new Date(busyPeriods[j].end);
        if (slotStart < busyEnd && slotEnd > busyStart) {
          conflict = true;
          break;
        }
      }
      if (conflict) break;
    }
    if (!conflict) {
      slots.push(slotStart.toISOString());
      if (slots.length === 3) break;
    }
    slotStart = new Date(slotStart.getTime() + 30 * 60000); // incrementa 30min
    slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
  }
  return slots;
}
/**
 * @overview Módulo de integração de alto nível com o Google Calendar.
 *           Facilita a criação e gerenciamento de eventos de calendário para projetos e tarefas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - GoogleCalendarService.gs: Para operações de baixo nível com o Calendar API.
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - UserManagement.gs: Para obter dados de usuários (convidados).
 *   - Logger.gs: Para registrar eventos.
 *
 * @integrations
 *   - Google Calendar: Gerenciamento de eventos.
 *
 * @description
 *   Este módulo atua como uma camada de abstração para o `GoogleCalendarService.gs`,
 *   fornecendo funções de alto nível para criar eventos de calendário com base em
 *   entidades do sistema, como projetos e tarefas. Ele automatiza a criação de
 *   eventos para prazos de projetos, marcos importantes e tarefas com datas de vencimento,
 *   garantindo que os membros da equipe sejam notificados e possam gerenciar seu tempo
 *   de forma eficaz. Também permite adicionar participantes aos eventos.
 */

function createProjectEvent(projectId) {
  var project = ProjectManagement.getProjectById(projectId);
  if (!project || !project.DataFim) {
    throw new Error('Projeto não encontrado ou sem data de fim.');
  }

  var title = `Prazo Final do Projeto: ${project.NomeProjeto}`;
  var description = `O projeto "${project.NomeProjeto}" está com o prazo final se aproximando. Status atual: ${project.Status}.`;
  var guests = [];
  if (project.ResponsavelID) {
    var responsible = UserManagement.getUserById(project.ResponsavelID);
    if (responsible && responsible.Email) {
      guests.push(responsible.Email);
    }
  }

  return GoogleCalendarService.createCalendarEvent(title, project.DataFim, project.DataFim, description, guests);
}

function createTaskEvent(taskId) {
  var task = TaskManagement.getTaskById(taskId);
  if (!task || !task.Prazo) {
    throw new Error('Tarefa não encontrada ou sem prazo.');
  }

  var project = ProjectManagement.getProjectById(task.ProjetoID);
  var title = `Prazo da Tarefa: ${task.Descricao}`;
  var description = `A tarefa "${task.Descricao}" do projeto "${project ? project.NomeProjeto : 'N/A'}" está com o prazo se aproximando.`;
  var guests = [];
  if (task.ResponsavelID) {
    var responsible = UserManagement.getUserById(task.ResponsavelID);
    if (responsible && responsible.Email) {
      guests.push(responsible.Email);
    }
  }

  return GoogleCalendarService.createCalendarEvent(title, task.Prazo, task.Prazo, description, guests);
}

function updateProjectEvent(projectId, eventId) {
  var project = ProjectManagement.getProjectById(projectId);
  if (!project || !project.DataFim) {
    throw new Error('Projeto não encontrado ou sem data de fim.');
  }

  var title = `Prazo Final do Projeto: ${project.NomeProjeto}`;
  var description = `O projeto "${project.NomeProjeto}" está com o prazo final se aproximando. Status atual: ${project.Status}.`;
  var guests = [];
  if (project.ResponsavelID) {
    var responsible = UserManagement.getUserById(project.ResponsavelID);
    if (responsible && responsible.Email) {
      guests.push(responsible.Email);
    }
  }

  return GoogleCalendarService.updateCalendarEvent(eventId, title, project.DataFim, project.DataFim, description, guests);
}

function updateTaskEvent(taskId, eventId) {
  var task = TaskManagement.getTaskById(taskId);
  if (!task || !task.Prazo) {
    throw new Error('Tarefa não encontrada ou sem prazo.');
  }

  var project = ProjectManagement.getProjectById(task.ProjetoID);
  var title = `Prazo da Tarefa: ${task.Descricao}`;
  var description = `A tarefa "${task.Descricao}" do projeto "${project ? project.NomeProjeto : 'N/A'}" está com o prazo se aproximando.`;
  var guests = [];
  if (task.ResponsavelID) {
    var responsible = UserManagement.getUserById(task.ResponsavelID);
    if (responsible && responsible.Email) {
      guests.push(responsible.Email);
    }
  }

  return GoogleCalendarService.updateCalendarEvent(eventId, title, task.Prazo, task.Prazo, description, guests);
}
