// ProjectMetrics.gs
/**
 * @overview Módulo para cálculo de métricas de projeto no sistema de gestão agentica.
 *           Fornece funções para calcular o progresso, tempo restante e outras métricas
 *           importantes para a saúde do projeto.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - Utils.gs: Para funções utilitárias de data.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para projetos e tarefas.
 *
 * @description
 *   Este módulo é responsável por calcular métricas chave de desempenho para cada projeto.
 *   Ele pode determinar o percentual de conclusão do projeto com base nas tarefas concluídas,
 *   estimar o tempo restante, e identificar possíveis atrasos. Essas métricas são cruciais
 *   para que gerentes de projeto e administradores possam monitorar o progresso e tomar
 *   decisões informadas para manter os projetos no caminho certo.
 */

function calculateProjectProgress(projectId) {
  var tasks = TaskManagement.getTasksByProjectId(projectId);
  if (tasks.length === 0) {
    return { progress: 0, completedTasks: 0, totalTasks: 0 };
  }

  var completedTasks = tasks.filter(function(task) { return task.Status === "Concluída"; }).length;
  var progress = (completedTasks / tasks.length) * 100;

  return { progress: progress.toFixed(2), completedTasks: completedTasks, totalTasks: tasks.length };
}

function calculateProjectTimeRemaining(projectId) {
  var project = ProjectManagement.getProjectById(projectId);
  if (!project || !project.DataFim) {
    return { daysRemaining: "N/A", message: "Data de fim do projeto não definida." };
  }

  var endDate = new Date(project.DataFim);
  var today = new Date();
  var timeDiff = endDate.getTime() - today.getTime();
  var daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { daysRemaining: daysRemaining, message: `Projeto atrasado em ${Math.abs(daysRemaining)} dias.` };
  } else {
    return { daysRemaining: daysRemaining, message: `${daysRemaining} dias restantes para o projeto.` };
  }
}

function getOverdueTasksCount(projectId) {
  var tasks = TaskManagement.getTasksByProjectId(projectId);
  var overdueTasks = tasks.filter(function(task) {
    var taskDueDate = task.Prazo ? new Date(task.Prazo) : null;
    return taskDueDate && new Date() > taskDueDate && task.Status !== "Concluída";
  });
  return overdueTasks.length;
}
