// GoogleChatService.gs
/**
 * @overview Módulo de integração com o Google Chat para notificações e interações.
 *           Permite enviar mensagens para espaços do Google Chat e processar eventos de interação.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o URL do webhook do Google Chat.
 *   - Logger.gs: Para registrar operações do Chat.
 *
 * @integrations
 *   - Google Chat API (Webhooks): Envio de mensagens.
 *
 * @description
 *   Este módulo permite que o sistema envie notificações e alertas para espaços
 *   do Google Chat, mantendo as equipes informadas sobre eventos importantes
 *   do projeto, atualizações de tarefas ou alertas de avaliação. Ele utiliza
 *   webhooks do Google Chat para enviar mensagens formatadas, o que pode
 *   incluir cartões interativos para ações rápidas. Isso melhora a comunicação
 *   e a colaboração em tempo real dentro das equipes.
 */

function getGoogleChatWebhookUrl() {
  // O URL do webhook do Google Chat deve ser configurado em Config.gs
  return Config.getProperty("GOOGLE_CHAT_WEBHOOK_URL");
}

function sendChatMessage(message, spaceWebhookUrl) {
  var webhookUrl = spaceWebhookUrl || getGoogleChatWebhookUrl();
  if (!webhookUrl) {
    Logger.log("ERROR", "URL do webhook do Google Chat não configurado.");
    throw new Error("URL do webhook do Google Chat não configurado.");
  }

  var options = {
    "method": "post", 
    "contentType": "application/json",
    "payload": JSON.stringify({ "text": message })
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
    Logger.log(`Mensagem enviada para o Google Chat: ${message.substring(0, 50)}...`);
    return { success: true, message: "Mensagem enviada para o Google Chat." };
  } catch (e) {
    Logger.log("ERROR", `Erro ao enviar mensagem para o Google Chat: ${e.message}`);
    throw new Error(`Erro ao enviar mensagem para o Google Chat: ${e.message}`);
  }
}

function sendCardMessage(cardJson, spaceWebhookUrl) {
  var webhookUrl = spaceWebhookUrl || getGoogleChatWebhookUrl();
  if (!webhookUrl) {
    Logger.log("ERROR", "URL do webhook do Google Chat não configurado.");
    throw new Error("URL do webhook do Google Chat não configurado.");
  }

  var options = {
    "method": "post", 
    "contentType": "application/json",
    "payload": JSON.stringify({ "cards": [cardJson] })
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
    Logger.log(`Cartão enviado para o Google Chat: ${JSON.stringify(cardJson).substring(0, 50)}...`);
    return { success: true, message: "Cartão enviado para o Google Chat." };
  } catch (e) {
    Logger.log("ERROR", `Erro ao enviar cartão para o Google Chat: ${e.message}`);
    throw new Error(`Erro ao enviar cartão para o Google Chat: ${e.message}`);
  }
}

function processChatEvent(e) {
  // Função para processar eventos de interação do Google Chat (ex: cliques em botões de cartão)
  Logger.log(`Evento do Google Chat recebido: ${JSON.stringify(e)}`);
  // Implementar lógica para responder a eventos específicos
  return ContentService.createTextOutput(JSON.stringify({ "text": "Evento recebido com sucesso!" }))
      .setMimeType(ContentService.MimeType.JSON);
}
