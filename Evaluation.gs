// Evaluation.gs
/**
 * @overview Módulo de avaliação de equipe para o sistema de gestão agentica.
 *           Contém funções para registrar avaliações de projetos e tarefas,
 *           calcular métricas de aderência e compreensão, e integrar feedback da Gemini.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar permissões de usuário.
 *   - Logger.gs: Para registrar eventos de avaliação.
 *   - DataValidation.gs: Para validar dados de avaliação.
 *   - GeminiIntegration.gs: Para obter feedback agentico.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de avaliação.
 *   - Google Gemini API: Geração de feedback e insights.
 *
 * @description
 *   Este módulo permite que os usuários (geralmente administradores ou gerentes de projeto)
 *   registrem avaliações sobre a aderência e compreensão da equipe em relação a projetos
 *   e tarefas. Ele também pode acionar a API do Google Gemini para gerar feedback
 *   automatizado ou insights com base nos dados da avaliação, enriquecendo o processo
 *   de feedback e aprimoramento contínuo da equipe.
 */

function createEvaluation(evaluationData) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  // Apenas administradores ou gerentes de projeto podem criar avaliações
  // TODO: Adicionar verificação de gerente de projeto
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar avaliações.");
  }
  if (!DataValidation.validateEvaluation(evaluationData)) {
    throw new Error("Dados de avaliação inválidos.");
  }

  var evaluationsSheet = SpreadsheetService.getSheetByName("Avaliações");
  var headers = evaluationsSheet.getRange(1, 1, 1, evaluationsSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = evaluationsSheet.getLastRow();
  var newId = lastRow > 0 ? evaluationsSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  evaluationData.ID = newId;
  evaluationData.DataAvaliacao = new Date().toISOString(); // Data atual

  // Opcional: Gerar feedback da Gemini
  if (evaluationData.Comentarios) {
    try {
      var geminiFeedback = GeminiIntegration.generateEvaluationFeedback(evaluationData.Comentarios);
      evaluationData.GeminiFeedback = geminiFeedback.text;
    } catch (e) {
      Logger.log(`Erro ao gerar feedback da Gemini: ${e.message}`);
      evaluationData.GeminiFeedback = "Erro ao gerar feedback da Gemini.";
    }
  }

  headers.forEach(function(header) {
    newRow.push(evaluationData[header] || "");
  });
  evaluationsSheet.appendRow(newRow);
  Logger.log(`Avaliação criada: ID ${newId} para Projeto ID ${evaluationData.ProjetoID} por ${session.email}`);
  return { success: true, message: "Avaliação criada com sucesso.", id: newId };
}

function getEvaluationById(id) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var evaluationsSheet = SpreadsheetService.getSheetByName("Avaliações");
  var data = evaluationsSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var evaluation = {};
      headers.forEach(function(header, index) {
        evaluation[header] = data[i][index];
      });
      // Apenas administradores ou o usuário avaliado/responsável pelo projeto podem ver
      // TODO: Adicionar verificação de permissão mais granular
      if (isAdmin() || evaluation.UsuarioID == session.id) {
        return evaluation;
      } else {
        throw new Error("Acesso negado. Você não tem permissão para visualizar esta avaliação.");
      }
    }
  }
  return null;
}

function getEvaluationsByProjectId(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var evaluationsSheet = SpreadsheetService.getSheetByName("Avaliações");
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
      // Administradores veem todas, funcionários veem apenas as suas ou as do seu projeto
      // TODO: Adicionar verificação de permissão mais granular
      if (isAdmin() || evaluation.UsuarioID == session.id) {
        evaluations.push(evaluation);
      }
    }
  }
  return evaluations;
}

function calculateTeamAdherence(projectId) {
  // Implementação da lógica para calcular a aderência da equipe a um projeto
  // Pode envolver a análise de pontuações de avaliação, status de tarefas, etc.
  Logger.log(`Calculando aderência da equipe para o Projeto ID: ${projectId}`);
  var evaluations = getEvaluationsByProjectId(projectId);
  if (evaluations.length === 0) {
    return { score: 0, message: "Nenhuma avaliação encontrada para este projeto." };
  }

  var totalScore = 0;
  evaluations.forEach(function(eval) {
    totalScore += eval.Pontuacao || 0;
  });
  var averageScore = totalScore / evaluations.length;

  return { score: averageScore, message: `Pontuação média de aderência: ${averageScore.toFixed(2)}` };
}

function calculateTeamUnderstanding(projectId) {
  // Implementação da lógica para calcular a compreensão da equipe a um projeto
  // Pode envolver a análise de feedback da Gemini, complexidade das tarefas, etc.
  Logger.log(`Calculando compreensão da equipe para o Projeto ID: ${projectId}`);
  var evaluations = getEvaluationsByProjectId(projectId);
  if (evaluations.length === 0) {
    return { score: 0, message: "Nenhuma avaliação encontrada para este projeto." };
  }

  var understandingScore = 0;
  evaluations.forEach(function(eval) {
    // Exemplo simplificado: atribuir pontuação com base na presença de feedback positivo da Gemini
    if (eval.GeminiFeedback && eval.GeminiFeedback.includes("compreensão excelente")) {
      understandingScore += 1;
    }
  });
  var averageUnderstanding = (understandingScore / evaluations.length) * 100; // Percentual

  return { score: averageUnderstanding, message: `Percentual de compreensão da equipe: ${averageUnderstanding.toFixed(2)}%` };
}
