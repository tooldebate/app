// Permissions.gs
/**
 * @overview Módulo de gerenciamento de permissões para o sistema de gestão agentica.
 *           Define e verifica as permissões dos usuários com base em seus papéis (roles).
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para obter o papel do usuário logado.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo centraliza a lógica de controle de acesso. Ele fornece funções para
 *   verificar se o usuário atualmente logado possui as permissões necessárias para
 *   executar uma determinada ação ou acessar um recurso. Isso é crucial para manter
 *   a segurança e a integridade do sistema, garantindo que apenas usuários autorizados
 *   possam realizar operações sensíveis ou visualizar informações restritas.
 */

function hasPermission(requiredRole) {
  var session = SessionManagement.getSession();
  if (!session) {
    return false; // Não autenticado
  }
  var userRole = session.role;

  if (requiredRole === 'Administrador') {
    return userRole === 'Administrador';
  } else if (requiredRole === 'Funcionário') {
    return userRole === 'Administrador' || userRole === 'Funcionário';
  }
  // Adicionar outras lógicas de permissão conforme necessário
  return false;
}

function requireAdmin() {
  if (!hasPermission('Administrador')) {
    throw new Error('Acesso negado. Permissão de Administrador necessária.');
  }
}

function requireEmployee() {
  if (!hasPermission('Funcionário')) {
    throw new Error('Acesso negado. Permissão de Funcionário necessária.');
  }
}

// Exemplo de permissão mais granular
function canEditProject(projectId) {
  var session = SessionManagement.getSession();
  if (!session) return false;
  if (isAdmin()) return true;

  // Verificar se o usuário é o responsável pelo projeto
  var project = ProjectManagement.getProjectById(projectId);
  return project && project.ResponsavelID == session.id;
}
