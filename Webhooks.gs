// Webhooks.gs
/**
 * @overview Módulo para gerenciar webhooks e processar requisições HTTP externas.
 *           Permite que o sistema receba e responda a eventos de outros serviços.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar requisições e respostas de webhook.
 *   - ErrorHandling.gs: Para tratamento de erros em requisições HTTP.
 *
 * @integrations
 *   - Google Apps Script Web Apps: Para expor endpoints HTTP.
 *   - Serviços externos: GitHub, Trello, etc., que enviam webhooks.
 *
 * @description
 *   Este módulo é fundamental para a integração do sistema com serviços externos
 *   que utilizam webhooks para notificar sobre eventos. Ele fornece a infraestrutura
 *   para receber requisições HTTP POST (ou outros métodos), parsear o payload
 *   e disparar a lógica de negócios apropriada. Exemplos de uso incluem receber
 *   notificações de conclusão de tarefas de um sistema de gerenciamento de projetos
 *   externo, ou atualizações de código de um repositório Git. A função `doPost`
 *   é o ponto de entrada para todas as requisições HTTP POST para o Web App.
 */

function doPost(e) {
  try {
    Logger.log(`Webhook POST recebido: ${JSON.stringify(e)}`);

    var payload = JSON.parse(e.postData.contents);
    var eventType = e.parameter.eventType || payload.event || 'unknown';

    switch (eventType) {
      case 'task_completed':
        // Exemplo: processar uma notificação de tarefa concluída de um serviço externo
        return handleTaskCompletedWebhook(payload);
      case 'project_updated':
        // Exemplo: processar uma atualização de projeto
        return handleProjectUpdatedWebhook(payload);
      default:
        Logger.log(`Webhook de tipo desconhecido: ${eventType}`);
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown event type' }))
            .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log(`Erro no processamento do webhook: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  Logger.log(`Webhook GET recebido: ${JSON.stringify(e)}`);
  return ContentService.createTextOutput('Webhook GET request received.');
}

function handleTaskCompletedWebhook(payload) {
  Logger.log(`Processando evento de tarefa concluída: ${JSON.stringify(payload)}`);
  // Exemplo: Atualizar o status de uma tarefa no sistema
  // TaskManagement.updateTask(payload.taskId, { Status: 'Concluída' });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Task completed event processed' }))
      .setMimeType(ContentService.MimeType.JSON);
}

function handleProjectUpdatedWebhook(payload) {
  Logger.log(`Processando evento de projeto atualizado: ${JSON.stringify(payload)}`);
  // Exemplo: Atualizar informações de um projeto
  // ProjectManagement.updateProject(payload.projectId, { Status: payload.newStatus });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Project updated event processed' }))
      .setMimeType(ContentService.MimeType.JSON);
}
