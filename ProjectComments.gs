// ProjectComments.gs
/**
 * @overview Módulo para gerenciar comentários em projetos no sistema de gestão agentica.
 *           Permite adicionar, ler e listar comentários associados a projetos.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para obter informações do usuário logado.
 *   - Logger.gs: Para registrar operações de comentários.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de comentários de projetos.
 *
 * @description
 *   Este módulo facilita a comunicação e colaboração dentro dos projetos, permitindo
 *   que os membros da equipe adicionem comentários diretamente aos projetos. Isso
 *   cria um histórico de discussões e decisões, mantendo todas as informações
 *   relevantes centralizadas. Os comentários são armazenados em uma aba dedicada
 *   na Google Planilha (`ProjectComments`), com registro de quem fez o comentário
 *   e quando.
 */

function addProjectComment(projectId, commentText) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado. Não é possível adicionar comentários.");
  }
  Logger.log(`Adicionando comentário ao Projeto ID ${projectId} por ${session.email}`);

  var commentsSheet = SpreadsheetService.getSheetByName("ProjectComments");
  if (!commentsSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    commentsSheet = spreadsheet.insertSheet("ProjectComments");
    commentsSheet.appendRow(["ID", "ProjetoID", "UsuarioID", "UsuarioEmail", "DataComentario", "Comentario"]);
    Logger.log("Aba \'ProjectComments\' criada com cabeçalhos.");
  }

  var newId = commentsSheet.getLastRow() > 0 ? commentsSheet.getRange(commentsSheet.getLastRow(), 1).getValue() + 1 : 1;
  var timestamp = new Date().toISOString();
  commentsSheet.appendRow([newId, projectId, session.id, session.email, timestamp, commentText]);

  return { success: true, message: "Comentário adicionado com sucesso.", commentId: newId };
}

function getProjectComments(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var commentsSheet = SpreadsheetService.getSheetByName("ProjectComments");
  if (!commentsSheet) {
    return [];
  }

  var data = commentsSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var comments = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId) {
      var comment = {};
      headers.forEach(function(header, index) {
        comment[header] = data[i][index];
      });
      comments.push(comment);
    }
  }
  return comments;
}
