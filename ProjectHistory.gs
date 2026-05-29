// ProjectHistory.gs
/**
 * @overview Módulo para rastrear o histórico de alterações de projetos.
 *           Registra modificações importantes em projetos, como mudanças de status, descrição, etc.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha (aba 'ProjectHistory').
 *   - SessionManagement.gs: Para obter informações do usuário logado.
 *   - Logger.gs: Para registrar operações de histórico.
 *
 * @integrations
 *   - Google Sheets: Armazenamento do histórico de projetos.
 *
 * @description
 *   Este módulo é responsável por manter um registro detalhado de todas as alterações
 *   significativas feitas nos projetos. Cada vez que um projeto é modificado (status,
 *   descrição, datas, responsável), uma entrada é adicionada a uma aba dedicada na
 *   planilha (`ProjectHistory`). Isso fornece uma trilha de auditoria completa e
 *   permite que os usuários visualizem a evolução de um projeto ao longo do tempo.
 */

function recordProjectChange(projectId, field, oldValue, newValue) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var userEmail = session ? session.email : 'N/A';
  var timestamp = new Date().toISOString();

  var historySheet = SpreadsheetService.getSheetByName('ProjectHistory');
  if (!historySheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    historySheet = spreadsheet.insertSheet('ProjectHistory');
    historySheet.appendRow(['ID', 'Timestamp', 'ProjetoID', 'UsuarioID', 'UsuarioEmail', 'Campo', 'ValorAntigo', 'ValorNovo']);
    Logger.log('Aba \'ProjectHistory\' criada com cabeçalhos.');
  }

  var newId = historySheet.getLastRow() > 0 ? historySheet.getRange(historySheet.getLastRow(), 1).getValue() + 1 : 1;
  historySheet.appendRow([newId, timestamp, projectId, userId, userEmail, field, oldValue, newValue]);
  Logger.log(`Histórico de projeto registrado: Projeto ID ${projectId}, Campo: ${field}, Antigo: ${oldValue}, Novo: ${newValue}`);
}

function getProjectHistory(projectId) {
  var historySheet = SpreadsheetService.getSheetByName('ProjectHistory');
  if (!historySheet) {
    return [];
  }

  var data = historySheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf('ProjetoID');
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId) {
      var entry = {};
      headers.forEach(function(header, index) {
        entry[header] = data[i][index];
      });
      history.push(entry);
    }
  }
  return history;
}
