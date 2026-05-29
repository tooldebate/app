// Funções expostas para integração com front-end (google.script.run)
function NotificationTemplates_getAllTemplates() {
  return NotificationTemplates.getAllTemplates();
}

function NotificationTemplates_getTemplateById(id) {
  return NotificationTemplates.getTemplateById(id);
}

function NotificationTemplates_createTemplate(template) {
  return NotificationTemplates.createTemplate(template);
}
/**
 * @overview Módulo para gerenciar templates de notificação.
 *           Permite criar, buscar e listar templates reutilizáveis para notificações.
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 * @dependencies SpreadsheetService.gs
 * @integrations Google Sheets
 * @description
 *   Este módulo centraliza o armazenamento e recuperação de templates de notificação,
 *   promovendo padronização e reutilização de mensagens no sistema.
 */

var NotificationTemplates = (function() {
  var SHEET_NAME = 'NotificationTemplates';

  function getSheet() {
    return SpreadsheetService.getSheetByName(SHEET_NAME);
  }

  function getTemplateById(id) {
    var sheet = getSheet();
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = data[i][j];
        }
        return obj;
      }
    }
    return null;
  }

  function getAllTemplates() {
    var sheet = getSheet();
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      result.push(obj);
    }
    return result;
  }

  function createTemplate(template) {
    var sheet = getSheet();
    if (!sheet) return { success: false, message: 'Sheet não encontrada.' };
    var id = Utilities.getUuid();
    sheet.appendRow([
      id,
      template.NomeTemplate,
      template.Assunto,
      template.Corpo
    ]);
    return { success: true, id: id };
  }

  return {
    getTemplateById: getTemplateById,
    getAllTemplates: getAllTemplates,
    createTemplate: createTemplate
  };
})();
