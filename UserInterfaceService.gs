// UserInterfaceService.gs
/**
 * @overview Módulo de serviço para interações com a interface do usuário no Google Apps Script.
 *           Fornece funções para exibir alertas, prompts e menus dinâmicos no frontend.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations
 *   - Google Apps Script SpreadsheetApp.getUi(): Para interações com a UI.
 *
 * @description
 *   Este módulo encapsula as funcionalidades de interação com a interface do usuário
 *   do Google Sheets, permitindo que o script exiba mensagens, colete entradas
 *   do usuário e crie menus personalizados. Ele serve como uma ponte entre a
 *   lógica de backend e a experiência do usuário, garantindo que as interações
 *   sejam consistentes e informativas.
 */

function showAlert(title, message, buttonSet) {
  var ui = SpreadsheetApp.getUi();
  return ui.alert(title, message, buttonSet || ui.ButtonSet.OK);
}

function showPrompt(title, promptMessage, buttonSet) {
  var ui = SpreadsheetApp.getUi();
  return ui.prompt(title, promptMessage, buttonSet || ui.ButtonSet.OK_CANCEL);
}

function showToast(message, title, timeoutSeconds) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds);
}

function createCustomMenu(menuName, menuItems) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu(menuName);
  menuItems.forEach(function(item) {
    menu.addItem(item.name, item.functionName);
  });
  menu.addToUi();
}
