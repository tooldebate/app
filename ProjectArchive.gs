// ProjectArchive.gs
/**
 * @overview Módulo para arquivamento de projetos concluídos no sistema de gestão agentica.
 *           Contém funções para mover projetos para um status de arquivado ou para uma aba separada,
 *           mantendo o histórico mas removendo-os da visualização ativa.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para atualizar o status do projeto.
 *   - Logger.gs: Para registrar operações de arquivamento.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de projetos.
 *
 * @description
 *   Este módulo permite que administradores arquivem projetos que foram concluídos
 *   ou que não estão mais ativos. O arquivamento ajuda a manter a lista de projetos
 *   ativos organizada e relevante, enquanto ainda preserva o histórico completo
 *   dos projetos para referência futura. Os projetos arquivados podem ser movidos
 *   para uma aba específica na Google Planilha ou ter seu status alterado para
 *   "Arquivado", dependendo da estratégia de implementação.
 */

function archiveProject(projectId) {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem arquivar projetos.");
  }
  Logger.log(`Tentativa de arquivar Projeto ID: ${projectId} por ${SessionManagement.getSession().email}`);

  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  if (project.Status === "Concluído") {
    ProjectManagement.updateProject(projectId, { Status: "Arquivado" });
    Logger.log(`Projeto ID ${projectId} (${project.NomeProjeto}) arquivado com sucesso.`);
    return { success: true, message: "Projeto arquivado com sucesso." };
  } else {
    throw new Error("Apenas projetos com status 'Concluído' podem ser arquivados.");
  }
}

function getArchivedProjects() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem visualizar projetos arquivados.");
  }
  var allProjects = ProjectManagement.getAllProjects();
  return allProjects.filter(function(project) { return project.Status === "Arquivado"; });
}

}
