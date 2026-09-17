/**
 * AccessControl.gs — Controle de acesso a operações privilegiadas (server-side).
 *
 * Boas práticas aplicadas:
 *   - Identidade verificada no backend via Session.getActiveUser() (não confiar só na UI).
 *   - Allowlist de administradores lida de Script Properties (ADMIN_EMAILS / allowedEmails),
 *     mantendo credenciais e configuração fora do código-fonte.
 *   - Correlação por requestId em cada verificação, para auditoria/observabilidade.
 *   - Contrato de retorno padronizado (StandardReturn) coerente com o restante do projeto.
 *
 * Política migration-safe: se nenhuma allowlist estiver configurada, a verificação NÃO
 * bloqueia (apenas sinaliza authzConfigured:false), evitando travar ambientes ainda não
 * configurados. Uma vez definido ADMIN_EMAILS, as operações privilegiadas passam a exigi-lo.
 */

var ACCESS_CONTROL_ADMIN_PROPS = ['ADMIN_EMAILS', 'ADMIN_EMAIL', 'allowedEmails'];

/** @return {string} E-mail do usuário ativo (vazio se indisponível). */
function getCurrentUserEmail() {
  try {
    var user = Session.getActiveUser();
    return (user && user.getEmail()) ? String(user.getEmail()).toLowerCase() : '';
  } catch (error) {
    return '';
  }
}

/** @return {boolean} Há um usuário autenticado no contexto atual. */
function isAuthenticated() {
  return getCurrentUserEmail() !== '';
}

/** @return {string} Identificador único de requisição para correlação/auditoria. */
function newRequestId_() {
  try { return Utilities.getUuid(); }
  catch (error) { return 'req-' + Date.now() + '-' + Math.floor(Math.random() * 1e6); }
}

/** @return {Array<string>} Lista de e-mails de administradores (Script Properties). */
function getAdminEmails_() {
  try {
    var props = PropertiesService.getScriptProperties();
    for (var i = 0; i < ACCESS_CONTROL_ADMIN_PROPS.length; i++) {
      var raw = props.getProperty(ACCESS_CONTROL_ADMIN_PROPS[i]);
      if (raw) {
        return String(raw).split(/[;,]/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      }
    }
  } catch (error) {}
  return [];
}

/** @return {boolean} Usuário atual é administrador (true também quando authz não configurada). */
function isCurrentUserAdmin() {
  var allowed = getAdminEmails_();
  if (!allowed.length) return true; // migration-safe
  return allowed.indexOf(getCurrentUserEmail()) !== -1;
}

/**
 * Verifica autorização para uma operação privilegiada.
 * @param {string} operation Nome da operação (para auditoria).
 * @return {{success:boolean, data:Object, error:(string|null)}} Envelope StandardReturn.
 */
function requireAdmin(operation) {
  var requestId = newRequestId_();
  var email = getCurrentUserEmail();
  var allowed = getAdminEmails_();
  if (allowed.length && allowed.indexOf(email) === -1) {
    return StandardReturn.fail(
      'FORBIDDEN: a operação "' + (operation || 'desconhecida') + '" requer um administrador autorizado.',
      { code: 'FORBIDDEN', operation: operation || '', requestId: requestId, user: email }
    );
  }
  return StandardReturn.ok({
    authorized: true,
    operation: operation || '',
    requestId: requestId,
    user: email,
    authzConfigured: allowed.length > 0
  });
}

/**
 * Variante que lança exceção quando o acesso é negado (estilo guard).
 * @param {string} operation Nome da operação.
 * @return {Object} Dados de autorização quando permitido.
 */
function assertAccess(operation) {
  var result = requireAdmin(operation);
  if (!result.success) {
    throw new Error(result.error || ('FORBIDDEN: ' + (operation || 'operação')));
  }
  return result.data;
}
