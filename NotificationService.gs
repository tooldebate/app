/**
 * Envia uma notificação baseada em um template salvo.
 * @param {string} templateId - ID do template de notificação salvo.
 * @param {Object} params - Parâmetros para preencher o template (ex: {nome, tarefa, prazo, ...}).
 * @returns {Object} Resultado do envio.
 */
function sendNotificationFromTemplate(templateId, params) {
  var template = NotificationTemplates.getTemplateById(templateId);
  if (!template) {
    log('Notificação Falhou', `Template de notificação não encontrado: ID ${templateId}`);
    return { success: false, message: 'Template de notificação não encontrado.' };
  }
  // Substitui variáveis do template no assunto e corpo
  var subject = fillTemplate(template.Assunto, params);
  var body = fillTemplate(template.Corpo, params);
  var recipientEmail = params.email || params.Email || params.destinatario;
  if (!recipientEmail) {
    log('Notificação Falhou', 'E-mail do destinatário não informado nos parâmetros.');
    return { success: false, message: 'E-mail do destinatário não informado.' };
  }
  return sendEmailNotification(recipientEmail, subject, body);
}

/**
 * Substitui variáveis do template no texto.
 * Exemplo: fillTemplate('Olá {{nome}}', {nome: 'João'}) => 'Olá João'
 * @param {string} templateText
 * @param {Object} params
 * @returns {string}
 */
function fillTemplate(templateText, params) {
  return templateText.replace(/{{\s*(\w+)\s*}}/g, function(match, p1) {
    return params[p1] !== undefined ? params[p1] : match;
  });
}
// NotificationService.gs
/**
 * @overview Módulo de serviço de notificações para o sistema de gestão agentica.
 *           Contém funções para enviar notificações por e-mail ou outros meios (futuro).
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para obter informações do usuário logado.
 *   - Logger.gs: Para registrar o envio de notificações.
 *   - UserManagement.gs: Para obter detalhes do usuário para envio de e-mail.
 *
 * @integrations
 *   - Google MailApp: Envio de e-mails.
 *
 * @description
 *   Este módulo é responsável por gerenciar e enviar notificações aos usuários do sistema.
 *   Ele pode ser utilizado para alertar sobre prazos de tarefas, atualizações de projetos,
 *   novas avaliações ou qualquer outro evento importante. Inicialmente, o foco será no
 *   envio de notificações por e-mail, mas a arquitetura permite a expansão para outros
 *   canais de comunicação no futuro.
 */

function sendEmailNotification(recipientEmail, subject, body) {
  try {
    MailApp.sendEmail(recipientEmail, subject, body);
    log('Notificação Enviada', `E-mail enviado para ${recipientEmail} | Assunto: ${subject}`);
    return { success: true, message: "E-mail enviado com sucesso." };
  } catch (e) {
    log('Erro de Notificação', `Erro ao enviar e-mail para ${recipientEmail}: ${e.message}`);
    throw new Error(`Erro ao enviar e-mail: ${e.message}`);
  }
}

function sendTaskReminder(taskId) {
  var task = TaskManagement.getTaskById(taskId);
  if (!task) {
    log('Lembrete Falhou', `Tentativa de enviar lembrete para tarefa inexistente: ID ${taskId}`);
    return { success: false, message: "Tarefa não encontrada." };
  }

  var responsibleUser = UserManagement.getUserById(task.ResponsavelID);
  if (!responsibleUser || !responsibleUser.Email) {
    log('Lembrete Falhou', `Não foi possível enviar lembrete para tarefa ${taskId}: Usuário responsável ou e-mail não encontrado.`);
    return { success: false, message: "Usuário responsável ou e-mail não encontrado." };
  }

  var subject = `Lembrete de Tarefa: ${task.Descricao}`;
  var body = `Olá ${responsibleUser.Nome},\n\nVocê tem uma tarefa pendente com o prazo se aproximando:\n\n` +
             `Tarefa: ${task.Descricao}\n` +
             `Projeto: ${ProjectManagement.getProjectById(task.ProjetoID).NomeProjeto}\n` +
             `Prazo: ${Utils.formatDate(task.Prazo)}\n\n` +
             `Por favor, verifique o sistema para mais detalhes.\n\nAtenciosamente,\nSua Equipe de Gestão Agentica`;

  return sendEmailNotification(responsibleUser.Email, subject, body);
}

function sendDailyReminders() {
  log('Lembrete Diário', 'Executando envio de lembretes diários.');
  var allTasks = TaskManagement.getTasksByProjectId(""); // Obter todas as tarefas
  var today = new Date();
  var tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  allTasks.forEach(function(task) {
    if (task.Status === "Pendente" && task.Prazo) {
      var taskDueDate = new Date(task.Prazo);
      // Enviar lembrete se a tarefa vence hoje ou amanhã
      if (taskDueDate.toDateString() === today.toDateString() || taskDueDate.toDateString() === tomorrow.toDateString()) {
        sendTaskReminder(task.ID);
      }
    }
  });
  log('Lembrete Diário', 'Envio de lembretes diários concluído.');
}
