/**
 * @file       Triggers.gs
 * @project    Um conto por aluno — EC 115 Norte
 * @version    1.0.0
 * @date       2026-06-16
 *
 * @summary
 *   Configuração e gerenciamento de gatilhos time-driven do Google Apps Script.
 *   Automatiza limpeza de sessões expiradas, backup da planilha no Drive e
 *   envio do relatório semanal de contos gerados para o administrador.
 *
 * @integrations
 *   Config.gs                   : TITULO_APP, propriedades de ambiente
 *   InputOutputFolderService.gs : Backup da planilha no Drive
 *   LoggerService.gs            : Logging estruturado
 *   Auth.gs                     : Limpeza de tokens expirados
 *
 * @triggers
 *   cleanExpiredSessions()  → Diário às 02:00 (limpeza de tokens de auth)
 *   backupSpreadsheet()     → Semanal (domingo às 04:00)
 *   sendWeeklyReport()      → Semanal (segunda às 07:00)
 *
 * @gasPermissions
 *   spreadsheets, drive, gmail, script.scriptapp
 */

/**
 * Instala todos os gatilhos do sistema.
 * Deve ser executada manualmente uma única vez pelo administrador.
 * É idempotente: remove gatilhos existentes antes de criar novos.
 */
function setupTriggers() {
  try {
    var existing = ScriptApp.getProjectTriggers();
    existing.forEach(function(t) { ScriptApp.deleteTrigger(t); });

    // Limpeza de sessões expiradas — diário às 02:00
    ScriptApp.newTrigger('cleanExpiredSessions')
      .timeBased().everyDays(1).atHour(2).create();

    // Backup da planilha — domingo às 04:00
    ScriptApp.newTrigger('backupSpreadsheet')
      .timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(4).create();

    // Relatório semanal — segunda às 07:00
    ScriptApp.newTrigger('sendWeeklyReport')
      .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();

    LoggerService.info('Triggers.setupTriggers', 'Gatilhos instalados: cleanExpiredSessions, backupSpreadsheet, sendWeeklyReport.');
  } catch (error) {
    Logger.log("Erro em setupTriggers: " + error.message);
    throw error;
  }
}

/**
 * Remove todos os tokens de sessão de autenticação expirados.
 * Executado diariamente às 02:00.
 */
function cleanExpiredSessions() {
  try {
    if (typeof Auth !== 'undefined' && typeof Auth.cleanExpiredTokens === 'function') {
      Auth.cleanExpiredTokens();
    }
    LoggerService.info('Triggers.cleanExpiredSessions', 'Sessões expiradas removidas.');
  } catch (err) {
    LoggerService.error('Triggers.cleanExpiredSessions', err);
  }
}

/**
 * Cria cópia de backup da planilha principal no Google Drive.
 * Usa InputOutputFolderService quando disponível; fallback para DriveApp direto.
 * Executado semanalmente aos domingos às 04:00.
 */
function backupSpreadsheet() {
  try {
    try {
      var props = PropertiesService.getScriptProperties().getProperties();
      var spreadsheetId = props['PLANILHA_DAS_DIRETRIZES'] || props['SPREADSHEETS_ID'] || '';
      var backupFolderId = props['BACKUP_FOLDER_ID'] || '';

      if (!spreadsheetId) {
        LoggerService.warn('Triggers.backupSpreadsheet', 'PLANILHA_DAS_DIRETRIZES não configurada — backup ignorado.');
        return;
      }

      var ss   = SpreadsheetApp.openById(spreadsheetId);
      var name = 'ToolDebate_Backup_' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd');
      var copy = ss.copy(name);

      if (backupFolderId) {
        var folder = DriveApp.getFolderById(backupFolderId);
        var file   = DriveApp.getFileById(copy.getId());
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      }

      LoggerService.info('Triggers.backupSpreadsheet', 'Backup criado: ' + name);
    } catch (err) {
      LoggerService.error('Triggers.backupSpreadsheet', err);
    }
  } catch (error) {
    Logger.log("Erro em backupSpreadsheet: " + error.message);
    throw error;
  }
}

/**
 * Envia e-mail semanal com o resumo de contos gerados e métricas de uso.
 * Executado semanalmente às segundas às 07:00.
 */
function sendWeeklyReport() {
  try {
    try {
      var props    = PropertiesService.getScriptProperties().getProperties();
      var adminEmail = props['ADMIN_EMAIL'] || '';
      if (!adminEmail) {
        LoggerService.warn('Triggers.sendWeeklyReport', 'ADMIN_EMAIL não configurado — e-mail ignorado.');
        return;
      }

      var today = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
      var body  = 'Relatório semanal do webapp "Um conto por aluno" — EC 115 Norte.\n' +
                  'Data: ' + today + '\n\n' +
                  'Acesse a planilha para ver o detalhamento de contos gerados, diretrizes alocadas e respostas coletadas.';

      MailApp.sendEmail({
        to      : adminEmail,
        subject : 'Um conto por aluno — Relatório Semanal ' + today,
        body    : body
      });
      LoggerService.info('Triggers.sendWeeklyReport', 'E-mail semanal enviado para ' + adminEmail);
    } catch (err) {
      LoggerService.error('Triggers.sendWeeklyReport', err);
    }
  } catch (error) {
    Logger.log("Erro em sendWeeklyReport: " + error.message);
    throw error;
  }
}

/**
 * Remove todos os gatilhos instalados.
 * Usar em caso de necessidade de reset completo.
 */
function removeTriggers() {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
    LoggerService.info('Triggers.removeTriggers', 'Todos os gatilhos removidos.');
  } catch (error) {
    Logger.log("Erro em removeTriggers: " + error.message);
    throw error;
  }
}
