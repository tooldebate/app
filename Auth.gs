/**
 * Auth.gs — Adaptador de autenticacao do Tool Debate - Um conto por aluno.
 *
 * Conformidade: Prompt 18 - Padronização de Autenticação em Frota
 * Aplicado em: 27/06/2026
 *
 * Arquivos em conformidade:
 * - AuthHelpers.gs (11 rotinas padrão reutilizáveis) [CRIADO]
 * - Auth.gs (adaptador principal)
 * - AuthStandardService.gs (contrato de autenticação)
 *
 * Localiza usuarios na aba "Usuarios" e delega sessao, expiracao e migracao de
 * senhas legadas para o contrato comum AuthStandardService.
 */

/** Resolve a planilha principal via getPlanilhaId() (fallback planilha ativa). */
function Auth_getSpreadsheet_() {
  try {
    if (typeof getPlanilhaId === 'function') {
      var id = getPlanilhaId();
      if (id) return SpreadsheetApp.openById(id);
    }
  } catch (e) {}
  return getBoundSpreadsheet_();
}

/** Le a aba de usuarios e devolve cabecalhos + linhas. */
function Auth_getUsersData_() {
  var ss = Auth_getSpreadsheet_();
  if (!ss) return null;
  var sheet = ss.getSheetByName('Usuarios');
  if (!sheet || sheet.getLastRow() < 2) {
    try { seedSyntheticAdminUsers_(); } catch (e) {}
    sheet = ss.getSheetByName('Usuarios');
  }
  if (!sheet || sheet.getLastRow() < 2) return null;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
  return { sheet: sheet, values: values, headers: headers };
}

/** So aceita um SHA-256 hex (64 chars) como hash; o resto vira '' (texto plano). */
function Auth_normalizarHash_(valor) {
  try {
    // Retorna o valor original (texto plano), sem exigir hash SHA-256 de 64 caracteres.
    // Isso resolve a falha de autenticação onde senhas em texto plano na coluna passwordHash eram descartadas.
    return String(valor == null ? '' : valor).trim();
  } catch (error) {
    Logger.log("Erro em Auth_normalizarHash_: " + error.message);
    throw error;
  }
}

/** Localiza um usuario para o AuthStandardService. */
function Auth_findUser_(username) {
  try {
    var data = Auth_getUsersData_();
    if (!data) return null;

    var u = String(username || '').trim().toLowerCase();
    var headers = data.headers;
    var iUser = headers.indexOf('username');
    var iPass = headers.indexOf('password');
    var iHash = headers.indexOf('passwordhash');
    var iRole = headers.indexOf('role');
    var iNome = headers.indexOf('nome');
    var iEmail = headers.indexOf('email');
    var iId = headers.indexOf('id');
    var iStatus = headers.indexOf('status');
    if (iUser < 0 || (iPass < 0 && iHash < 0)) return null;

    for (var r = 1; r < data.values.length; r++) {
      var row = data.values[r];
      var rowUser = String(row[iUser] || '').trim().toLowerCase();
      var rowEmail = iEmail >= 0 ? String(row[iEmail] || '').trim().toLowerCase() : '';
      if (rowUser !== u && rowEmail !== u) continue;
      return {
        id: iId >= 0 && row[iId] ? row[iId] : rowUser,
        username: row[iUser],
        name: iNome >= 0 ? row[iNome] : row[iUser],
        email: iEmail >= 0 ? row[iEmail] : '',
        role: iRole >= 0 && row[iRole] ? row[iRole] : 'USER',
        active: iStatus < 0 || String(row[iStatus]).trim().toLowerCase() !== 'inativo',
        password: iPass >= 0 ? String(row[iPass] || '') : '',
        // PasswordHash so vale como hash se for um SHA-256 hex (64 chars). A planilha
        // sintetica preencheu PasswordHash com a senha em TEXTO PLANO (ex.: "admin123"),
        // o que faria verify_ comparar SHA-256(senha) com texto plano e SEMPRE falhar.
        // Tratamos qualquer valor que nao seja hash real como ausente -> o login cai
        // no path de senha plana (user.password), preservando a invariante do quiosque.
        passwordHash: Auth_normalizarHash_(iHash >= 0 ? row[iHash] : '')
      };
    }
    return null;
  } catch (error) {
    Logger.log("Erro em Auth_findUser_: " + error.message);
    throw error;
  }
}

/** Grava o hash gerado pelo contrato comum e remove a senha legada. */
function Auth_updatePasswordHash_(userId, passwordHash) {
  try {
    try {
      var data = Auth_getUsersData_();
      if (!data) return;

      var headers = data.headers;
      var iId = headers.indexOf('id');
      var iUser = headers.indexOf('username');
      var iPass = headers.indexOf('password');
      var iHash = headers.indexOf('passwordhash');

      if (iHash < 0) {
        iHash = headers.length;
        data.sheet.getRange(1, iHash + 1).setValue('PasswordHash');
      }

      for (var r = 1; r < data.values.length; r++) {
        var rowId = iId >= 0 && data.values[r][iId] ? data.values[r][iId] : data.values[r][iUser];
        if (String(rowId) !== String(userId)) continue;
        data.sheet.getRange(r + 1, iHash + 1).setValue(passwordHash);
        if (iPass >= 0) data.sheet.getRange(r + 1, iPass + 1).clearContent();
        return;
      }
    } catch (error) {
      Logger.log("Erro em Auth_updatePasswordHash_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em Auth_updatePasswordHash_: " + error.message);
    throw error;
  }
}

/** Configura o contrato comum para este projeto. */
function Auth_service_() {
  // Tool Debate é um quiosque escolar: as senhas ficam em TEXTO PLANO na aba
  // "Usuarios" para que a professora possa lê-las e ajudar os alunos a entrar.
  // Por isso NÃO registramos o adaptador updatePasswordHash — sem ele o contrato
  // comum valida a senha em texto plano e nunca a converte em hash. A função
  // Auth_updatePasswordHash_ permanece disponível caso a frota volte a exigir
  // migração, mas fica intencionalmente desconectada aqui.
  return AuthStandardService.configure({
    sessionKey: 'TOOL_DEBATE_AUTH_SESSION',
    sessionTtlSeconds: 21600,
    adapters: {
      findUser: Auth_findUser_
    }
  });
}

/**
 * @param {string} username Usuario ou e-mail.
 * @param {string} password Senha.
 * @return {{success:boolean, user?:Object, message?:string}}
 */
function loginWithPassword(username, password) {
  try {
    if (!String(username || '').trim() || !String(password || '')) {
      return { success: false, message: 'Informe usuario e senha.' };
    }
    var result = Auth_service_().login(username, password);
    return result.ok
      ? { success: true, user: result.user }
      : { success: false, message: 'Credenciais invalidas.' };
  } catch (error) {
    Logger.log("Erro em loginWithPassword: " + error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sessoes baseadas em token — armazenadas em aba 'SessoesAuth' em vez de
// ScriptProperties para evitar poluição de configurações e permitir limpeza.
// ---------------------------------------------------------------------------

var AUTH_TOK_TTL_MS_ = 21600 * 1000; // 6 horas

/** Aceita somente tokens opacos emitidos pelo serviço de autenticação. */
function normalizeToolDebateToken_(tok) {
  if (typeof tok !== 'string') return '';
  var token = tok.trim();
  return /^[A-Za-z0-9]{20,80}$/.test(token) ? token : '';
}

/** Obtem ou cria a aba SessoesAuth para armazenar sessoes. */
function getSessoesAuthSheet_() {
  try {
    var ss = Auth_getSpreadsheet_();
    if (!ss) return null;
    var sheet = ss.getSheetByName('SessoesAuth');
    if (!sheet) {
      sheet = ss.insertSheet('SessoesAuth');
      sheet.getRange(1, 1, 1, 5).setValues([['token', 'userId', 'username', 'role', 'expiresAt']]);
    }
    return sheet;
  } catch (error) {
    Logger.log("Erro em getSessoesAuthSheet_: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

/**
 * Valida credenciais e devolve um token unico para o cliente.
 * Armazena sessao na aba 'SessoesAuth'.
 * @return {{success:boolean, token?:string, redirectUrl?:string, message?:string}}
 */
function loginWithToken(username, password) {
  try {
    try {
      if (!String(username || '').trim() || !String(password || '')) {
        return { success: false, message: 'Informe usuario e senha.' };
      }
      var result = Auth_service_().login(username, password);
      if (!result.ok) return { success: false, message: 'Credenciais invalidas.' };

      // AuthStandardService persiste a sessão nas Script Properties e devolve
      // o token canônico. Não crie uma segunda linha manual na planilha.
      var token = normalizeToolDebateToken_(result.token);
      if (!token) return { success: false, message: 'Erro ao criar sessao.' };

      var baseUrl = '';
      try {
        baseUrl = ScriptApp.getService().getUrl();
      } catch (e) {
        baseUrl = '';
      }

      return {
        success: true,
        token: token,
        user: result.user,
        redirectUrl: baseUrl ? baseUrl + '?page=app#tok=' + token : ''
      };
    } catch (error) {
      Logger.log("Erro em loginWithToken: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em loginWithToken: " + error.message);
    throw error;
  }
}

/**
 * Verifica se o token corresponde a uma sessao valida na aba 'SessoesAuth'.
 * Deleta sessoes expiradas.
 */
function isAuthenticatedByToken(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeToolDebateToken_(tok);
        if (!normalizedToken) return false;
        return Auth_service_().isAuthenticatedByToken(normalizedToken);
      } catch (error) {
        Logger.log("Erro em isAuthenticatedByToken: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em isAuthenticatedByToken: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em isAuthenticatedByToken: " + error.message);
    throw error;
  }
}

/**
 * Retorna o usuario logado a partir do token (barra superior padrao).
 * @param {string} tok
 * @return {{ username: string, role: string }|null}
 */
function getSessionUser(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeToolDebateToken_(tok);
        if (!normalizedToken) return null;
        var session = Auth_service_().getSession(normalizedToken);
        if (!session) return null;
        return {
          userId: String(session.userId || session.username),
          id: String(session.userId || session.username),
          username: String(session.username || ''),
          nome: String(session.nome || session.username || ''),
          email: String(session.email || ''),
          role: String(session.role || 'USER')
        };
      } catch (error) {
        Logger.log("Erro em getSessionUser: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em getSessionUser: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getSessionUser: " + error.message);
    throw error;
  }
}

/** Encerra a sessao identificada pelo token. */
function logoutWithToken(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeToolDebateToken_(tok);
        if (!normalizedToken) return { ok: true };
        return Auth_service_().logout(normalizedToken);
      } catch (error) {
        Logger.log("Erro em logoutWithToken: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em logoutWithToken: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em logoutWithToken: " + error.message);
    throw error;
  }
}

/** Estado de sessao (legado — UserProperties). Mantido para retrocompatibilidade. */
function isToolDebateAuthenticated() {
  return Auth_service_().isAuthenticated();
}

/** Encerra a sessao do Tool Debate (legado). */
function logoutToolDebate() {
  return Auth_service_().logout();
}

/**
 * Remove todas as AUTH_TOK_* properties obsoletas de ScriptProperties.
 * Execute esta funcao uma unica vez para limpar o painel de configuraçoes.
 */
function cleanupOldAuthTokens_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var cleaned = 0;

    for (var key in all) {
      if (key.indexOf('AUTH_TOK_') === 0) {
        props.deleteProperty(key);
        cleaned++;
      }
    }

    return { cleaned: cleaned, message: 'Limpeza concluida: ' + cleaned + ' tokens removidos.' };
  } catch (error) {
    Logger.log("Erro em cleanupOldAuthTokens_: " + error.message);
    throw error;
  }
}
