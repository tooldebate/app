// ReportGeneration.gs
/**
 * @overview Módulo para geração de relatórios no sistema de gestão agentica.
 *           Contém funções para compilar dados de diferentes fontes (planilha, Gemini)
 *           e formatá-los em relatórios úteis para administradores e gerentes.
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
 *   - GeminiIntegration.gs: Para insights e sumarizações.
 *   - DriveIntegration.gs: Para salvar relatórios gerados.
 *   - Logger.gs: Para registrar a geração de relatórios.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados.
 *   - Google Gemini API: Geração de conteúdo e insights.
 *   - Google Drive: Armazenamento de relatórios.
 *
 * @description
 *   Este módulo permite a criação de relatórios dinâmicos e abrangentes sobre o
 *   desempenho de projetos, equipes e indivíduos. Ele pode consolidar dados de
 *   múltiplas abas da Google Planilha, enriquecê-los com análises e sumarizações
 *   geradas pela API Gemini, e salvar os relatórios resultantes no Google Drive.
 *   Os relatórios podem ser personalizados para atender às necessidades específicas
 *   de diferentes stakeholders, fornecendo insights valiosos para a gestão.
 */

function generateProjectPerformanceReport(projectId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem gerar relatórios de desempenho de projeto.");
  }
  Logger.log(`Gerando relatório de desempenho para o Projeto ID ${projectId} por ${SessionManagement.getSession().email}`);

  var projectDetails = ProjectDetails.getProjectDetails(projectId);
  var project = projectDetails.project;
  var tasks = projectDetails.tasks;
  var evaluations = projectDetails.evaluations;
  var adherence = projectDetails.adherence;
  var understanding = projectDetails.understanding;

  var reportContent = `<h1>Relatório de Desempenho do Projeto: ${project.NomeProjeto}</h1>\n`;
  reportContent += `<p><b>Descrição:</b> ${project.Descricao}</p>\n`;
  reportContent += `<p><b>Status:</b> ${project.Status}</p>\n`;
  reportContent += `<p><b>Período:</b> ${Utils.formatDate(project.DataInicio)} - ${Utils.formatDate(project.DataFim)}</p>\n`;
  reportContent += `<p><b>Responsável:</b> ${UserManagement.getUserById(project.ResponsavelID).Nome}</p>\n`;

  reportContent += `<h2>Métricas de Equipe</h2>\n`;
  reportContent += `<p><b>Aderência Média:</b> ${adherence.score}%</p>\n`;
  reportContent += `<p><b>Compreensão Média:</b> ${understanding.score}%</p>\n`;

  reportContent += `<h2>Tarefas (${tasks.length})</h2>\n`;
  if (tasks.length > 0) {
    reportContent += `<ul>\n`;
    tasks.forEach(function(task) {
      reportContent += `<li>${task.Descricao} (Status: ${task.Status}, Prazo: ${Utils.formatDate(task.Prazo)})</li>\n`;
    });
    reportContent += `</ul>\n`;
  } else {
    reportContent += `<p>Nenhuma tarefa encontrada para este projeto.</p>\n`;
  }

  reportContent += `<h2>Avaliações (${evaluations.length})</h2>\n`;
  if (evaluations.length > 0) {
    reportContent += `<ul>\n`;
    evaluations.forEach(function(eval) {
      reportContent += `<li>Usuário: ${UserManagement.getUserById(eval.UsuarioID).Nome}, Pontuação: ${eval.Pontuacao}, Comentários: ${eval.Comentarios}</li>\n`;
      if (eval.GeminiFeedback) {
        reportContent += `  <li><i>Feedback Gemini:</i> ${eval.GeminiFeedback}</li>\n`;
      }
    });
    reportContent += `</ul>\n`;
  } else {
    reportContent += `<p>Nenhuma avaliação encontrada para este projeto.</p>\n`;
  }

  // Opcional: Adicionar um resumo gerado pela Gemini
  try {
    var geminiSummary = GeminiIntegration.summarizeProjectDescription(project.Descricao);
    reportContent += `<h2>Resumo do Projeto (Gerado por Gemini)</h2>\n`;
    reportContent += `<p>${geminiSummary.text}</p>\n`;
  } catch (e) {
    reportContent += `<p><i>Não foi possível gerar resumo do projeto via Gemini: ${e.message}</i></p>\n`;
  }

  // Salvar o relatório no Google Drive
  var fileName = `Relatorio_Desempenho_Projeto_${project.NomeProjeto.replace(/ /g, ".")}_${new Date().getTime()}.html`;
  var fileData = Utilities.base64Encode(Utilities.newBlob(reportContent, "text/html").getBytes());
  var uploadResult = DriveIntegration.uploadFileToDrive(fileData, fileName, "text/html");

  return { success: true, message: "Relatório gerado e salvo no Drive.", fileUrl: uploadResult.fileUrl };
}

function generateTeamPerformanceReport() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem gerar relatórios de desempenho de equipe.");
  }
  Logger.log(`Gerando relatório de desempenho de equipe por ${SessionManagement.getSession().email}`);

  var allUsers = UserManagement.getAllUsers();
  var allProjects = ProjectManagement.getAllProjects();
  var allEvaluations = Evaluation.getEvaluationsByProjectId(""); // Todas as avaliações

  var reportContent = `<h1>Relatório de Desempenho da Equipe</h1>\n`;
  reportContent += `<p>Data de Geração: ${Utils.formatDate(new Date().toISOString())}</p>\n`;

  reportContent += `<h2>Visão Geral dos Usuários</h2>\n`;
  reportContent += `<ul>\n`;
  allUsers.forEach(function(user) {
    reportContent += `<li>${user.Nome} (${user.Role}) - Ativo: ${user.Ativo ? "Sim" : "Não"}</li>\n`;
  });
  reportContent += `</ul>\n`;

  reportContent += `<h2>Métricas por Projeto</h2>\n`;
  if (allProjects.length > 0) {
    reportContent += `<ul>\n`;
    allProjects.forEach(function(project) {
      var adherence = Evaluation.calculateTeamAdherence(project.ID);
      var understanding = Evaluation.calculateTeamUnderstanding(project.ID);
      reportContent += `<li><b>${project.NomeProjeto}</b> (Status: ${project.Status})<br/>\n`;
      reportContent += `  Aderência Média: ${adherence.score}%, Compreensão Média: ${understanding.score}%</li>\n`;
    });
    reportContent += `</ul>\n`;
  } else {
    reportContent += `<p>Nenhum projeto encontrado.</p>\n`;
  }

  // Salvar o relatório no Google Drive
  var fileName = `Relatorio_Desempenho_Equipe_${new Date().getTime()}.html`;
  var fileData = Utilities.base64Encode(Utilities.newBlob(reportContent, "text/html").getBytes());
  var uploadResult = DriveIntegration.uploadFileToDrive(fileData, fileName, "text/html");

  return { success: true, message: "Relatório de equipe gerado e salvo no Drive.", fileUrl: uploadResult.fileUrl };
}
