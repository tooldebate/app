// ProjectReportGenerator.gs
/**
 * @overview Módulo para gerar relatórios detalhados de projetos.
 *           Compila informações de projetos, tarefas, avaliações e métricas em um formato de relatório.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter dados do projeto.
 *   - TaskManagement.gs: Para obter tarefas do projeto.
 *   - Evaluation.gs: Para obter avaliações do projeto.
 *   - ProjectMetrics.gs: Para obter métricas do projeto.
 *   - ReportDataFormatter.gs: Para formatar os dados do relatório.
 *   - GeminiIntegration.gs: Para adicionar insights da Gemini.
 *   - DriveIntegration.gs: Para salvar o relatório gerado.
 *   - Logger.gs: Para registrar a geração do relatório.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados.
 *   - Google Gemini API: Geração de insights.
 *   - Google Drive: Armazenamento de relatórios.
 *
 * @description
 *   Este módulo é especializado na criação de relatórios abrangentes para projetos individuais.
 *   Ele reúne dados de várias fontes, como detalhes do projeto, lista de tarefas com seus status,
 *   avaliações de equipe e métricas de progresso. Além disso, pode integrar resumos e análises
 *   geradas pela API Gemini para enriquecer o relatório. O relatório final é formatado
 *   em HTML e salvo no Google Drive, proporcionando uma visão completa do desempenho do projeto.
 */

function generateDetailedProjectReport(projectId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem gerar relatórios detalhados de projeto.");
  }
  Logger.log(`Gerando relatório detalhado para o Projeto ID ${projectId} por ${SessionManagement.getSession().email}`);

  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  var tasks = TaskManagement.getTasksByProjectId(projectId);
  var evaluations = Evaluation.getEvaluationsByProjectId(projectId);
  var projectProgress = ProjectMetrics.calculateProjectProgress(projectId);
  var timeRemaining = ProjectMetrics.calculateProjectTimeRemaining(projectId);
  var overdueTasksCount = ProjectMetrics.getOverdueTasksCount(projectId);

  var reportContent = `<h1>Relatório Detalhado do Projeto: ${project.NomeProjeto}</h1>\n`;
  reportContent += `<p><b>ID do Projeto:</b> ${project.ID}</p>\n`;
  reportContent += `<p><b>Descrição:</b> ${project.Descricao}</p>\n`;
  reportContent += `<p><b>Status:</b> ${project.Status}</p>\n`;
  reportContent += `<p><b>Período:</b> ${Utils.formatDate(project.DataInicio)} - ${Utils.formatDate(project.DataFim)}</p>\n`;
  reportContent += `<p><b>Responsável:</b> ${UserManagement.getUserById(project.ResponsavelID).Nome}</p>\n`;

  reportContent += `<h2>Métricas de Progresso</h2>\n`;
  reportContent += `<p><b>Progresso:</b> ${projectProgress.progress}% (${projectProgress.completedTasks} de ${projectProgress.totalTasks} tarefas concluídas)</p>\n`;
  reportContent += `<p><b>Tempo Restante:</b> ${timeRemaining.message}</p>\n`;
  reportContent += `<p><b>Tarefas Atrasadas:</b> ${overdueTasksCount}</p>\n`;

  reportContent += `<h2>Tarefas do Projeto</h2>\n`;
  if (tasks.length > 0) {
    var taskHeaders = ['ID', 'Descricao', 'ResponsavelID', 'Prazo', 'Status'];
    reportContent += ReportDataFormatter.formatDataAsHtmlTable(tasks, taskHeaders, 'Lista de Tarefas');
  } else {
    reportContent += `<p>Nenhuma tarefa encontrada para este projeto.</p>\n`;
  }

  reportContent += `<h2>Avaliações da Equipe</h2>\n`;
  if (evaluations.length > 0) {
    var evaluationHeaders = ['ID', 'UsuarioID', 'DataAvaliacao', 'Pontuacao', 'Comentarios', 'GeminiFeedback'];
    reportContent += ReportDataFormatter.formatDataAsHtmlTable(evaluations, evaluationHeaders, 'Lista de Avaliações');
  } else {
    reportContent += `<p>Nenhuma avaliação encontrada para este projeto.</p>\n`;
  }

  // Adicionar um resumo gerado pela Gemini
  try {
    var geminiSummary = GeminiIntegration.summarizeProjectDescription(project.Descricao);
    reportContent += `<h2>Resumo do Projeto (Gerado por Gemini)</h2>\n`;
    reportContent += `<p>${geminiSummary.text}</p>\n`;
  } catch (e) {
    reportContent += `<p><i>Não foi possível gerar resumo do projeto via Gemini: ${e.message}</i></p>\n`;
  }

  // Salvar o relatório no Google Drive
  var fileName = `Relatorio_Detalhado_Projeto_${project.NomeProjeto.replace(/ /g, "_")}_${new Date().getTime()}.html`;
  var fileData = Utilities.base64Encode(Utilities.newBlob(reportContent, "text/html").getBytes());
  var uploadResult = DriveIntegration.uploadFileToDrive(fileData, fileName, "text/html");

  return { success: true, message: "Relatório detalhado gerado e salvo no Drive.", fileUrl: uploadResult.fileUrl };
}
