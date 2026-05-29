// UserManagement.gs
/**
 * @overview Módulo de gerenciamento de usuários para o sistema de gestão agentica.
 *           Contém funções CRUD (Criar, Ler, Atualizar, Deletar) para usuários na Google Planilha.
 *           Apenas administradores devem ter acesso total a estas funções.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar permissões de administrador.
 *   - Logger.gs: Para registrar operações de gerenciamento de usuários.
 *   - DataValidation.gs: Para validar dados de entrada do usuário.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de usuário.
 *
 * @description
 *   Este módulo permite que usuários com papel de 'Administrador' realizem operações
 *   completas de gerenciamento sobre os usuários do sistema. Isso inclui a criação de
 *   novos usuários, leitura de seus perfis, atualização de informações (como papel ou status
 *   de atividade) e exclusão de usuários existentes. Todas as operações são validadas
 *   para garantir que apenas usuários autorizados possam executá-las e que os dados
 *   sejam consistentes.
 */

function createUser(userData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar usuários.");
  }
  if (!DataValidation.validateUser(userData)) {
    throw new Error("Dados de usuário inválidos.");
  }

  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var headers = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  // Gerar um ID simples (pode ser melhorado para UUID)
  var lastRow = usersSheet.getLastRow();
  var newId = lastRow > 0 ? usersSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  userData.ID = newId;

  headers.forEach(function(header) {
    newRow.push(userData[header] || '');
  });
  usersSheet.appendRow(newRow);
  Logger.log(`Usuário criado: ${userData.Email} por ${SessionManagement.getSession().email}`);
  return { success: true, message: "Usuário criado com sucesso.", id: newId };
}

function getUserById(id) {
  if (!isAdmin() && SessionManagement.getSession().id !== id) {
    throw new Error("Acesso negado. Você só pode visualizar seu próprio perfil.");
  }
  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('ID');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var user = {};
      headers.forEach(function(header, index) {
        user[header] = data[i][index];
      });
      return user;
    }
  }
  return null;
}

function getAllUsers() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem listar todos os usuários.");
  }
  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var users = [];

  for (var i = 1; i < data.length; i++) {
    var user = {};
    headers.forEach(function(header, index) {
      user[header] = data[i][index];
    });
    users.push(user);
  }
  return users;
}

function updateUser(id, updates) {
  if (!isAdmin() && SessionManagement.getSession().id !== id) {
    throw new Error("Acesso negado. Você só pode atualizar seu próprio perfil.");
  }
  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('ID');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var row = data[i];
      headers.forEach(function(header, index) {
        if (updates.hasOwnProperty(header)) {
          row[index] = updates[header];
        }
      });
      usersSheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      Logger.log(`Usuário atualizado: ID ${id} por ${SessionManagement.getSession().email}`);
      return { success: true, message: "Usuário atualizado com sucesso." };
    }
  }
  throw new Error("Usuário não encontrado.");
}

function deleteUser(id) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem deletar usuários.");
  }
  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('ID');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      usersSheet.deleteRow(i + 1);
      Logger.log(`Usuário deletado: ID ${id} por ${SessionManagement.getSession().email}`);
      return { success: true, message: "Usuário deletado com sucesso." };
    }
  }
  throw new Error("Usuário não encontrado.");
}
