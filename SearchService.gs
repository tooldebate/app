// SearchService.gs
/**
 * @overview Módulo de serviço de busca para o sistema de gestão agentica.
 *           Fornece funções para pesquisar dados em diferentes abas da Google Planilha.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar a autenticação e permissões do usuário.
 *   - Logger.gs: Para registrar as operações de busca.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para a busca.
 *
 * @description
 *   Este módulo permite que os usuários realizem buscas por informações dentro do sistema.
 *   Ele pode pesquisar em várias abas da Google Planilha (usuários, projetos, tarefas)
 *   e retornar resultados relevantes. A busca pode ser configurada para ser sensível
 *   ao contexto do usuário (por exemplo, funcionários só veem seus próprios projetos/tarefas)
 *   e pode incluir opções de filtragem e ordenação para refinar os resultados.
 */

function searchUsers(query) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem pesquisar usuários.");
  }
  Logger.log(`Pesquisando usuários por: ${query} por ${SessionManagement.getSession().email}`);
  var usersSheet = SpreadsheetService.getSheetByName("Usuários");
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var user = {};
    headers.forEach(function(header, index) {
      user[header] = data[i][index];
    });
    // Pesquisa simples por nome ou email
    if (user.Nome.toLowerCase().includes(query.toLowerCase()) || user.Email.toLowerCase().includes(query.toLowerCase())) {
      results.push(user);
    }
  }
  return results;
}

function searchProjects(query) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  Logger.log(`Pesquisando projetos por: ${query} por ${session.email}`);
  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var data = projectsSheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];
  var responsibleCol = headers.indexOf("ResponsavelID");

  for (var i = 1; i < data.length; i++) {
    var project = {};
    headers.forEach(function(header, index) {
      project[header] = data[i][index];
    });
    // Administradores veem todos, funcionários veem apenas os seus
    if (isAdmin() || project.ResponsavelID == session.id) {
      if (project.NomeProjeto.toLowerCase().includes(query.toLowerCase()) || project.Descricao.toLowerCase().includes(query.toLowerCase())) {
        results.push(project);
      }
    }
  }
  return results;
}

function searchTasks(query) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  Logger.log(`Pesquisando tarefas por: ${query} por ${session.email}`);
  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var data = tasksSheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];
  var responsibleCol = headers.indexOf("ResponsavelID");

  for (var i = 1; i < data.length; i++) {
    var task = {};
    headers.forEach(function(header, index) {
      task[header] = data[i][index];
    });
    // Administradores veem todas, funcionários veem apenas as suas
    if (isAdmin() || task.ResponsavelID == session.id) {
      if (task.Descricao.toLowerCase().includes(query.toLowerCase())) {
        results.push(task);
      }
    }
  }
  return results;
}
