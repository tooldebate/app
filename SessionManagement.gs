// SessionManagement.gs
/**
 * @overview Módulo para gerenciar sessões de usuário no sistema de gestão agentica.
 *           Armazena e recupera informações da sessão do usuário usando o serviço de propriedades do Apps Script.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar eventos de sessão.
 *
 * @integrations
 *   - Google Apps Script PropertiesService: Armazenamento de dados de sessão.
 *
 * @description
 *   Este módulo é responsável por manter o estado da sessão do usuário logado.
 *   Ele utiliza o `PropertiesService` do Google Apps Script para armazenar informações
 *   da sessão (como ID do usuário, e-mail e papel) de forma segura. Isso permite que
 *   o sistema mantenha o usuário autenticado entre diferentes requisições e páginas,
 *   sem a necessidade de reautenticação constante. As funções incluem criar, obter
 *   e limpar a sessão.
 */

var USER_PROPERTIES = PropertiesService.getUserProperties();

function createSession(userId, userEmail, userRole) {
  USER_PROPERTIES.setProperty("userId", userId);
  USER_PROPERTIES.setProperty("userEmail", userEmail);
  USER_PROPERTIES.setProperty("userRole", userRole);
  Logger.log(`Sessão criada para o usuário: ${userEmail} (${userId}) com papel: ${userRole}`);
}

function getSession() {
  var userId = USER_PROPERTIES.getProperty("userId");
  var userEmail = USER_PROPERTIES.getProperty("userEmail");
  var userRole = USER_PROPERTIES.getProperty("userRole");

  if (userId && userEmail && userRole) {
    return { id: userId, email: userEmail, role: userRole };
  }
  return null;
}

function clearSession() {
  USER_PROPERTIES.deleteProperty("userId");
  USER_PROPERTIES.deleteProperty("userEmail");
  USER_PROPERTIES.deleteProperty("userRole");
  Logger.log("Sessão do usuário limpa.");
}
