// HtmlService.gs
/**
 * @overview Módulo para servir arquivos HTML e processar requisições de frontend no Google Apps Script.
 *           Facilita a renderização de templates HTML e a comunicação bidirecional entre o frontend e o backend.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations
 *   - Google Apps Script HtmlService: Serviço para criar e servir interfaces de usuário.
 *
 * @description
 *   Este módulo é essencial para a construção da interface web do sistema. Ele fornece
 *   funções para carregar e avaliar arquivos HTML como templates, permitindo a inclusão
 *   de dados dinâmicos do lado do servidor. Além disso, ele gerencia a comunicação
 *   entre o JavaScript do lado do cliente e as funções do Google Apps Script do lado do servidor,
 *   garantindo uma experiência de usuário interativa e responsiva.
 */

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function getHtmlTemplate(filename) {
  return HtmlService.createTemplateFromFile(filename);
}

function serveHtml(filename, title) {
  return HtmlService.createTemplateFromFile(filename)
      .evaluate()
      .setTitle(title || "Sistema de Gestão Agentica");
}

function processFormRequest(request) {
  // Exemplo de como processar uma requisição POST de um formulário HTML
  // O request.parameter conterá os dados do formulário
  Logger.log("Requisição de formulário recebida: " + JSON.stringify(request.parameter));
  // Aqui você chamaria as funções apropriadas do backend (ex: Auth.doLogin, ProjectManagement.createProject)
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Dados recebidos com sucesso!" }))
      .setMimeType(ContentService.MimeType.JSON);
}
