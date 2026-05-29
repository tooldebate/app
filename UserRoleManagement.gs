// UserRoleManagement.gs
/**
 * @overview Módulo para gerenciar os papéis (roles) dos usuários e suas permissões associadas.
 *           Permite definir, atribuir e verificar papéis de forma mais granular.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha (aba 'Roles').
 *   - Logger.gs: Para registrar operações de gerenciamento de papéis.
 *   - Auth.gs: Para verificar permissões de administrador.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de definições de papéis e permissões.
 *
 * @description
 *   Este módulo estende o conceito de papéis de usuário, permitindo uma gestão mais
 *   detalhada das permissões. Ele pode armazenar definições de papéis e as permissões
 *   associadas a cada papel em uma aba dedicada da planilha. Isso possibilita que
 *   administradores configurem quais ações cada papel pode realizar (ex: criar projeto,
 *   editar tarefa, visualizar relatório), tornando o sistema mais flexível e seguro.
 */

function getRolePermissions(roleName) {
  var rolesSheet = SpreadsheetService.getSheetByName("Roles");
  if (!rolesSheet) {
    // Se a aba de Roles não existe, assume um conjunto padrão de permissões
    if (roleName === "Administrador") {
      return { canCreateUser: true, canManageProjects: true, canViewAllReports: true };
    } else if (roleName === "Funcionário") {
      return { canCreateUser: false, canManageProjects: false, canViewOwnReports: true };
    }
    return {};
  }

  var data = rolesSheet.getDataRange().getValues();
  var headers = data[0];
  var roleNameCol = headers.indexOf("NomePapel");

  for (var i = 1; i < data.length; i++) {
    if (data[i][roleNameCol] === roleName) {
      var permissions = {};
      headers.forEach(function(header, index) {
        if (header !== "NomePapel") {
          permissions[header] = data[i][index] === true; // Converte para booleano
        }
      });
      return permissions;
    }
  }
  return {};
}

function assignUserRole(userId, roleName) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem atribuir papéis.");
  }
  Logger.log(`Atribuindo papel ${roleName} ao usuário ID ${userId} por ${SessionManagement.getSession().email}`);
  // Lógica para atualizar o papel do usuário na aba 'Usuários'
  var user = UserManagement.getUserById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }
  UserManagement.updateUser(userId, { Role: roleName });
  return { success: true, message: `Papel ${roleName} atribuído ao usuário ${user.Nome}.` };
}

function createRole(roleData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar papéis.");
  }
  Logger.log(`Criando novo papel: ${roleData.NomePapel} por ${SessionManagement.getSession().email}`);

  var rolesSheet = SpreadsheetService.getSheetByName("Roles");
  if (!rolesSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    rolesSheet = spreadsheet.insertSheet("Roles");
    rolesSheet.appendRow(["ID", "NomePapel", "Descricao", "canCreateUser", "canManageProjects", "canViewAllReports"]);
    Logger.log("Aba 'Roles' criada com cabeçalhos.");
  }

  var headers = rolesSheet.getRange(1, 1, 1, rolesSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = rolesSheet.getLastRow();
  var newId = lastRow > 0 ? rolesSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  roleData.ID = newId;

  headers.forEach(function(header) {
    newRow.push(roleData[header] || "");
  });
  rolesSheet.appendRow(newRow);
  return { success: true, message: "Papel criado com sucesso.", roleId: newId };
}
