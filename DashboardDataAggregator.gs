// DashboardDataAggregator.gs
/**
 * @overview Módulo para agregar dados de diversas fontes para dashboards.
 *           Consolida informações de usuários, projetos, tarefas e avaliações
 *           para apresentar uma visão geral no frontend.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - UserManagement.gs: Para obter dados de usuários.
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - Evaluation.gs: Para obter dados de avaliações.
 *   - DashboardUtils.gs: Para funções utilitárias de dashboard.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados.
 *
 * @description
 *   Este módulo é responsável por coletar e processar dados de diferentes
 *   módulos do sistema para criar conjuntos de dados prontos para serem
 *   consumidos pelos dashboards. Ele abstrai a complexidade de buscar
 *   informações de várias abas da planilha e as agrega em um formato
 *   coerente, facilitando a construção de visualizações ricas e informativas.
 */

function getAggregatedDashboardDataForAdmin() {
  var allUsers = UserManagement.getAllUsers();
  var allProjects = ProjectManagement.getAllProjects();
  var allTasks = TaskManagement.getTasksByProjectId(''); // Get all tasks
  var allEvaluations = Evaluation.getEvaluationsByProjectId(''); // Get all evaluations

  var totalUsers = allUsers.length;
  var activeUsers = allUsers.filter(function(user) { return user.Ativo === true; }).length;
  var totalProjects = allProjects.length;
  var activeProjects = allProjects.filter(function(project) { return project.Status === 'Ativo'; }).length;
  var pendingTasks = allTasks.filter(function(task) { return task.Status === 'Pendente'; }).length;
  var completedTasks = allTasks.filter(function(task) { return task.Status === 'Concluída'; }).length;

  var projectStatusDistribution = DashboardUtils.aggregateDataByStatus(allProjects, 'Status');
  var taskStatusDistribution = DashboardUtils.aggregateDataByStatus(allTasks, 'Status');

  return {
    userStats: { totalUsers: totalUsers, activeUsers: activeUsers },
    projectStats: { totalProjects: totalProjects, activeProjects: activeProjects, statusDistribution: projectStatusDistribution },
    taskStats: { pendingTasks: pendingTasks, completedTasks: completedTasks, statusDistribution: taskStatusDistribution },
    // Adicionar mais dados agregados conforme necessário
  };
}

function getAggregatedDashboardDataForEmployee(userId) {
  var myProjects = ProjectManagement.getAllProjects().filter(function(project) { return project.ResponsavelID == userId; });
  var myTasks = TaskManagement.getTasksByProjectId('').filter(function(task) { return task.ResponsavelID == userId; });
  var myEvaluations = Evaluation.getEvaluationsByProjectId('').filter(function(eval) { return eval.UsuarioID == userId; });

  var myPendingTasks = myTasks.filter(function(task) { return task.Status === 'Pendente'; }).length;
  var myCompletedTasks = myTasks.filter(function(task) { return task.Status === 'Concluída'; }).length;

  var myTaskStatusDistribution = DashboardUtils.aggregateDataByStatus(myTasks, 'Status');

  return {
    projectStats: { myProjectsCount: myProjects.length },
    taskStats: { myPendingTasks: myPendingTasks, myCompletedTasks: myCompletedTasks, statusDistribution: myTaskStatusDistribution },
    // Adicionar mais dados agregados específicos do funcionário
  };
}
