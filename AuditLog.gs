/**
 * Exporta relatório de auditoria detalhado em PDF, incluindo histórico de alterações e ações críticas.
 * @param {string} entityId - ID da entidade (projeto, tarefa, usuário, etc.)
 * @param {string} entityType - Tipo da entidade
 * @returns {string} urlPdf - URL do PDF gerado
 */
function exportAuditReportPdf(entityId, entityType) {
  var logs = AuditLog.getLogsByEntity(entityId, entityType) || [];
  var doc = DocumentApp.create('Relatório de Auditoria - ' + entityType + ' ' + entityId);
  var body = doc.getBody();
  body.appendParagraph('Relatório de Auditoria').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Entidade: ' + entityType + ' | ID: ' + entityId);
  body.appendParagraph('Data de geração: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
  body.appendHorizontalRule();
  logs.forEach(function(log) {
    body.appendParagraph('Ação: ' + log.action + ' | Usuário: ' + log.user + ' | Data: ' + log.timestamp);
    body.appendParagraph('Detalhes: ' + (log.details || '-'));
    body.appendHorizontalRule();
  });
  doc.saveAndClose();
  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  var pdfFile = DriveApp.createFile(pdf);
  pdfFile.setName('Auditoria_' + entityType + '_' + entityId + '.pdf');
  return pdfFile.getUrl();
}
// AuditLog.gs
/**
 * @overview Módulo de log de auditoria para o sistema de gestão agentica.
 *           Registra todas as operações CRUD e outras ações importantes na aba 'Logs' da Google Planilha.
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
 *   - Google Sheets: Armazenamento de logs de auditoria.
 *
 * @description
 *   Este módulo é uma extensão do Logger.gs, focado especificamente em auditoria.
 *   Ele registra detalhes sobre quem fez o quê, quando e em qual recurso.
 *   Isso é crucial para conformidade, segurança e rastreabilidade de todas as
 *   modificações de dados e ações administrativas dentro do sistema.
 */

function auditLog(actionType, resourceType, resourceId, details) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var userEmail = session ? session.email : 'N/A';
  var timestamp = new Date().toISOString();

  var logEntry = [
    Utilities.getUuid(),
    timestamp,
    userId,
    userEmail,
    actionType,
    resourceType,
    resourceId,
    details
  ];

  try {
    var logsSheet = SpreadsheetService.getSheetByName('Logs');
    // Garante que os cabeçalhos da aba Logs suportam os campos de auditoria
    var headers = logsSheet.getRange(1, 1, 1, logsSheet.getLastColumn()).getValues()[0];
    var expectedHeaders = ["ID", "Timestamp", "UsuarioID", "UsuarioEmail", "Acao", "TipoRecurso", "IDRecurso", "Detalhes"];
    if (headers.join(',') !== expectedHeaders.join(',')) {
      // Se os cabeçalhos não correspondem, pode ser necessário atualizar a estrutura da planilha
      // Para este exemplo, vamos apenas logar um aviso.
      Logger.log("WARN", "Cabeçalhos da aba 'Logs' não correspondem ao formato esperado para auditoria.");
    }
    logsSheet.appendRow(logEntry);
    Logger.log(`AUDIT: ${actionType} ${resourceType} ${resourceId} por ${userEmail}`);
  } catch (e) {
    Logger.log("ERROR", `Falha ao registrar log de auditoria na planilha: ${e.message}. Log original: ${JSON.stringify(logEntry)}`);
  }
}
