/**
 * MicroJornalFeatures.gs — Funcionalidades autenticadas do Tool Debate.
 *
 * Justificam a existencia do login: editores autenticados registram
 * recomendacoes para a edicao do micro jornal (com os contos dos alunos) e
 * sugerem temas para futuras publicacoes. Toda acao exige credenciais validas
 * (ver Auth.gs / loginWithPassword) e e atribuida ao usuario autor.
 */

function td_auth_(username, password) {
  var res = loginWithPassword(username, password);
  return (res && res.success) ? res.user : null;
}

function td_append_(sheetName, headers, obj) {
  try {
    var ss = Auth_getSpreadsheet_();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    var current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) : [];
    if (!current.length) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); current = headers.slice(); }
    sheet.appendRow(current.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
  } catch (error) {
    Logger.log("Erro em td_append_: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

function td_list_(sheetName) {
  var sheet = Auth_getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  return values.slice(1).map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i]; }); return o; });
}

function td_id_(prefix) { return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

/**
 * Funcionalidade 1 — Registrar recomendacao para a edicao do micro jornal.
 * @param {string} tipo 'revisao_textual' ou 'curadoria_visual'.
 */
function registrarRecomendacaoEdicao(username, password, conto, tipo, recomendacao) {
  try {
    var user = td_auth_(username, password);
    if (!user) return { success: false, message: 'Credenciais invalidas.' };
    var tipos = ['revisao_textual', 'curadoria_visual'];
    if (tipos.indexOf(String(tipo)) === -1) return { success: false, message: 'Tipo invalido. Use: ' + tipos.join(', ') + '.' };
    if (!String(recomendacao || '').trim()) return { success: false, message: 'Informe a recomendacao.' };
    var id = td_id_('REC');
    td_append_('RecomendacoesEdicao', ['ID', 'DataHora', 'Autor', 'Conto', 'Tipo', 'Recomendacao'], {
      ID: id, DataHora: new Date(), Autor: user.username, Conto: conto || '', Tipo: tipo, Recomendacao: recomendacao
    });
    return { success: true, id: id };
  } catch (error) {
    Logger.log("Erro em registrarRecomendacaoEdicao: " + error.message);
    throw error;
  }
}

/** Funcionalidade 2 — Sugerir tema para futuras publicacoes. */
function sugerirTemaPublicacao(username, password, tema, justificativa) {
  try {
    var user = td_auth_(username, password);
    if (!user) return { success: false, message: 'Credenciais invalidas.' };
    if (!String(tema || '').trim()) return { success: false, message: 'Informe o tema.' };
    var id = td_id_('TEMA');
    td_append_('TemasPublicacao', ['ID', 'DataHora', 'Autor', 'Tema', 'Justificativa', 'Status'], {
      ID: id, DataHora: new Date(), Autor: user.username, Tema: tema, Justificativa: justificativa || '', Status: 'sugerido'
    });
    return { success: true, id: id };
  } catch (error) {
    Logger.log("Erro em sugerirTemaPublicacao: " + error.message);
    throw error;
  }
}

function listarRecomendacoesEdicao(username, password) {
  if (!td_auth_(username, password)) return { success: false, message: 'Credenciais invalidas.' };
  return { success: true, itens: td_list_('RecomendacoesEdicao') };
}

function listarTemasPublicacao(username, password) {
  if (!td_auth_(username, password)) return { success: false, message: 'Credenciais invalidas.' };
  return { success: true, itens: td_list_('TemasPublicacao') };
}
