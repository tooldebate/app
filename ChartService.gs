// ChartService.gs
/**
 * @overview Módulo de serviço de gráficos para o sistema de gestão agentica.
 *           Fornece funções para preparar dados para visualização em gráficos,
 *           agregando informações de projetos, tarefas e avaliações.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - Evaluation.gs: Para obter dados de avaliações.
 *   - UserManagement.gs: Para obter dados de usuários.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados.
 *   - Frontend (Chart.js ou similar): Consumo dos dados para renderização.
 *
 * @description
 *   Este módulo é responsável por transformar os dados brutos da Google Planilha
 *   em formatos adequados para a criação de gráficos e visualizações no frontend.
 *   Ele pode agregar dados por status de projeto, progresso de tarefas, desempenho
 *   da equipe, etc., fornecendo os datasets necessários para bibliotecas de gráficos
 *   JavaScript como Chart.js. Isso permite a criação de dashboards interativos
 *   e informativos para administradores e funcionários.
 */

function getProjectStatusDistribution() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem ver a distribuição de status de projetos.");
  }
  var allProjects = ProjectManagement.getAllProjects();
  var statusCounts = {};
  allProjects.forEach(function(project) {
    statusCounts[project.Status] = (statusCounts[project.Status] || 0) + 1;
  });

  var labels = Object.keys(statusCounts);
  var data = Object.values(statusCounts);

  return { labels: labels, data: data, title: "Distribuição de Status de Projetos" };
}

function getTaskStatusDistributionByProject(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var tasks = TaskManagement.getTasksByProjectId(projectId);
  var statusCounts = {};
  tasks.forEach(function(task) {
    statusCounts[task.Status] = (statusCounts[task.Status] || 0) + 1;
  });

  var labels = Object.keys(statusCounts);
  var data = Object.values(statusCounts);

  return { labels: labels, data: data, title: `Distribuição de Status de Tarefas para o Projeto ID ${projectId}` };
}

function getTeamAdherenceScores() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem ver as pontuações de aderência da equipe.");
  }
  var allProjects = ProjectManagement.getAllProjects();
  var projectAdherence = [];

  allProjects.forEach(function(project) {
    var adherence = Evaluation.calculateTeamAdherence(project.ID);
    projectAdherence.push({ projectName: project.NomeProjeto, score: adherence.score });
  });

  var labels = projectAdherence.map(function(item) { return item.projectName; });
  var data = projectAdherence.map(function(item) { return item.score; });

  return { labels: labels, data: data, title: "Pontuação de Aderência da Equipe por Projeto" };
}
