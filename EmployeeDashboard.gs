// EmployeeDashboard.gs
/**
 * @overview Módulo de backend para o dashboard do funcionário no sistema de gestão agentica.
 *           Fornece funções para coletar e agregar dados específicos para a exibição no dashboard do funcionário,
 *           focando em suas tarefas, projetos e avaliações.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para verificar permissões de funcionário e obter ID do usuário.
 *   - ProjectManagement.gs: Para obter dados de projetos associados ao funcionário.
 *   - TaskManagement.gs: Para obter dados de tarefas atribuídas ao funcionário.
 *   - Evaluation.gs: Para obter dados de avaliações relacionadas ao funcionário.
 *   - Logger.gs: Para registrar acessos ao dashboard.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para o dashboard.
 *
 * @description
 *   Este módulo é responsável por preparar os dados que serão exibidos no dashboard
 *   individual de cada funcionário. Ele filtra informações de projetos, tarefas e
 *   avaliações para mostrar apenas o que é relevante para o usuário logado. Isso
 *   inclui tarefas pendentes, projetos em que está envolvido e seu desempenho em
 *   avaliações recentes. Garante que funcionários vejam um resumo claro de suas
 *   responsabilidades e progresso.
 */

function getEmployeeDashboardData() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  if (!isEmployee()) {
    throw new Error("Acesso negado. Apenas funcionários podem acessar este dashboard.");
  }
  Logger.log(`Acesso ao dashboard do funcionário por ${session.email}`);

  var userId = session.id;

  // Obter projetos onde o funcionário é responsável
  var allProjects = ProjectManagement.getAllProjects(); // Esta função já filtra por responsável se não for admin
  var myProjects = allProjects.filter(function(project) { return project.ResponsavelID == userId; });

  // Obter tarefas atribuídas ao funcionário
  var allTasks = TaskManagement.getTasksByProjectId(""); // Precisa de uma função para pegar todas as tarefas ou filtrar por responsável
  var myTasks = allTasks.filter(function(task) { return task.ResponsavelID == userId; });

  var pendingMyTasks = myTasks.filter(function(task) { return task.Status === "Pendente"; }).length;
  var completedMyTasks = myTasks.filter(function(task) { return task.Status === "Concluída"; }).length;

  // Obter avaliações relacionadas ao funcionário
  var myEvaluations = Evaluation.getEvaluationsByProjectId("").filter(function(eval) { return eval.UsuarioID == userId; });

  var totalAdherenceScore = 0;
  var totalUnderstandingScore = 0;
  myEvaluations.forEach(function(eval) {
    totalAdherenceScore += eval.Pontuacao || 0;
    if (eval.GeminiFeedback && eval.GeminiFeedback.includes("compreensão excelente")) {
      totalUnderstandingScore += 1;
    }
  });
  var averageAdherence = myEvaluations.length > 0 ? (totalAdherenceScore / myEvaluations.length) : 0;
  var averageUnderstanding = myEvaluations.length > 0 ? (totalUnderstandingScore / myEvaluations.length) * 100 : 0;

  return {
    myProjectsCount: myProjects.length,
    pendingMyTasks: pendingMyTasks,
    completedMyTasks: completedMyTasks,
    averageAdherence: averageAdherence.toFixed(2),
    averageUnderstanding: averageUnderstanding.toFixed(2),
    recentTasks: myTasks.slice(0, 5) // Exemplo: últimas 5 tarefas
  };
}
