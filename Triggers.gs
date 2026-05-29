// Triggers.gs
/**
 * @overview Módulo para configuração e gerenciamento de gatilhos nativos do Google Apps Script.
 *           Permite a criação programática de gatilhos baseados em tempo e eventos,
 *           automatizando tarefas como atualizações periódicas e notificações.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectStatusUpdater.gs: Para funções de atualização de status de projeto.
 *   - TaskStatusUpdater.gs: Para funções de atualização de status de tarefa.
 *   - NotificationService.gs: Para funções de envio de notificações.
 *
 * @integrations
 *   - Google Apps Script Triggers: Automação de tarefas.
 *
 * @description
 *   Este módulo é responsável por configurar e gerenciar os gatilhos do Google Apps Script.
 *   Ele pode criar gatilhos baseados em tempo (por exemplo, a cada hora, diariamente) para
 *   executar funções específicas, como a atualização automática do status de projetos e tarefas,
 *   ou o envio de notificações. Também pode gerenciar gatilhos baseados em eventos, como
 *   edições na planilha, embora o foco inicial seja em gatilhos de tempo para automação.
 */

function createTimeDrivenTriggers() {
  // Remove todos os gatilhos existentes para evitar duplicatas
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }

  // Gatilho para atualizar o status do projeto a cada hora
  ScriptApp.newTrigger("ProjectStatusUpdater.updateAllProjectStatuses")
      .timeBased()
      .everyHours(1)
      .create();
  Logger.log("Gatilho de atualização de status de projeto criado.");

  // Gatilho para enviar notificações diárias (ex: tarefas atrasadas)
  ScriptApp.newTrigger("NotificationService.sendDailyReminders")
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();
  Logger.log("Gatilho de lembretes diários criado.");

  // Gatilho para backup de dados da planilha a cada 6 horas
  ScriptApp.newTrigger("DataBackup.backupSpreadsheetData")
      .timeBased()
      .everyHours(6)
      .create();
  Logger.log("Gatilho de backup de dados criado.");
}

function deleteTimeDrivenTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getEventType() == ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }
  Logger.log("Todos os gatilhos baseados em tempo foram deletados.");
}
