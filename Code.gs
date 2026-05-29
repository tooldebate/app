// Code.gs
/**
 * @overview Funções globais e de inicialização para o projeto Google Apps Script.
 *           Este arquivo contém as funções `onOpen` para criar menus personalizados
 *           e `doGet` para servir a interface web principal.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - HtmlService.gs: Para servir arquivos HTML.
 *
 * @integrations
 *   - Google Apps Script: Ambiente de execução.
 *
 * @description
 *   A função `onOpen` é executada automaticamente quando a Google Planilha é aberta,
 *   criando um menu personalizado para acesso rápido às funcionalidades do sistema.
 *   A função `doGet` é o ponto de entrada para requisições HTTP GET, servindo a
 *   página principal da aplicação web.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sistema Agentico')
      .addItem('Abrir Sistema', 'showSidebar')
      .addToUi();
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Sistema de Gestão Agentica');
}

function showSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle('Navegação');
  SpreadsheetApp.getUi().showSidebar(html);
}
