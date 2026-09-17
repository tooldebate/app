/**
 * ApiGateway.gs — Roteador de chamadas do ApiClient (frontend) para o backend.
 *
 * O ApiClient.html chama google.script.run.apiCall(service, method, payload)
 * esperando um envelope: { ok: boolean, data?: any, error?: { message: string } }
 *
 * Rotas disponíveis:
 *   AuthService / login   → loginWithToken(username, password)
 *   AuthService / logout  → logoutWithToken(tok)
 *
 * Novos serviços devem ser registrados em ROUTES abaixo.
 */

var APIGW_ROUTES_ = {
  'AuthService:login': function (payload) {
    var result = loginWithToken(
      String(payload.username || '').trim(),
      String(payload.password || '')
    );
    // loginWithToken devolve { success, token, redirectUrl, message }
    // Traduzimos para o envelope padrão do ApiClient.
    if (result && result.success) {
      return { ok: true, data: result };
    }
    return {
      ok: false,
      error: { message: result && result.message ? result.message : 'Credenciais inválidas.' }
    };
  },

  'AuthService:logout': function (payload) {
    logoutWithToken(String(payload.tok || ''));
    return { ok: true, data: { ok: true } };
  }
};

/**
 * Ponto de entrada único chamado via google.script.run.apiCall(...).
 * @param {string} service  Nome do serviço (ex.: "AuthService").
 * @param {string} method   Nome do método  (ex.: "login").
 * @param {Object} payload  Corpo da requisição.
 * @return {{ ok:boolean, data?:any, error?:{message:string} }}
 */
function apiCall(service, method, payload) {
  try {
    var key = String(service || '') + ':' + String(method || '');
    var handler = APIGW_ROUTES_[key];
    if (!handler) {
      return { ok: false, error: { message: 'Rota desconhecida: ' + key } };
    }
    try {
      return handler(payload || {});
    } catch (e) {
      var msg = (e && e.message) ? e.message : String(e);
      Logger.log('ApiGateway erro [' + key + ']: ' + msg);
      return { ok: false, error: { message: msg } };
    }
  } catch (error) {
    Logger.log("Erro em apiCall: " + error.message);
    throw error;
  }
}

