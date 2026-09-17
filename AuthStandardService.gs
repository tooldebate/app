/**
 * FROTA-17: contrato de autenticacao inspirado no Way To Go As Is.
 *
 * Sessoes sao baseadas em TOKEN armazenado em ScriptProperties (por instancia,
 * nao por usuario Google). Isso corrige o bug critico de deployments
 * "Execute as: Me": getUserProperties() pertence ao dono do script, entao
 * quando o desenvolvedor faz login durante testes a sessao fica salva e todos
 * os visitantes entram direto sem ver a tela de login.
 *
 * Fluxo correto:
 *   login() valida credenciais e devolve { ok, token, user }.
 *   O cliente passa o token na URL (?page=app#tok=<token>).
 *   doGet() chama isAuthenticatedByToken(tok) que le ScriptProperties.
 *   logout() / logoutToken() apaga a chave do token em ScriptProperties.
 *
 * Senhas sao SEMPRE comparadas em texto plano (quiosque escolar): nenhum hash e
 * calculado, gravado ou exigido em nenhum ponto do fluxo de autenticacao.
 */
var AuthStandardService = (function () {
  'use strict';
  var adapters_ = {};
  var config_ = {
    tokenPrefix: 'FLEET_AUTH_TOK_',
    sessionTtlSeconds: 21600
  };

  function configure(options) {
    options = options || {};
    adapters_ = options.adapters || adapters_;
    if (options.sessionKey)        config_.tokenPrefix = options.sessionKey + '_TOK_';
    if (options.tokenPrefix)       config_.tokenPrefix = options.tokenPrefix;
    if (options.sessionTtlSeconds) config_.sessionTtlSeconds = options.sessionTtlSeconds;
    return api;
  }

  /**
   * Autentica credenciais e, em caso de sucesso, emite um token de sessao
   * gravado em ScriptProperties.
   *
   * @return {{ ok: boolean, token?: string, user?: Object, message?: string }}
   */
    function login(username, password) {
    if (!username || !password || typeof adapters_.findUser !== 'function') {
      return { ok: false, message: 'Credenciais Invalidas' };
    }

    try {
      var user = adapters_.findUser(username);
      if (!user || user.active === false) {
        return { ok: false, message: 'Usuario nao encontrado' };
      }

      // Comparacao SEMPRE em texto plano (sem hash, sem conversoes)
      var stored = (user.password !== undefined && user.password !== null && user.password !== '')
        ? user.password
        : user.passwordHash;

      // Comparacao direta: texto plano === texto plano
      if (password !== stored) {
        return { ok: false, message: 'Senha incorreta' };
      }

      // Criar sessão
      var sessionToken = createSession_(user);
      
      return {
        ok: true,
        token: sessionToken,
        user: sanitizeUser_(user)
      };
    } catch (err) {
      Logger.log('Erro no login: ' + err.message);
      return { ok: false, message: 'Erro ao processar login' };
    }
  }

  /**
   * Verifica se um token (passado na URL) e valido e nao expirou.
   * Use este metodo em doGet() no lugar de isAuthenticated().
   *
   * @param  {string} token
   * @return {boolean}
   */
  function isAuthenticatedByToken(token) {
    return getSessionByToken_(token) !== null;
  }

  /**
   * Mantem retrocompatibilidade: retorna false sem token na mao.
   * Prefira isAuthenticatedByToken(token) quando o token estiver disponivel.
   */
  function isAuthenticated() {
    return false; // sem token na mao nao ha como saber — use isAuthenticatedByToken
  }

  function getUserRole(token) {
    var session = getSessionByToken_(token);
    return session ? session.role : null;
  }

  /**
   * Retorna dados publicos da sessao a partir do token, ou null.
   * Usado pela barra superior padrao (nome do usuario logado).
   * @return {{ username: string, role: string, userId: string }|null}
   */
  function getSession(token) {
    var session = getSessionByToken_(token);
    if (!session) return null;
    return {
      userId:   session.userId,
      username: session.username,
      role:     session.role,
      nome:     session.nome || session.username,
      email:    session.email || ''
    };
  }

  function checkPermission(required, token) {
    try {
      var session = getSessionByToken_(token);
      if (!session) return denied_();
      if (!required) return { ok: true, principal: session };
      var requiredList = Array.isArray(required) ? required : [required];
      var permissions = session.permissions || [];
      var allowed = requiredList.indexOf(session.role) >= 0 ||
        permissions.indexOf('*') >= 0 ||
        requiredList.some(function (permission) {
          return permissions.indexOf(permission) >= 0;
        });
      return allowed ? { ok: true, principal: session } : denied_();
    } catch (error) {
      Logger.log("Erro em checkPermission: " + error.message);
      throw error;
    }
  }

  /** Invalida o token de sessao em ScriptProperties. */
  function logout(token) {
    try {
      if (typeof token === 'string' && /^[A-Za-z0-9]{20,80}$/.test(token.trim())) {
        scriptProperties_().deleteProperty(config_.tokenPrefix + token.trim());
      }
      return { ok: true };
    } catch (error) {
      Logger.log("Erro em logout: " + error.message);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  function createSession_(user) {
    var now = now_();
    var session = {
      userId: String(user.id || user.username || user.email || '').trim(),
      username: String(user.username || user.email || '').trim(),
      role: String(user.role || 'USER').trim() || 'USER',
      nome: String(user.nome || user.name || user.username || '').trim(),
      email: String(user.email || '').trim(),
      issuedAt: now,
      expiresAt: now + (config_.sessionTtlSeconds * 1000)
    };
    if (!session.userId || !session.username || !isFinite(session.expiresAt)) {
      throw new Error('Usuario sem identificacao valida para criar sessao.');
    }
    var token = uuid_();
    if (typeof token !== 'string' || !/^[A-Za-z0-9]{20,80}$/.test(token)) {
      throw new Error('Nao foi possivel gerar um token de sessao valido.');
    }
    scriptProperties_().setProperty(config_.tokenPrefix + token, JSON.stringify(session));
    return token;
  }

  function sanitizeUser_(user) {
    return {
      id: String(user.id || user.username || user.email || ''),
      username: String(user.username || user.email || ''),
      nome: String(user.nome || user.name || user.username || ''),
      email: String(user.email || ''),
      role: String(user.role || 'USER')
    };
  }

  function getSessionByToken_(token) {
    try {
      if (typeof token !== 'string' || !/^[A-Za-z0-9]{20,80}$/.test(token.trim())) return null;
      token = token.trim();
      var raw = scriptProperties_().getProperty(config_.tokenPrefix + token);
      if (!raw) return null;
      try {
        var session = JSON.parse(raw);
        if (!session || typeof session !== 'object' || Array.isArray(session) ||
            !String(session.userId || '').trim() ||
            !isFinite(Number(session.expiresAt)) || Number(session.expiresAt) <= now_()) {
          scriptProperties_().deleteProperty(config_.tokenPrefix + token);
          return null;
        }
        return session;
      } catch (ignored) {
        scriptProperties_().deleteProperty(config_.tokenPrefix + token);
        return null;
      }
    } catch (error) {
      Logger.log("Erro em getSessionByToken_: " + error.message);
      throw error;
    }
  }

  function verify_(password, user) {
    // Comparacao SEMPRE em texto plano. A coluna passwordHash, quando presente,
    // guarda a senha em texto plano nas planilhas da frota (nunca um digest).
    var stored = (user.password !== undefined && user.password !== null && user.password !== '')
      ? user.password
      : user.passwordHash;
    if (stored === undefined || stored === null || stored === '') return false;
    return constantTimeEqual_(String(password), String(stored));
  }

  function constantTimeEqual_(left, right) {
    if (left.length !== right.length) return false;
    var difference = 0;
    for (var i = 0; i < left.length; i++) {
      difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return difference === 0;
  }

  function denied_() {
    return { ok: false, message: 'Acesso Negado' };
  }

  function uuid_() {
    try {
      if (adapters_.uuid) return adapters_.uuid();
      return typeof Utilities !== 'undefined'
        ? Utilities.getUuid().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    } catch (error) {
      Logger.log("Erro em uuid_: " + error.message);
      throw error;
    }
  }

  function scriptProperties_() {
    try {
      // Injeta um stub em testes; em producao usa PropertiesService.
      return adapters_.scriptProperties ||
        PropertiesService.getScriptProperties();
    } catch (error) {
      Logger.log("Erro em scriptProperties_: " + error.message);
      throw error;
    }
  }
  function now_() { return adapters_.now ? adapters_.now() : new Date().getTime(); }

  var api = {
    configure:              configure,
    login:                  login,
    isAuthenticated:        isAuthenticated,
    isAuthenticatedByToken: isAuthenticatedByToken,
    getUserRole:            getUserRole,
    getSession:             getSession,
    checkPermission:        checkPermission,
    logout:                 logout
  };
  return api;
}());

/**
 * Retorna a URL publica do deployment atual.
 * Usada pelo Login.html via scriptlet: <?!= JSON.stringify(...getScriptUrl()...) ?>
 * Definida aqui para que todos os projetos da frota que importam
 * AuthStandardService.gs tenham o helper disponivel automaticamente.
 */
function getScriptUrl() {
  try {
    try {
      return ScriptApp.getService().getUrl();
    } catch (e) {
      return '';
    }
  } catch (error) {
    Logger.log("Erro em getScriptUrl: " + error.message);
    throw error;
  }
}
