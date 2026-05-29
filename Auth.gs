// Auth.gs
/**
 * @overview Módulo de autenticação e autorização para o sistema de gestão agentica.
 *           Contém funções para login de usuário, registro (se aplicável) e verificação de sessão.
 *           As credenciais são validadas contra a aba 'Usuários' da Google Planilha.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - SessionManagement.gs: Para gerenciar sessões de usuário.
 *   - Logger.gs: Para registrar eventos de login e segurança.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de credenciais de usuário.
 *
 * @description
 *   Este módulo é responsável por toda a lógica de autenticação. Ele recebe as credenciais
 *   do usuário, verifica sua validade na planilha de usuários e, em caso de sucesso,
 *   estabelece uma sessão para o usuário. Também inclui funções para logout e para
 *   verificar se um usuário está autenticado e possui as permissões necessárias para
 *   acessar determinadas funcionalidades.
 */

function doLogin(email, password) {
  // Implementação da lógica de login
  // 1. Buscar usuário na planilha 'Usuários' pelo email.
  // 2. Comparar a senha fornecida com a senha armazenada (em texto plano, conforme solicitado).
  // 3. Se as credenciais forem válidas, criar uma sessão para o usuário.
  // 4. Registrar o evento de login no Logger.gs.
  // Retornar sucesso/falha e o papel do usuário.
  Logger.log(`Tentativa de login para: ${email}`);
  var usersSheet = SpreadsheetService.getSheetByName('Usuários');
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('Email');
  var passwordCol = headers.indexOf('Senha');
  var roleCol = headers.indexOf('Role');
  var activeCol = headers.indexOf('Ativo');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[emailCol] === email && row[passwordCol] === password && row[activeCol] === true) {
      SessionManagement.createSession(row[0], row[emailCol], row[roleCol]); // row[0] is ID
      Logger.log(`Login bem-sucedido para: ${email} com papel: ${row[roleCol]}`);
      return { success: true, role: row[roleCol] };
    }
  }
  Logger.log(`Falha no login para: ${email}`);
  return { success: false, message: 'Email ou senha inválidos.' };
}

function doLogout() {
  SessionManagement.clearSession();
  Logger.log('Usuário deslogado.');
  return { success: true };
}

function getSessionUser() {
  return SessionManagement.getSession();
}

function isAdmin() {
  var session = SessionManagement.getSession();
  return session && session.role === 'Administrador';
}

function isEmployee() {
  var session = SessionManagement.getSession();
  return session && session.role === 'Funcionário';
}

function checkAuthentication() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  return session;
}
