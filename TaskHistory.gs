// TaskHistory.gs
/**
 * @overview Módulo para rastrear o histórico de alterações de tarefas.
 *           Registra modificações importantes em tarefas, como mudanças de status, responsável, etc.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha (aba 'TaskHistory').
 *   - SessionManagement.gs: Para obter informações do usuário logado.
 *   - Logger.gs: Para registrar operações de histórico.
 *
 * @integrations
 *   - Google Sheets: Armazenamento do histórico de tarefas.
 *
 * @description
 *   Este módulo é responsável por manter um registro detalhado de todas as alterações
 *   significativas feitas nas tarefas. Cada vez que uma tarefa é modificada (status,
 *   descrição, prazo, responsável), uma entrada é adicionada a uma aba dedicada na
 *   planilha (`TaskHistory`). Isso fornece uma trilha de auditoria completa e
 *   permite que os usuários visualizem a evolução de uma tarefa ao longo do tempo.
 */

function recordTaskChange(taskId, field, oldValue, newValue) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var userEmail = session ? session.email : 'N/A';
  var timestamp = new Date().toISOString();

  var historySheet = SpreadsheetService.getSheetByName('TaskHistory');
  if (!historySheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    historySheet = spreadsheet.insertSheet('TaskHistory');
    historySheet.appendRow(['ID', 'Timestamp', 'TarefaID', 'UsuarioID', 'UsuarioEmail', 'Campo', 'ValorAntigo', 'ValorNovo']);
    Logger.log('Aba \'TaskHistory\' criada com cabeçalhos.');
  }

  var newId = historySheet.getLastRow() > 0 ? historySheet.getRange(historySheet.getLastRow(), 1).getValue() + 1 : 1;
  historySheet.appendRow([newId, timestamp, taskId, userId, userEmail, field, oldValue, newValue]);
  Logger.log(`Histórico de tarefa registrado: Tarefa ID ${taskId}, Campo: ${field}, Antigo: ${oldValue}, Novo: ${newValue}`);
}

function getTaskHistory(taskId) {
  var historySheet = SpreadsheetService.getSheetByName('TaskHistory');
  if (!historySheet) {
    return [];
  }

  var data = historySheet.getDataRange().getValues();
  var headers = data[0];
  var taskIDCol = headers.indexOf('TarefaID');
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][taskIDCol] == taskId) {
      var entry = {};
      headers.forEach(function(header, index) {
        entry[header] = data[i][index];
      });
      history.push(entry);
    }
  }
  return history;
}
