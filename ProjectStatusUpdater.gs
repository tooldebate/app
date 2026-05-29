// ProjectStatusUpdater.gs
/**
 * @overview Módulo para atualização automática do status de projetos.
 *           Contém funções que verificam as datas de início e fim dos projetos
 *           e atualizam seus status na Google Planilha.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter e atualizar dados de projetos.
 *   - Logger.gs: Para registrar as atualizações de status.
 *
 * @integrations
 *   - Google Sheets: Armazenamento e atualização de status de projetos.
 *   - Google Apps Script Triggers: Acionado por gatilhos baseados em tempo.
 *
 * @description
 *   Este módulo automatiza a gestão do ciclo de vida dos projetos. Ele é projetado
 *   para ser executado periodicamente por um gatilho de tempo, verificando a data
 *   atual em relação às datas de início e fim de cada projeto. Com base nessa
 *   comparação, o status do projeto é automaticamente atualizado para 'Ativo',
 *   'Concluído' ou 'Atrasado', garantindo que as informações do projeto estejam
 *   sempre atualizadas sem intervenção manual.
 */

function updateAllProjectStatuses() {
  Logger.log("Iniciando atualização automática de status de projetos.");
  var allProjects = ProjectManagement.getAllProjects();
  var today = new Date();
  var updatedCount = 0;

  allProjects.forEach(function(project) {
    var projectStartDate = project.DataInicio ? new Date(project.DataInicio) : null;
    var projectEndDate = project.DataFim ? new Date(project.DataFim) : null;
    var currentStatus = project.Status;
    var newStatus = currentStatus;

    if (projectStartDate && today >= projectStartDate && currentStatus === "Pendente") {
      newStatus = "Ativo";
    } else if (projectEndDate && today > projectEndDate && currentStatus !== "Concluído") {
      newStatus = "Atrasado";
    } else if (projectEndDate && today <= projectEndDate && currentStatus === "Atrasado") {
      // Se o projeto estava atrasado mas a data de fim foi ajustada para o futuro
      newStatus = "Ativo";
    }

    if (newStatus !== currentStatus) {
      ProjectManagement.updateProject(project.ID, { Status: newStatus });
      Logger.log(`Status do Projeto ID ${project.ID} (${project.NomeProjeto}) atualizado de ${currentStatus} para ${newStatus}.`);
      updatedCount++;
    }
  });
  Logger.log(`Atualização automática de status de projetos concluída. ${updatedCount} projetos atualizados.`);
  return { success: true, updatedCount: updatedCount };
}
