// ProjectEvaluation.gs
/**
 * @overview Módulo para gerenciar avaliações de projetos no sistema de gestão agentica.
 *           Permite registrar e recuperar avaliações de projetos como um todo.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha (aba 'ProjectEvaluations').
 *   - SessionManagement.gs: Para obter informações do usuário logado.
 *   - Logger.gs: Para registrar operações de avaliação.
 *   - GeminiIntegration.gs: Para gerar feedback automatizado.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de avaliações de projetos.
 *   - Google Gemini API: Geração de feedback.
 *
 * @description
 *   Este módulo é dedicado à avaliação do desempenho e da aderência da equipe a projetos
 *   específicos. Ele permite que administradores ou gerentes de projeto registrem avaliações
 *   globais para um projeto, incluindo pontuações de aderência e compreensão, e comentários.
 *   A integração com a API Gemini pode fornecer feedback automatizado ou sugestões para
 *   melhoria com base nos dados da avaliação. As avaliações são armazenadas em uma aba
 *   dedicada na Google Planilha (`ProjectEvaluations`).
 */

function addProjectEvaluation(projectId, adherenceScore, understandingScore, comments) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado. Não é possível adicionar avaliação.");
  }
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem adicionar avaliações de projeto.");
  }
  Logger.log(`Adicionando avaliação ao Projeto ID ${projectId} por ${session.email}`);

  var evaluationsSheet = SpreadsheetService.getSheetByName("ProjectEvaluations");
  if (!evaluationsSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    evaluationsSheet = spreadsheet.insertSheet("ProjectEvaluations");
    evaluationsSheet.appendRow(["ID", "ProjetoID", "UsuarioID", "UsuarioEmail", "DataAvaliacao", "PontuacaoAderencia", "PontuacaoCompreensao", "Comentarios", "GeminiFeedback"]);
    Logger.log("Aba \'ProjectEvaluations\' criada com cabeçalhos.");
  }

  var newId = evaluationsSheet.getLastRow() > 0 ? evaluationsSheet.getRange(evaluationsSheet.getLastRow(), 1).getValue() + 1 : 1;
  var timestamp = new Date().toISOString();

  // Gerar feedback da Gemini (opcional)
  var geminiFeedback = "";
  try {
    var prompt = `Com base na pontuação de aderência (${adherenceScore}/100), pontuação de compreensão (${understandingScore}/100) e comentários (${comments}) para um projeto, forneça um feedback construtivo e sugestões de melhoria.`;
    var geminiResponse = GeminiIntegration.generateText(prompt);
    geminiFeedback = geminiResponse.text;
  } catch (e) {
    Logger.log("WARN", `Não foi possível gerar feedback da Gemini para avaliação: ${e.message}`);
    geminiFeedback = "Não foi possível gerar feedback automatizado da Gemini.";
  }

  evaluationsSheet.appendRow([newId, projectId, session.id, session.email, timestamp, adherenceScore, understandingScore, comments, geminiFeedback]);

  return { success: true, message: "Avaliação de projeto adicionada com sucesso.", evaluationId: newId };
}

function getProjectEvaluations(projectId) {
  var evaluationsSheet = SpreadsheetService.getSheetByName("ProjectEvaluations");
  if (!evaluationsSheet) {
    return [];
  }

  var data = evaluationsSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var evaluations = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId) {
      var evaluation = {};
      headers.forEach(function(header, index) {
        evaluation[header] = data[i][index];
      });
      evaluations.push(evaluation);
    }
  }
  return evaluations;
}

function getAverageProjectAdherence(projectId) {
  var evaluations = getProjectEvaluations(projectId);
  if (evaluations.length === 0) {
    return 0;
  }
  var totalAdherence = evaluations.reduce(function(sum, eval) { return sum + (eval.PontuacaoAderencia || 0); }, 0);
  return totalAdherence / evaluations.length;
}

function getAverageProjectUnderstanding(projectId) {
  var evaluations = getProjectEvaluations(projectId);
  if (evaluations.length === 0) {
    return 0;
  }
  var totalUnderstanding = evaluations.reduce(function(sum, eval) { return sum + (eval.PontuacaoCompreensao || 0); }, 0);
  return totalUnderstanding / evaluations.length;
}
