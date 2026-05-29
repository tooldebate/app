// ProjectDetails.gs
/**
 * @overview Módulo de backend para a página de detalhes de um projeto específico.
 *           Fornece funções para recuperar todas as informações relacionadas a um projeto,
 *           incluindo suas tarefas e avaliações associadas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter os detalhes do projeto.
 *   - TaskManagement.gs: Para obter as tarefas do projeto.
 *   - Evaluation.gs: Para obter as avaliações do projeto.
 *   - Auth.gs: Para verificar permissões de acesso.
 *   - Logger.gs: Para registrar acessos aos detalhes do projeto.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para projetos, tarefas e avaliações.
 *
 * @description
 *   Este módulo agrega todas as informações pertinentes a um projeto específico,
 *   permitindo que a interface de usuário exiba uma visão completa do status do projeto,
 *   suas tarefas, e o feedback de avaliação da equipe. Ele garante que apenas usuários
 *   com as permissões adequadas possam acessar esses detalhes, e pode incluir
 *   funcionalidades para resumir o projeto ou sugerir próximas etapas usando a API Gemini.
 */

function getProjectDetails(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  // Verifica se o usuário tem permissão para ver este projeto
  // ProjectManagement.getProjectById já faz uma verificação básica, mas podemos adicionar mais aqui
  if (!isAdmin() && project.ResponsavelID != session.id) {
    throw new Error("Acesso negado. Você não tem permissão para visualizar os detalhes deste projeto.");
  }

  Logger.log(`Acessando detalhes do Projeto ID ${projectId} por ${session.email}`);

  var tasks = TaskManagement.getTasksByProjectId(projectId);
  var evaluations = Evaluation.getEvaluationsByProjectId(projectId);
  var adherence = Evaluation.calculateTeamAdherence(projectId);
  var understanding = Evaluation.calculateTeamUnderstanding(projectId);

  return {
    project: project,
    tasks: tasks,
    evaluations: evaluations,
    adherence: adherence,
    understanding: understanding
  };
}

function getProjectSummaryWithGemini(projectId) {
  var projectDetails = getProjectDetails(projectId);
  var projectDescription = projectDetails.project.Descricao;
  var summary = GeminiIntegration.summarizeProjectDescription(projectDescription);
  return summary;
}

function getSuggestedTasksForProjectWithGemini(projectId) {
  var projectDetails = getProjectDetails(projectId);
  var projectDescription = projectDetails.project.Descricao;
  var suggestedTasks = GeminiIntegration.suggestTasksForProject(projectDescription);
  return suggestedTasks;
}
