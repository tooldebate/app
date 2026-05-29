// ProjectManagement.gs
/**
 * @overview Módulo de gerenciamento de projetos para o sistema de gestão agentica.
 *           Contém funções CRUD (Criar, Ler, Atualizar, Deletar) para projetos na Google Planilha.
 *           Permissões são baseadas no papel do usuário (administrador ou funcionário).
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar permissões de usuário.
 *   - Logger.gs: Para registrar operações de gerenciamento de projetos.
 *   - DataValidation.gs: Para validar dados de entrada do projeto.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de projetos.
 *
 * @description
 *   Este módulo permite a criação, visualização, edição e exclusão de projetos.
 *   Administradores têm controle total, enquanto funcionários podem visualizar
 *   e, dependendo da configuração, editar projetos aos quais estão associados.
 *   As funções garantem a integridade dos dados e o controle de acesso.
 */

function createProject(projectData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar projetos.");
  }
  if (!DataValidation.validateProject(projectData)) {
    throw new Error("Dados de projeto inválidos.");
  }

  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var headers = projectsSheet.getRange(1, 1, 1, projectsSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = projectsSheet.getLastRow();
  var newId = lastRow > 0 ? projectsSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  projectData.ID = newId;

  headers.forEach(function(header) {
    newRow.push(projectData[header] || "");
  });
  projectsSheet.appendRow(newRow);
  Logger.log(`Projeto criado: ${projectData.NomeProjeto} por ${SessionManagement.getSession().email}`);
  return { success: true, message: "Projeto criado com sucesso.", id: newId };
}

function getProjectById(id) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var data = projectsSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");
  var responsibleCol = headers.indexOf("ResponsavelID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var project = {};
      headers.forEach(function(header, index) {
        project[header] = data[i][index];
      });
      // Apenas administradores ou o responsável pelo projeto podem ver detalhes completos
      if (isAdmin() || project.ResponsavelID == session.id) {
        return project;
      } else {
        throw new Error("Acesso negado. Você não tem permissão para visualizar este projeto.");
      }
    }
  }
  return null;
}

function getAllProjects() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var data = projectsSheet.getDataRange().getValues();
  var headers = data[0];
  var projects = [];
  var responsibleCol = headers.indexOf("ResponsavelID");

  for (var i = 1; i < data.length; i++) {
    var project = {};
    headers.forEach(function(header, index) {
      project[header] = data[i][index];
    });
    // Administradores veem todos, funcionários veem apenas os seus
    if (isAdmin() || project.ResponsavelID == session.id) {
      projects.push(project);
    }
  }
  return projects;
}

function updateProject(id, updates) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem atualizar projetos.");
  }
  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var data = projectsSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var row = data[i];
      headers.forEach(function(header, index) {
        if (updates.hasOwnProperty(header)) {
          row[index] = updates[header];
        }
      });
      projectsSheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      Logger.log(`Projeto atualizado: ID ${id} por ${SessionManagement.getSession().email}`);
      return { success: true, message: "Projeto atualizado com sucesso." };
    }
  }
  throw new Error("Projeto não encontrado.");
}

function deleteProject(id) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem deletar projetos.");
  }
  var projectsSheet = SpreadsheetService.getSheetByName("Projetos");
  var data = projectsSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      projectsSheet.deleteRow(i + 1);
      Logger.log(`Projeto deletado: ID ${id} por ${SessionManagement.getSession().email}`);
      return { success: true, message: "Projeto deletado com sucesso." };
    }
  }
  throw new Error("Projeto não encontrado.");
}
