/**
 * Cria rascunho de follow-up automático no Gmail para tarefas pendentes, sugerido por Gemini.
 * @param {string} taskId
 * @param {string} userId
 * @returns {string} draftId
 */
function createFollowUpDraft(taskId, userId) {
  var task = TaskManagement.getTaskById(taskId);
  if (!task) throw new Error('Tarefa não encontrada.');
  var destinatario = UserManagement.getUserById(task.ResponsavelID).Email;
  var assunto = 'Follow-up: ' + task.Descricao;
  var corpoSugestao = GeminiChatService.suggestFollowUp(task.Descricao, task.Prazo);
  var draft = GmailApp.createDraft(destinatario, assunto, corpoSugestao);
  return draft.getId();
}
/**
 * Cria tarefa automaticamente a partir de e-mail encaminhado, usando Gemini para extrair dados relevantes.
 * @param {string} emailId - ID da mensagem do Gmail
 * @param {string} userId - Usuário responsável
 * @returns {Object} Dados da tarefa criada
 */
function createTaskFromEmail(emailId, userId) {
  var message = GmailApp.getMessageById(emailId);
  var subject = message.getSubject();
  var body = message.getPlainBody();
  // Usa Gemini para extrair resumo, prazo e prioridade
  var geminiResult = GeminiChatService.extractTaskData(subject + '\n' + body);
  var descricao = geminiResult.summary || subject;
  var prazo = geminiResult.deadline || '';
  var prioridade = geminiResult.priority || 'Normal';
  // Cria tarefa
  var task = {
    Descricao: descricao,
    Prazo: prazo,
    Prioridade: prioridade,
    ResponsavelID: userId,
    Origem: 'Email',
    EmailId: emailId
  };
  // Salva tarefa (supondo função addTask)
  TaskManagement.addTask(task);
  return task;
}
// TaskManagement.gs
/**
 * @overview Módulo de gerenciamento de tarefas para o sistema de gestão agentica.
 *           Contém funções CRUD (Criar, Ler, Atualizar, Deletar) para tarefas associadas a projetos na Google Planilha.
 *           Permissões são baseadas no papel do usuário e na sua associação ao projeto/tarefa.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Auth.gs: Para verificar permissões de usuário.
 *   - Logger.gs: Para registrar operações de gerenciamento de tarefas.
 *   - DataValidation.gs: Para validar dados de entrada da tarefa.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de tarefas.
 *
 * @description
 *   Este módulo permite a criação, visualização, edição e exclusão de tarefas.
 *   Administradores têm controle total. Funcionários podem gerenciar tarefas
 *   aos quais estão atribuídos ou que pertencem a projetos que eles gerenciam.
 *   As funções garantem a integridade dos dados e o controle de acesso, ligando
 *   as tarefas aos seus respectivos projetos.
 */

function createTask(taskData) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  // Apenas administradores ou o responsável pelo projeto podem criar tarefas
  // TODO: Adicionar verificação se o usuário é responsável pelo projeto
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem criar tarefas.");
  }
  if (!DataValidation.validateTask(taskData)) {
    throw new Error("Dados de tarefa inválidos.");
  }

  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var headers = tasksSheet.getRange(1, 1, 1, tasksSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  var lastRow = tasksSheet.getLastRow();
  var newId = lastRow > 0 ? tasksSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  taskData.ID = newId;

  headers.forEach(function(header) {
    newRow.push(taskData[header] || "");
  });
  tasksSheet.appendRow(newRow);
  Logger.log(`Tarefa criada: ${taskData.Descricao} no Projeto ID ${taskData.ProjetoID} por ${session.email}`);
  return { success: true, message: "Tarefa criada com sucesso.", id: newId };
}

function getTaskById(id) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var data = tasksSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");
  var responsibleCol = headers.indexOf("ResponsavelID");
  var projectIDCol = headers.indexOf("ProjetoID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var task = {};
      headers.forEach(function(header, index) {
        task[header] = data[i][index];
      });
      // Apenas administradores, o responsável pela tarefa ou o responsável pelo projeto podem ver detalhes
      // TODO: Adicionar verificação se o usuário é responsável pelo projeto da tarefa
      if (isAdmin() || task.ResponsavelID == session.id) {
        return task;
      } else {
        throw new Error("Acesso negado. Você não tem permissão para visualizar esta tarefa.");
      }
    }
  }
  return null;
}

function getTasksByProjectId(projectId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var data = tasksSheet.getDataRange().getValues();
  var headers = data[0];
  var projectIDCol = headers.indexOf("ProjetoID");
  var responsibleCol = headers.indexOf("ResponsavelID");
  var tasks = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][projectIDCol] == projectId) {
      var task = {};
      headers.forEach(function(header, index) {
        task[header] = data[i][index];
      });
      // Administradores veem todas, funcionários veem apenas as suas ou as do seu projeto
      // TODO: Adicionar verificação se o usuário é responsável pelo projeto
      if (isAdmin() || task.ResponsavelID == session.id) {
        tasks.push(task);
      }
    }
  }
  return tasks;
}

function updateTask(id, updates) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  // Apenas administradores ou o responsável pela tarefa podem atualizar
  // TODO: Adicionar verificação se o usuário é responsável pelo projeto da tarefa
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem atualizar tarefas.");
  }
  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var data = tasksSheet.getDataRange().getValues();
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
      tasksSheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      Logger.log(`Tarefa atualizada: ID ${id} por ${session.email}`);
      return { success: true, message: "Tarefa atualizada com sucesso." };
    }
  }
  throw new Error("Tarefa não encontrada.");
}

function deleteTask(id) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem deletar tarefas.");
  }
  var tasksSheet = SpreadsheetService.getSheetByName("Tarefas");
  var data = tasksSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      tasksSheet.deleteRow(i + 1);
      Logger.log(`Tarefa deletada: ID ${id} por ${SessionManagement.getSession().email}`);
      return { success: true, message: "Tarefa deletada com sucesso." };
    }
  }
  throw new Error("Tarefa não encontrada.");
}
