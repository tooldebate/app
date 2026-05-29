// UserActivityTracker.gs
/**
 * @overview Módulo para rastreamento da atividade do usuário no sistema de gestão agentica.
 *           Registra ações importantes realizadas pelos usuários na aba 'Logs' da Google Planilha.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar as atividades.
 *   - SessionManagement.gs: Para obter informações do usuário logado.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de logs de atividade.
 *
 * @description
 *   Este módulo é responsável por registrar as ações dos usuários no sistema, fornecendo
 *   um histórico detalhado de quem fez o quê e quando. Isso é fundamental para auditoria,
 *   segurança e para entender como o sistema está sendo utilizado. As atividades registradas
 *   incluem criação, atualização e exclusão de usuários, projetos, tarefas e avaliações.
 */

function trackActivity(action, details) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var userEmail = session ? session.email : 'N/A';
  Logger.log(`ACTIVITY - Usuário: ${userEmail} (ID: ${userId}) - Ação: ${action} - Detalhes: ${details}`);
}

// Exemplos de uso em outros módulos:
// UserManagement.gs:
//   Logger.trackActivity("CREATE_USER", `Usuário ${userData.Email} criado.`);
// ProjectManagement.gs:
//   Logger.trackActivity("UPDATE_PROJECT", `Projeto ID ${id} atualizado.`);
