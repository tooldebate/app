// NotificationSettings.gs
/**
 * @overview Módulo para gerenciar as configurações de notificação por usuário e por tipo.
 *           Permite que os usuários personalizem quais notificações desejam receber e por qual canal.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para armazenar as configurações de notificação.
 *   - SessionManagement.gs: Para identificar o usuário logado.
 *   - Logger.gs: Para registrar alterações nas configurações.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de configurações de notificação.
 *
 * @description
 *   Este módulo oferece uma interface para que os usuários configurem suas preferências
 *   de notificação. Eles podem escolher receber alertas por e-mail, Google Chat ou
 *   outros canais, e definir a frequência ou os tipos de eventos que disparam as notificações.
 *   As configurações são armazenadas em uma aba dedicada na Google Planilha (`NotificationSettings`),
 *   garantindo que cada usuário tenha controle sobre suas comunicações.
 */

function getUserNotificationSettings() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  var settingsSheet = SpreadsheetService.getSheetByName('NotificationSettings');
  if (!settingsSheet) {
    return { emailEnabled: true, chatEnabled: false, dailySummary: true }; // Padrões
  }

  var data = settingsSheet.getDataRange().getValues();
  var headers = data[0];
  var userIdCol = headers.indexOf('UsuarioID');

  for (var i = 1; i < data.length; i++) {
    if (data[i][userIdCol] == session.id) {
      var settings = {};
      headers.forEach(function(header, index) {
        settings[header] = data[i][index];
      });
      return settings;
    }
  }
  return { emailEnabled: true, chatEnabled: false, dailySummary: true }; // Padrões se não houver configurações salvas
}

function saveUserNotificationSettings(newSettings) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  Logger.log(`Salvando configurações de notificação para ${session.email}: ${JSON.stringify(newSettings)}`);

  var settingsSheet = SpreadsheetService.getSheetByName('NotificationSettings');
  if (!settingsSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    settingsSheet = spreadsheet.insertSheet('NotificationSettings');
    settingsSheet.appendRow(['ID', 'UsuarioID', 'EmailEnabled', 'ChatEnabled', 'DailySummary']);
    Logger.log('Aba \'NotificationSettings\' criada com cabeçalhos.');
  }

  var data = settingsSheet.getDataRange().getValues();
  var headers = data[0];
  var userIdCol = headers.indexOf('UsuarioID');
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][userIdCol] == session.id) {
      rowIndex = i + 1;
      break;
    }
  }

  var newRow = [];
  var newId = rowIndex === -1 ? (settingsSheet.getLastRow() > 0 ? settingsSheet.getRange(settingsSheet.getLastRow(), 1).getValue() + 1 : 1) : data[rowIndex - 1][0];
  newSettings.ID = newId;
  newSettings.UsuarioID = session.id;

  headers.forEach(function(header) {
    newRow.push(newSettings[header] || '');
  });

  if (rowIndex !== -1) {
    settingsSheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  } else {
    settingsSheet.appendRow(newRow);
  }

  return { success: true, message: 'Configurações de notificação salvas com sucesso.' };
}
