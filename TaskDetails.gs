// TaskDetails.gs
/**
 * @overview Módulo de backend para a página de detalhes de uma tarefa específica.
 *           Fornece funções para recuperar todas as informações relacionadas a uma tarefa,
 *           incluindo seu projeto pai e o responsável.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - TaskManagement.gs: Para obter os detalhes da tarefa.
 *   - ProjectManagement.gs: Para obter os detalhes do projeto pai.
 *   - UserManagement.gs: Para obter os detalhes do usuário responsável.
 *   - Auth.gs: Para verificar permissões de acesso.
 *   - Logger.gs: Para registrar acessos aos detalhes da tarefa.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para tarefas, projetos e usuários.
 *
 * @description
 *   Este módulo agrega todas as informações pertinentes a uma tarefa específica,
 *   permitindo que a interface de usuário exiba uma visão completa do status da tarefa,
 *   seu projeto associado e o membro da equipe responsável. Ele garante que apenas usuários
 *   com as permissões adequadas possam acessar esses detalhes, promovendo a transparência
 *   e a responsabilidade dentro da equipe.
 */

function getTaskDetails(taskId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  var task = TaskManagement.getTaskById(taskId);
  if (!task) {
    throw new Error("Tarefa não encontrada.");
  }

  // TaskManagement.getTaskById já faz uma verificação básica de permissão
  // mas podemos adicionar mais aqui se necessário, por exemplo, verificar se o usuário
  // faz parte da equipe do projeto.

  Logger.log(`Acessando detalhes da Tarefa ID ${taskId} por ${session.email}`);

  var project = ProjectManagement.getProjectById(task.ProjetoID);
  var responsibleUser = UserManagement.getUserById(task.ResponsavelID);

  return {
    task: task,
    project: project,
    responsibleUser: responsibleUser
  };
}
