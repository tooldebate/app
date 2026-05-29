"""// NotificationManager.gs
/**
 * @overview Módulo centralizado para gerenciar configurações e templates de notificações.
 *           Permite definir e recuperar templates de e-mail, mensagens de chat, etc.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para armazenar templates de notificação.
 *   - Logger.gs: Para registrar operações de gerenciamento de notificações.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de templates de notificação.
 *
 * @description
 *   Este módulo fornece uma interface para gerenciar os templates de mensagens
 *   utilizados pelo sistema para enviar notificações. Em vez de ter o conteúdo
 *   das notificações hardcoded, este módulo permite que os templates sejam
 *   armazenados em uma aba da Google Planilha (`NotificationTemplates`), tornando-os
 *   facilmente configuráveis e atualizáveis sem a necessidade de modificar o código.
 *   Isso suporta a personalização e a flexibilidade das comunicações do sistema.
 */

function getNotificationTemplate(templateName) {
  var templatesSheet = SpreadsheetService.getSheetByName("NotificationTemplates");
  if (!templatesSheet) {
    throw new Error("Aba 'NotificationTemplates' não encontrada.");
  }

  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var nameCol = headers.indexOf("NomeTemplate");
  var subjectCol = headers.indexOf("Assunto");
  var bodyCol = headers.indexOf("Corpo");

  for (var i = 1; i < data.length; i++) {
    if (data[i][nameCol] === templateName) {
      return {
        subject: data[i][subjectCol],
        body: data[i][bodyCol]
      };
    }
  }
  return null;
}

function createNotificationTemplate(templateData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar templates de notificação.");
  }
  Logger.log(`Criando template de notificação: ${templateData.NomeTemplate} por ${SessionManagement.getSession().email}`);

  var templatesSheet = SpreadsheetService.getSheetByName("NotificationTemplates");
  if (!templatesSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    templatesSheet = spreadsheet.insertSheet("NotificationTemplates");
    templatesSheet.appendRow(["ID", "NomeTemplate", "Assunto", "Corpo"]);
    Logger.log("Aba 'NotificationTemplates' criada com cabeçalhos.");
  }

  var headers = templatesSheet.getRange(1, 1, 1, templatesSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = templatesSheet.getLastRow();
  var newId = lastRow > 0 ? templatesSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  templateData.ID = newId;

  headers.forEach(function(header) {
    newRow.push(templateData[header] || "");
  });
  templatesSheet.appendRow(newRow);
  return { success: true, message: "Template de notificação criado com sucesso.", templateId: newId };
}

function updateNotificationTemplate(templateId, updates) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem atualizar templates de notificação.");
  }
  Logger.log(`Atualizando template de notificação ID ${templateId} por ${SessionManagement.getSession().email}`);

  var templatesSheet = SpreadsheetService.getSheetByName("NotificationTemplates");
  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == templateId) {
      var row = data[i];
      headers.forEach(function(header, index) {
        if (updates.hasOwnProperty(header)) {
          row[index] = updates[header];
        }
      });
      templatesSheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, message: "Template de notificação atualizado com sucesso." };
    }
  }
  throw new Error("Template de notificação não encontrado.");
}

function deleteNotificationTemplate(templateId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem deletar templates de notificação.");
  }
  Logger.log(`Deletando template de notificação ID ${templateId} por ${SessionManagement.getSession().email}`);

  var templatesSheet = SpreadsheetService.getSheetByName("NotificationTemplates");
  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == templateId) {
      templatesSheet.deleteRow(i + 1);
      return { success: true, message: "Template de notificação deletado com sucesso." };
    }
  }
  throw new Error("Template de notificação não encontrado.");
}
"""
