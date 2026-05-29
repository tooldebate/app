// HtmlOutputRenderer.gs
/**
 * @overview Módulo para renderizar saídas HTML dinâmicas no Google Apps Script.
 *           Fornece funções para carregar templates HTML e injetar dados do lado do servidor.
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
 *   Este módulo é uma extensão do HtmlService.gs, focando especificamente na renderização
 *   de conteúdo HTML. Ele permite que o backend injete variáveis e objetos JavaScript
 *   diretamente nos templates HTML, criando interfaces de usuário dinâmicas e personalizadas.
 *   É útil para construir páginas, modais e sidebars com dados atualizados do sistema.
 */

function renderHtmlTemplate(templateName, data) {
  var template = HtmlService.createTemplateFromFile(templateName);
  if (data) {
    for (var key in data) {
      template[key] = data[key];
    }
  }
  return template.evaluate().getContent();
}

function renderHtmlOutput(templateName, title, data) {
  var template = HtmlService.createTemplateFromFile(templateName);
  if (data) {
    for (var key in data) {
      template[key] = data[key];
    }
  }
  return template.evaluate().setTitle(title || "Sistema de Gestão Agentica");
}
