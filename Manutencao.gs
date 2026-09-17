/**
 * Manutencao.gs — Utilitários administrativos (rodar manualmente no editor do
 * Apps Script, NÃO expostos ao web app).
 */

// Limite de contos reprocessados por execução, para não estourar o tempo máximo
// de execução do Apps Script (~6 min). Se sobrar, rode a função de novo.
var MAX_REPROCESSAR_POR_EXECUCAO = 25;

/**
 * Reprocessa, em lote, os contos das linhas com status "Erro ao gerar conto"
 * (e as eventualmente travadas em "Gerando conto…"). Para cada uma: reconstrói
 * respostas + diretriz a partir da própria linha, regenera o conto, salva o
 * .txt no Drive e atualiza a linha. Devolve um resumo e registra no log.
 *
 * Rode pelo editor: selecione `reprocessarContosComErro` e clique em Executar.
 *
 * @return {{total:number, sucesso:number, falha:number, restantes:number, detalhes:Array<string>}}
 */
function reprocessarContosComErro() {
  try {
    // Operação administrativa: exige autorização (defense-in-depth, além do acesso ao editor).
    var autorizacao = requireAdmin('reprocessarContosComErro');
    if (!autorizacao.success) return autorizacao;

    var alvos = [STATUS.ERRO_CONTO, STATUS.GERANDO];

    var pendentes = lerLinhasResposta().filter(function (item) {
      return alvos.indexOf(String(item.valores['Status']).trim()) !== -1;
    });

    var lote = pendentes.slice(0, MAX_REPROCESSAR_POR_EXECUCAO);
    var resumo = {
      total: pendentes.length,
      sucesso: 0,
      falha: 0,
      restantes: Math.max(0, pendentes.length - lote.length),
      detalhes: []
    };

    lote.forEach(function (item) {
      var idAluno = String(item.valores['ID do Aluno'] || ('linha ' + item.linha));
      var diretrizId = String(item.valores['ID Diretriz'] || '').trim();
      try {
        var diretriz = obterDiretrizPorId(diretrizId);
        if (!diretriz) throw new Error('Diretriz "' + diretrizId + '" não encontrada.');

        var respostas = reconstruirRespostas(item.valores);
        var conto = gerarConto(respostas, diretriz);
        var arquivo = salvarContoNoDrive(nomeArquivoConto_(idAluno, conto.titulo), conto.texto);

        atualizarLinhaResposta(item.linha, {
          'Status': STATUS.CONTO_GERADO,
          'Título do Conto': conto.titulo,
          'Arquivo do Conto': arquivo.nome,
          'Link do Conto': arquivo.url
        });

        resumo.sucesso++;
        resumo.detalhes.push(idAluno + ' (linha ' + item.linha + '): OK — ' + arquivo.nome);
      } catch (e) {
        resumo.falha++;
        var msg = (e && e.message) ? e.message : String(e);
        atualizarLinhaResposta(item.linha, { 'Status': STATUS.ERRO_CONTO });
        resumo.detalhes.push(idAluno + ' (linha ' + item.linha + '): FALHA — ' + msg);
      }
    });

    Logger.log('Reprocessamento: ' + resumo.sucesso + ' OK, ' + resumo.falha +
      ' falha(s) em ' + lote.length + ' processada(s); ' + resumo.restantes + ' restante(s).');
    resumo.detalhes.forEach(function (d) { Logger.log('  ' + d); });
    return resumo;
  } catch (error) {
    Logger.log("Erro em reprocessarContosComErro: " + error.message);
    throw error;
  }
}

/**
 * DESATIVADA — a frota opera com senhas em TEXTO PLANO (quiosque escolar: a
 * professora precisa ler a senha do aluno na aba "Usuarios"). Esta rotina fazia
 * o oposto: gravava o SHA-256 na coluna "PasswordHash" e APAGAVA o texto plano.
 * Foi neutralizada para evitar execução acidental. O corpo original permanece
 * abaixo do guard caso a frota volte a exigir migração — basta remover o guard.
 *
 * @return {{success:boolean, message?:string}}
 */
/**
 * NEUTRALIZADO: A frota opera com senhas em texto plano (decisão de quiosque escolar).
 * Esta função foi desativada permanentemente para evitar hash de credenciais.
 *
 * @return {{success:boolean, message:string}}
 */
function migrarSenhasParaHash() {
  return {
    success: false,
    message: 'Desativado: a frota opera com senhas em texto plano. ' +
             'Esta migração para hash foi neutralizada de propósito.'
  };
}

/**
 * NEUTRALIZADO: Retorna texto plano (sem hash).
 * A frota opera com senhas em texto plano (decisão de quiosque escolar).
 * Esta função foi neutralizada para nunca gerar hash de credencial.
 * 
 * @param {string} senha
 * @return {string} A senha em texto plano
 */
function hashSenha_(senha) {
  try {
    // Retorna texto plano — sem hash, sem Utilities.computeDigest
    return String(senha);
  } catch (error) {
    Logger.log("Erro em hashSenha_: " + error.message);
    throw error;
  }
}

