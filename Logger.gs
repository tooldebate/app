// Logger.gs
/**
 * @overview Módulo de registro de logs para o sistema de gestão agentica.
 *           Fornece uma interface simplificada para registrar eventos e mensagens
 *           em uma aba específica da Google Planilha (`Logs`).
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - SessionManagement.gs: Para obter informações do usuário logado.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de logs.
 *
 * @description
 *   Este módulo centraliza a funcionalidade de logging do sistema. Em vez de usar
 *   `Logger.log` nativo do Apps Script (que é mais para depuração), esta função
 *   registra eventos importantes (como logins, criações/atualizações de dados,
 *   erros) em uma aba dedicada na Google Planilha. Isso permite auditoria,
 *   monitoramento e depuração mais eficazes do sistema em produção.
 */

function log(action, details) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var timestamp = new Date().toISOString();
  var logEntry = [Utilities.getUuid(), timestamp, userId, action, details];

  try {
    var logsSheet = SpreadsheetService.getSheetByName('Logs');
    logsSheet.appendRow(logEntry);
  } catch (e) {
    // Fallback para o Logger.log padrão se a planilha de logs não estiver disponível
    Logger.log(`[ERROR] Falha ao registrar log na planilha: ${e.message}. Log original: [${timestamp}] [${userId}] ${action}: ${details}`);
  }
}

// Sobrescreve o Logger.log padrão para usar nossa função personalizada
// Isso pode ser útil para capturar logs de outras partes do script que usam Logger.log
// No entanto, para logs estruturados, é melhor chamar explicitamente `Logger.log` (deste módulo)
// var originalLoggerLog = Logger.log;
// Logger.log = function(message) {
//   originalLoggerLog(message);
//   log('DEBUG', message);
// };
