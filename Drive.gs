/**
 * Drive.gs — Persistência dos contos como arquivos .txt no Google Drive.
 *
 * Salva cada conto gerado na pasta configurada por Script Property FOLDER_ID.
 * O arquivo é texto puro UTF-8: 1ª linha = título, restante = corpo do conto.
 */

/**
 * Cria o arquivo .txt do conto na pasta de contos.
 * @param {string} nomeArquivo Nome do arquivo (com .txt).
 * @param {string} conteudo Conteúdo do conto (título + corpo).
 * @return {{id:string, nome:string, url:string}}
 */
function salvarContoNoDrive(nomeArquivo, conteudo) {
  try {
    var pasta = DriveApp.getFolderById(getPastaContosId());
    var arquivo = pasta.createFile(nomeArquivo, conteudo, MimeType.PLAIN_TEXT);
    return { id: arquivo.getId(), nome: arquivo.getName(), url: arquivo.getUrl() };
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    if (/DriveApp|Authorization|permiss|Acesso negado|Access denied/i.test(msg)) {
      throw new Error(
        'Acesso negado ao Drive ao salvar o conto. Verifique se o deployment foi autorizado ' +
        'com o escopo do Drive e se a conta executora tem acesso de editor à pasta FOLDER_ID=' +
        getPastaContosId() + '. Detalhe: ' + msg);
    }
    throw e;
  }
}

/**
 * Diagnóstico manual: rode pelo editor do Apps Script após configurar FOLDER_ID.
 * @return {{ok:boolean, folderId:string, folderName:string}}
 */
function testarPastaContosDrive() {
  var folderId = getPastaContosId();
  var pasta = DriveApp.getFolderById(folderId);
  return { ok: true, folderId: folderId, folderName: pasta.getName() };
}

/**
 * Monta um nome de arquivo seguro e legível: "ALU-001 - Título do conto.txt".
 * @param {string} idAluno Identificador sequencial do aluno.
 * @param {string} titulo Título do conto.
 * @return {string}
 */
function nomeArquivoConto_(idAluno, titulo) {
  try {
    var base = (idAluno || 'aluno') + ' - ' + (titulo || 'conto');
    base = base
      .replace(/[\\\/:*?"<>|\r\n]+/g, ' ') // remove caracteres inválidos em nomes
      .replace(/\s+/g, ' ')
      .trim();
    if (base.length > 90) base = base.slice(0, 90).trim();
    return base + '.txt';
  } catch (error) {
    Logger.log("Erro em nomeArquivoConto_: " + error.message);
    throw error;
  }
}
