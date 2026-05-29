// DashboardRenderer.gs
/**
 * @overview Módulo para renderizar componentes de dashboard no frontend.
 *           Converte dados agregados em HTML ou JSON para visualização.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - DashboardDataAggregator.gs: Para obter os dados agregados.
 *   - HtmlOutputRenderer.gs: Para renderizar HTML.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo é responsável por pegar os dados processados pelo `DashboardDataAggregator.gs`
 *   e transformá-los em elementos visuais para o frontend. Ele pode gerar snippets HTML
 *   para cartões de resumo, gráficos ou tabelas, ou simplesmente formatar os dados
 *   em JSON para serem consumidos por bibliotecas JavaScript no lado do cliente.
 *   Isso separa a lógica de apresentação da lógica de negócios e de agregação de dados.
 */

function renderAdminDashboardHtml() {
  var data = DashboardDataAggregator.getAggregatedDashboardDataForAdmin();
  // Aqui você pode usar um template HTML para renderizar os dados
  var htmlContent = `
    <h1>Dashboard do Administrador</h1>
    <p>Total de Usuários: ${data.userStats.totalUsers}</p>
    <p>Usuários Ativos: ${data.userStats.activeUsers}</p>
    <p>Total de Projetos: ${data.projectStats.totalProjects}</p>
    <p>Projetos Ativos: ${data.projectStats.activeProjects}</p>
    <p>Tarefas Pendentes: ${data.taskStats.pendingTasks}</p>
    <p>Tarefas Concluídas: ${data.taskStats.completedTasks}</p>
    <h2>Distribuição de Status de Projetos</h2>
    <pre>${JSON.stringify(data.projectStats.statusDistribution, null, 2)}</pre>
    <h2>Distribuição de Status de Tarefas</h2>
    <pre>${JSON.stringify(data.taskStats.statusDistribution, null, 2)}</pre>
  `;
  return htmlContent; // Ou usar HtmlOutputRenderer.renderHtmlTemplate
}

function renderEmployeeDashboardHtml() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var data = DashboardDataAggregator.getAggregatedDashboardDataForEmployee(session.id);
  var htmlContent = `
    <h1>Meu Dashboard</h1>
    <p>Meus Projetos: ${data.projectStats.myProjectsCount}</p>
    <p>Minhas Tarefas Pendentes: ${data.taskStats.myPendingTasks}</p>
    <p>Minhas Tarefas Concluídas: ${data.taskStats.myCompletedTasks}</p>
    <h2>Minha Distribuição de Status de Tarefas</h2>
    <pre>${JSON.stringify(data.taskStats.statusDistribution, null, 2)}</pre>
  `;
  return htmlContent; // Ou usar HtmlOutputRenderer.renderHtmlTemplate
}
