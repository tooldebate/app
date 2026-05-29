// TaskStatusUpdater.gs
/**
 * @overview Módulo para atualização automática do status de tarefas.
 *           Verifica os prazos das tarefas e atualiza seus status na Google Planilha.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - TaskManagement.gs: Para obter e atualizar dados de tarefas.
 *   - Logger.gs: Para registrar as atualizações de status.
 *
 * @integrations
 *   - Google Sheets: Armazenamento e atualização de status de tarefas.
 *   - Google Apps Script Triggers: Acionado por gatilhos baseados em tempo.
 *
 * @description
 *   Este módulo automatiza a gestão do ciclo de vida das tarefas. Ele é projetado
 *   para ser executado periodicamente por um gatilho de tempo, verificando a data
 *   atual em relação ao prazo de cada tarefa. Com base nessa comparação, o status
 *   da tarefa é automaticamente atualizado para 'Atrasada' se o prazo for excedido
 *   e a tarefa ainda não estiver concluída. Isso ajuda a manter a visibilidade
 *   sobre o progresso das tarefas e a identificar gargalos.
 */

function updateAllTaskStatuses() {
  Logger.log("Iniciando atualização automática de status de tarefas.");
  var allTasks = TaskManagement.getTasksByProjectId(""); // Obter todas as tarefas
  var today = new Date();
  var updatedCount = 0;

  allTasks.forEach(function(task) {
    var taskDueDate = task.Prazo ? new Date(task.Prazo) : null;
    var currentStatus = task.Status;
    var newStatus = currentStatus;

    if (taskDueDate && today > taskDueDate && currentStatus !== "Concluída") {
      newStatus = "Atrasada";
    }

    if (newStatus !== currentStatus) {
      TaskManagement.updateTask(task.ID, { Status: newStatus });
      Logger.log(`Status da Tarefa ID ${task.ID} (${task.Descricao}) atualizado de ${currentStatus} para ${newStatus}.`);
      updatedCount++;
    }
  });
  Logger.log(`Atualização automática de status de tarefas concluída. ${updatedCount} tarefas atualizadas.`);
  return { success: true, updatedCount: updatedCount };
}
