// WebhookService.gs
/**
 * @overview Módulo para lidar com webhooks no sistema de gestão agentica.
 *           Permite o recebimento e processamento de requisições HTTP externas,
 *           atuando como um ponto de integração para outros serviços.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar requisições de webhook e seus payloads.
 *   - ErrorHandling.gs: Para tratamento de erros em requisições de webhook.
 *
 * @integrations
 *   - Serviços externos: Recebimento de dados via HTTP POST/GET.
 *
 * @description
 *   Este módulo é projetado para atuar como um receptor de webhooks, permitindo
 *   que o sistema se integre com serviços externos que enviam notificações ou
 *   dados via HTTP. Ele pode processar requisições GET e POST, extrair o payload
 *   e acionar funções específicas do sistema com base nos dados recebidos.
 *   Isso abre portas para automações e sincronizações com outras plataformas,
 *   como sistemas de CI/CD, ferramentas de comunicação ou outros CRMs.
 */

function doPost(e) {
  return ErrorHandling.tryCatch(function() {
    Logger.log(`Webhook POST recebido. Parâmetros: ${JSON.stringify(e.parameter)}, Conteúdo: ${e.postData.contents}`);
    var payload = JSON.parse(e.postData.contents);

    // Exemplo: Processar um webhook de atualização de status de tarefa
    if (payload.eventType === "taskUpdate") {
      TaskManagement.updateTask(payload.taskId, { Status: payload.newStatus });
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Webhook de atualização de tarefa processado." }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tipo de webhook não reconhecido." }))
        .setMimeType(ContentService.MimeType.JSON);
  }, "doPostWebhook");
}

function doGet(e) {
  return ErrorHandling.tryCatch(function() {
    Logger.log(`Webhook GET recebido. Parâmetros: ${JSON.stringify(e.parameter)}`);
    // Exemplo: Retornar status do sistema
    return ContentService.createTextOutput(JSON.stringify({ status: "online", timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }, "doGetWebhook");
}
