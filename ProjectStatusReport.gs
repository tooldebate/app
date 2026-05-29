// ProjectStatusReport.gs
/**
 * @overview Módulo para gerar relatórios de status de projetos.
 *           Fornece um resumo conciso do estado atual de um projeto.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter dados do projeto.
 *   - ProjectMetrics.gs: Para obter métricas do projeto.
 *   - UserManagement.gs: Para obter detalhes do responsável.
 *   - ReportDataFormatter.gs: Para formatar a saída.
 *   - Logger.gs: Para registrar a geração do relatório.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados.
 *
 * @description
 *   Este módulo gera um relatório de status rápido para um projeto específico.
 *   Ele inclui informações essenciais como o nome do projeto, status atual,
 *   progresso, tempo restante e o responsável. O relatório é formatado para
 *   ser facilmente legível e pode ser usado para atualizações rápidas ou
 *   comunicações internas.
 */

function generateProjectStatusReport(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error('Projeto não encontrado.');
  }

  // Verifica permissão para visualizar o projeto
  if (!isAdmin() && project.ResponsavelID != session.id) {
    throw new Error('Acesso negado. Você não tem permissão para visualizar este projeto.');
  }

  Logger.log(`Gerando relatório de status para o Projeto ID ${projectId} por ${session.email}`);

  var projectProgress = ProjectMetrics.calculateProjectProgress(projectId);
  var timeRemaining = ProjectMetrics.calculateProjectTimeRemaining(projectId);
  var responsibleUser = UserManagement.getUserById(project.ResponsavelID);

  var reportContent = `<h1>Relatório de Status do Projeto: ${project.NomeProjeto}</h1>\n`;
  reportContent += `<p><b>ID do Projeto:</b> ${project.ID}</p>\n`;
  reportContent += `<p><b>Status:</b> ${project.Status}</p>\n`;
  reportContent += `<p><b>Progresso:</b> ${projectProgress.progress}%</p>\n`;
  reportContent += `<p><b>Tempo Restante:</b> ${timeRemaining.message}</p>\n`;
  reportContent += `<p><b>Responsável:</b> ${responsibleUser ? responsibleUser.Nome : 'N/A'}</p>\n`;
  reportContent += `<p><b>Última Atualização:</b> ${Utils.formatDate(new Date().toISOString())}</p>\n`;

  return { success: true, reportHtml: reportContent };
}
