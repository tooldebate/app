// AuthenticationService.gs
/**
 * @overview Módulo de serviço de autenticação de alto nível para o sistema de gestão agentica.
 *           Orquestra o processo de login, logout e verificação de sessão, utilizando
 *           módulos de baixo nível como Auth.gs e SessionManagement.gs.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para a lógica principal de autenticação.
 *   - SessionManagement.gs: Para gerenciar o estado da sessão.
 *   - Logger.gs: Para registrar eventos de autenticação.
 *   - ErrorHandling.gs: Para tratamento de erros.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de credenciais de usuário.
 *
 * @description
 *   Este módulo atua como uma fachada para as operações de autenticação, fornecendo
 *   uma interface simplificada para o frontend e outros módulos do sistema. Ele
 *   coordena as chamadas para `Auth.gs` para validar credenciais e para
 *   `SessionManagement.gs` para persistir o estado do usuário. Isso garante que
 *   o processo de autenticação seja robusto, seguro e fácil de usar em toda a aplicação.
 */

function loginUser(email, password) {
  return ErrorHandling.tryCatch(function() {
    var result = Auth.doLogin(email, password);
    if (result.success) {
      Logger.log("INFO", `Usuário ${email} logado com sucesso.`);
    } else {
      Logger.log("WARN", `Falha no login para ${email}: ${result.message}`);
    }
    return result;
  }, "loginUser");
}

function logoutUser() {
  return ErrorHandling.tryCatch(function() {
    var result = Auth.doLogout();
    Logger.log("INFO", "Usuário deslogado.");
    return result;
  }, "logoutUser");
}

function getCurrentUserSession() {
  return ErrorHandling.tryCatch(function() {
    return Auth.getSessionUser();
  }, "getCurrentUserSession");
}

function checkUserPermissions(requiredRole) {
  return ErrorHandling.tryCatch(function() {
    return Permissions.hasPermission(requiredRole);
  }, "checkUserPermissions");
}
