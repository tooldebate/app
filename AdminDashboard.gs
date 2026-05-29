// AdminDashboard.gs
/**
 * @overview Módulo de backend para o dashboard do administrador no sistema de gestão agentica.
 *           Fornece funções para coletar e agregar dados para exibição no dashboard do administrador,
 *           incluindo estatísticas de usuários, projetos e tarefas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para verificar permissões de administrador.
 *   - UserManagement.gs: Para obter dados de usuários.
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - Evaluation.gs: Para obter dados de avaliações.
 *   - Logger.gs: Para registrar acessos ao dashboard.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para o dashboard.
 *
 * @description
 *   Este módulo é responsável por preparar os dados que serão exibidos no dashboard
 *   do administrador. Ele agrega informações de diferentes abas da Google Planilha,
 *   como o número total de usuários, projetos ativos, tarefas pendentes e métricas
 *   de avaliação da equipe. As funções aqui garantem que apenas administradores
 *   possam acessar esses dados e que as informações sejam apresentadas de forma
 *   concisa e útil para a tomada de decisões.
 */

function getAdminDashboardData() {
  if (!isAdmin()) {
    throw new Error("Acesso negado. Apenas administradores podem acessar o dashboard.");
  }
  Logger.log(`Acesso ao dashboard do administrador por ${SessionManagement.getSession().email}`);

  var allUsers = UserManagement.getAllUsers();
  var allProjects = ProjectManagement.getAllProjects();
  var allTasks = TaskManagement.getTasksByProjectId(""); // Retorna todas as tarefas independentemente do projeto
  var allEvaluations = Evaluation.getEvaluationsByProjectId(""); // Retorna todas as avaliações

  var activeUsers = allUsers.filter(function(user) { return user.Ativo === true; }).length;
  var totalProjects = allProjects.length;
  var activeProjects = allProjects.filter(function(project) { return project.Status === "Ativo"; }).length;
  var pendingTasks = allTasks.filter(function(task) { return task.Status === "Pendente"; }).length;
  var completedTasks = allTasks.filter(function(task) { return task.Status === "Concluída"; }).length;

  // Exemplo de cálculo de métricas de avaliação
  var totalAdherenceScore = 0;
  var totalUnderstandingScore = 0;
  allEvaluations.forEach(function(eval) {
    totalAdherenceScore += eval.Pontuacao || 0;
    // Assumindo que GeminiFeedback pode ser usado para uma métrica de compreensão
    if (eval.GeminiFeedback && eval.GeminiFeedback.includes("compreensão excelente")) {
      totalUnderstandingScore += 1;
    }
  });
  var averageAdherence = allEvaluations.length > 0 ? (totalAdherenceScore / allEvaluations.length) : 0;
  var averageUnderstanding = allEvaluations.length > 0 ? (totalUnderstandingScore / allEvaluations.length) * 100 : 0;

  return {
    totalUsers: allUsers.length,
    activeUsers: activeUsers,
    totalProjects: totalProjects,
    activeProjects: activeProjects,
    pendingTasks: pendingTasks,
    completedTasks: completedTasks,
    averageAdherence: averageAdherence.toFixed(2),
    averageUnderstanding: averageUnderstanding.toFixed(2)
  };
}
