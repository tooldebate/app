// GeminiChatService.gs
/**
 * @overview Módulo para interações de chat com a API do Google Gemini.
 *           Permite manter um histórico de conversação e gerar respostas contextuais.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - GeminiIntegration.gs: Para chamar a API Gemini.
 *   - SessionManagement.gs: Para associar o histórico de chat ao usuário.
 *   - Logger.gs: Para registrar as interações do chat.
 *
 * @integrations
 *   - Google Gemini API: Geração de respostas em formato de chat.
 *
 * @description
 *   Este módulo permite que o sistema ofereça uma funcionalidade de chat interativo
 *   com a inteligência artificial do Google Gemini. Ele gerencia o histórico da
 *   conversação, enviando-o junto com as novas mensagens para a API Gemini, o que
 *   permite que a IA mantenha o contexto e forneça respostas mais relevantes.
 *   Pode ser usado para suporte ao usuário, brainstorming de projetos ou para
 *   obter insights rápidos sobre dados do sistema.
 */

var CHAT_HISTORY_PROPERTY = "geminiChatHistory";

function getChatHistory() {
  var session = SessionManagement.getSession();
  if (!session) {
    return [];
  }
  var historyJson = PropertiesService.getUserProperties().getProperty(CHAT_HISTORY_PROPERTY + session.id);
  return historyJson ? JSON.parse(historyJson) : [];
}

function saveChatHistory(history) {
  var session = SessionManagement.getSession();
  if (session) {
    PropertiesService.getUserProperties().setProperty(CHAT_HISTORY_PROPERTY + session.id, JSON.stringify(history));
  }
}

function clearChatHistory() {
  var session = SessionManagement.getSession();
  if (session) {
    PropertiesService.getUserProperties().deleteProperty(CHAT_HISTORY_PROPERTY + session.id);
  }
}

function sendChatMessageToGemini(userMessage) {
  var history = getChatHistory();
  history.push({ role: "user", parts: [{ text: userMessage }] });

  var contents = history.map(function(entry) {
    return { role: entry.role, parts: entry.parts };
  });

  var apiKey = Config.getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Chave da API Gemini não configurada.");
  }

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify({
      'contents': contents
    })
  };

  try {
    Logger.log(`Enviando mensagem para Gemini Chat: ${userMessage.substring(0, 50)}...`);
    var response = UrlFetchApp.fetch(url, options);
    var jsonResponse = JSON.parse(response.getContentText());
    Logger.log(`Resposta do Gemini Chat: ${JSON.stringify(jsonResponse).substring(0, 100)}...`);

    var geminiResponseText = GeminiResponseParser.parseGeminiTextResponse(jsonResponse);
    history.push({ role: "model", parts: [{ text: geminiResponseText }] });
    saveChatHistory(history);

    return { success: true, response: geminiResponseText };
  } catch (e) {
    Logger.log(`Erro ao interagir com Gemini Chat: ${e.message}`);
    throw new Error(`Erro ao interagir com Gemini Chat: ${e.message}`);
  }
}
