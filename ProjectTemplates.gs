// ProjectTemplates.gs
/**
 * @overview Módulo para gerenciar modelos de projetos no sistema de gestão agentica.
 *           Permite a criação de novos projetos a partir de modelos predefinidos,
 *           incluindo tarefas e estruturas de equipe.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - ProjectManagement.gs: Para criar novos projetos.
 *   - TaskManagement.gs: Para criar tarefas a partir do modelo.
 *   - ProjectTeamManagement.gs: Para adicionar membros da equipe.
 *   - Auth.gs: Para verificar permissões de administrador.
 *   - Logger.gs: Para registrar a criação de projetos a partir de modelos.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de modelos de projetos e suas tarefas associadas.
 *
 * @description
 *   Este módulo agiliza o processo de criação de novos projetos, permitindo que
 *   administradores definam modelos com tarefas e estruturas de equipe predefinidas.
 *   Ao criar um projeto a partir de um modelo, todas as tarefas e, opcionalmente,
 *   os membros da equipe são automaticamente configurados, economizando tempo
 *   e garantindo consistência em projetos semelhantes. Os modelos são armazenados
 *   em uma aba dedicada na Google Planilha (`ProjectTemplates`).
 */

function createProjectFromTemplate(templateId, newProjectData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar projetos a partir de modelos.");
  }
  Logger.log(`Criando projeto a partir do modelo ID ${templateId} por ${SessionManagement.getSession().email}`);

  var templatesSheet = SpreadsheetService.getSheetByName("ProjectTemplates");
  if (!templatesSheet) {
    throw new Error("Aba 'ProjectTemplates' não encontrada. Crie-a com 'ID', 'NomeModelo', 'DescricaoModelo', 'TarefasJson'.");
  }

  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");
  var tasksJsonCol = headers.indexOf("TarefasJson");

  var template = null;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == templateId) {
      template = {};
      headers.forEach(function(header, index) {
        template[header] = data[i][index];
      });
      break;
    }
  }

  if (!template) {
    throw new Error("Modelo de projeto não encontrado.");
  }

  // 1. Criar o novo projeto
  var projectCreationResult = ProjectManagement.createProject({
    NomeProjeto: newProjectData.NomeProjeto || template.NomeModelo,
    Descricao: newProjectData.Descricao || template.DescricaoModelo,
    Status: newProjectData.Status || "Pendente",
    DataInicio: newProjectData.DataInicio || new Date().toISOString(),
    DataFim: newProjectData.DataFim || "",
    ResponsavelID: newProjectData.ResponsavelID || SessionManagement.getSession().id
  });

  if (!projectCreationResult.success) {
    throw new Error(`Falha ao criar projeto: ${projectCreationResult.message}`);
  }
  var newProjectId = projectCreationResult.id;

  // 2. Criar tarefas a partir do modelo
  if (template.TarefasJson) {
    var templateTasks = JSON.parse(template.TarefasJson);
    templateTasks.forEach(function(task) {
      TaskManagement.createTask({
        ProjetoID: newProjectId,
        Descricao: task.Descricao,
        ResponsavelID: task.ResponsavelID || newProjectData.ResponsavelID || SessionManagement.getSession().id,
        Prazo: task.Prazo || "",
        Status: task.Status || "Pendente"
      });
    });
  }

  Logger.log(`Projeto ID ${newProjectId} criado a partir do modelo ID ${templateId}.`);
  return { success: true, message: "Projeto criado a partir do modelo com sucesso.", projectId: newProjectId };
}

function createProjectTemplate(templateData) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar modelos de projeto.");
  }
  Logger.log(`Criando novo modelo de projeto: ${templateData.NomeModelo} por ${SessionManagement.getSession().email}`);

  var templatesSheet = SpreadsheetService.getSheetByName("ProjectTemplates");
  if (!templatesSheet) {
    var spreadsheet = SpreadsheetService.getSpreadsheet();
    templatesSheet = spreadsheet.insertSheet("ProjectTemplates");
    templatesSheet.appendRow(["ID", "NomeModelo", "DescricaoModelo", "TarefasJson"]);
    Logger.log("Aba 'ProjectTemplates' criada com cabeçalhos.");
  }

  var headers = templatesSheet.getRange(1, 1, 1, templatesSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = templatesSheet.getLastRow();
  var newId = lastRow > 0 ? templatesSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  templateData.ID = newId;

  headers.forEach(function(header) {
    if (header === "TarefasJson" && templateData.Tarefas) {
      newRow.push(JSON.stringify(templateData.Tarefas));
    } else {
      newRow.push(templateData[header] || "");
    }
  });
  templatesSheet.appendRow(newRow);
  return { success: true, message: "Modelo de projeto criado com sucesso.", templateId: newId };
}

function getProjectTemplateById(templateId) {
  var templatesSheet = SpreadsheetService.getSheetByName("ProjectTemplates");
  if (!templatesSheet) {
    return null;
  }

  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == templateId) {
      var template = {};
      headers.forEach(function(header, index) {
        template[header] = data[i][index];
      });
      if (template.TarefasJson) {
        template.Tarefas = JSON.parse(template.TarefasJson);
        delete template.TarefasJson;
      }
      return template;
    }
  }
  return null;
}

function getAllProjectTemplates() {
  var templatesSheet = SpreadsheetService.getSheetByName("ProjectTemplates");
  if (!templatesSheet) {
    return [];
  }

  var data = templatesSheet.getDataRange().getValues();
  var headers = data[0];
  var templates = [];

  for (var i = 1; i < data.length; i++) {
    var template = {};
    headers.forEach(function(header, index) {
      template[header] = data[i][index];
    });
    if (template.TarefasJson) {
      template.Tarefas = JSON.parse(template.TarefasJson);
      delete template.TarefasJson;
    }
    templates.push(template);
  }
  return templates;
}
