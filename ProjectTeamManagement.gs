// ProjectTeamManagement.gs
/**
 * @overview Módulo para gerenciar a associação de usuários a projetos no sistema de gestão agentica.
 *           Permite adicionar, remover e listar membros da equipe para cada projeto.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar permissões de administrador.
 *   - Logger.gs: Para registrar operações de gerenciamento de equipe.
 *   - ProjectManagement.gs: Para verificar a existência do projeto.
 *   - UserManagement.gs: Para verificar a existência do usuário.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de associações de equipe (pode ser uma nova aba ou campo em Projetos).
 *
 * @description
 *   Este módulo é responsável por gerenciar quais usuários estão associados a quais projetos.
 *   Ele permite que administradores ou gerentes de projeto adicionem ou removam membros da equipe
 *   de um projeto específico. Isso é fundamental para o controle de acesso baseado em projeto
 *   e para a visibilidade das tarefas e avaliações. A associação pode ser armazenada em uma
 *   nova aba na planilha (`ProjectTeams`) ou como um campo de lista de IDs de usuários na aba `Projetos`.
 *   Para simplificar, vamos considerar uma nova aba `ProjectTeams` com `ProjetoID` e `UsuarioID`.
 */

function addTeamMemberToProject(projectId, userId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem adicionar membros à equipe do projeto.");
  }
  Logger.log(`Adicionando usuário ${userId} ao Projeto ID ${projectId} por ${SessionManagement.getSession().email}`);

  // Verificar se projeto e usuário existem
  if (!ProjectManagement.getProjectById(projectId)) {
    throw new Error("Projeto não encontrado.");
  }
  if (!UserManagement.getUserById(userId)) {
    throw new Error("Usuário não encontrado.");
  }

  var projectTeamsSheet = SpreadsheetService.getSheetByName("ProjectTeams");
  if (!projectTeamsSheet) {
    // Criar a aba se não existir
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    projectTeamsSheet = spreadsheet.insertSheet("ProjectTeams");
    projectTeamsSheet.appendRow(["ID", "ProjetoID", "UsuarioID"]);
    Logger.log("Aba 'ProjectTeams' criada com cabeçalhos.");
  }

  var data = projectTeamsSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var userIDCol = headers.indexOf("UsuarioID");

  // Verificar se a associação já existe
  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId && data[i][userIDCol] == userId) {
      return { success: false, message: "Usuário já é membro deste projeto." };
    }
  }

  var newId = data.length > 0 ? data[data.length - 1][0] + 1 : 1;
  projectTeamsSheet.appendRow([newId, projectId, userId]);
  return { success: true, message: "Membro adicionado ao projeto com sucesso." };
}

function removeTeamMemberFromProject(projectId, userId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem remover membros da equipe do projeto.");
  }
  Logger.log(`Removendo usuário ${userId} do Projeto ID ${projectId} por ${SessionManagement.getSession().email}`);

  var projectTeamsSheet = SpreadsheetService.getSheetByName("ProjectTeams");
  if (!projectTeamsSheet) {
    throw new Error("Aba 'ProjectTeams' não encontrada.");
  }

  var data = projectTeamsSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var userIDCol = headers.indexOf("UsuarioID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId && data[i][userIDCol] == userId) {
      projectTeamsSheet.deleteRow(i + 1);
      return { success: true, message: "Membro removido do projeto com sucesso." };
    }
  }
  throw new Error("Associação de usuário e projeto não encontrada.");
}

function getProjectTeamMembers(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  // Verificar se o usuário tem permissão para ver os membros do projeto
  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }
  if (!isAdmin() && project.ResponsavelID != session.id) {
    throw new Error("Acesso negado. Você não tem permissão para visualizar os membros deste projeto.");
  }

  var projectTeamsSheet = SpreadsheetService.getSheetByName("ProjectTeams");
  if (!projectTeamsSheet) {
    return []; // Nenhuma equipe configurada ainda
  }

  var data = projectTeamsSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var userIDCol = headers.indexOf("UsuarioID");
  var teamMembers = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId) {
      var userId = data[i][userIDCol];
      var user = UserManagement.getUserById(userId);
      if (user) {
        teamMembers.push({ id: user.ID, nome: user.Nome, email: user.Email, role: user.Role });
      }
    }
  }
  return teamMembers;
}
