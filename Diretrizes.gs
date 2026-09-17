/**
 * Diretrizes.gs — Leitura da aba "Diretrizes" e seleção de UMA diretriz única
 * por criança.
 *
 * Regras de negócio (ver Prompt.md):
 *   - cada criança recebe exatamente UMA linha da aba "Diretrizes";
 *   - nenhuma diretriz é usada por duas crianças (consumo único);
 *   - sem mistura de linhas; seleção consistente e rastreável.
 *
 * O "consumo" é rastreado pela própria aba "Respostas" (coluna "ID Diretriz"):
 * uma diretriz está disponível enquanto seu ID não aparecer lá. A escolha entre
 * as disponíveis é feita pelo Gemini (semântica) e, em caso de falha, por um
 * fallback determinístico (primeira diretriz livre).
 */

/**
 * Lê todas as diretrizes como objetos { cabecalho -> valor }, com a chave
 * auxiliar _id (o ID da diretriz, ex.: "CT-047").
 * @return {{cabecalho: Array<string>, linhas: Array<Object>}}
 */
function lerDiretrizes() {
  try {
    var aba = obterAba(CONFIG.ABA_DIRETRIZES || 'Diretrizes', false);
    var ultimaLinha = aba.getLastRow();
    var ultimaCol = aba.getLastColumn();
    if (ultimaLinha < 2) return { cabecalho: [], linhas: [] };

    var dados = aba.getRange(1, 1, ultimaLinha, ultimaCol).getValues();
    var cabecalho = dados.shift();
    var idIdx = cabecalho.indexOf(CONFIG.COL_ID_DIRETRIZ);
    if (idIdx === -1) idIdx = 0;

    var linhas = dados.map(function (r) {
      var obj = {};
      cabecalho.forEach(function (h, i) { obj[h] = r[i]; });
      obj._id = String(r[idIdx]).trim();
      return obj;
    }).filter(function (o) { return o._id !== ''; });

    return { cabecalho: cabecalho, linhas: linhas };
  } catch (error) {
    Logger.log("Erro em lerDiretrizes: " + error.message);
    throw error;
  }
}

/** Localiza uma diretriz pelo ID (ex.: "CT-223") ou devolve null. */
function obterDiretrizPorId(id) {
  try {
    id = String(id == null ? '' : id).trim();
    if (!id) return null;
    var linhas = lerDiretrizes().linhas;
    for (var i = 0; i < linhas.length; i++) {
      if (linhas[i]._id === id) return linhas[i];
    }
    return null;
  } catch (error) {
    Logger.log("Erro em obterDiretrizPorId: " + error.message);
    throw error;
  }
}

/** Diretrizes ainda não atribuídas a nenhuma criança. */
function obterDiretrizesDisponiveis() {
  try {
    var usadas = {};
    lerDiretrizesAtribuidas().forEach(function (id) { usadas[id] = true; });
    return lerDiretrizes().linhas.filter(function (d) { return !usadas[d._id]; });
  } catch (error) {
    Logger.log("Erro em obterDiretrizesDisponiveis: " + error.message);
    throw error;
  }
}

/**
 * Seleciona exatamente UMA diretriz disponível para a criança.
 *
 * @param {Object} respostas Mapa { idPergunta -> opção escolhida }.
 * @return {{diretriz: Object, metodo: string}}
 * @throws Se não houver diretriz disponível.
 */
function selecionarDiretrizUnica(respostas) {
  var disponiveis = obterDiretrizesDisponiveis();
  if (disponiveis.length === 0) {
    throw new Error('Não há diretrizes disponíveis: as ' +
      CONFIG.TOTAL_DIRETRIZES_ESPERADO + ' diretrizes já foram atribuídas.');
  }

  // Caminho principal: Gemini escolhe a melhor diretriz entre as disponíveis.
  if (CONFIG.USAR_GEMINI && getGeminiApiKey()) {
    try {
      var id = selecionarDiretrizComGemini(respostas, disponiveis);
      var escolhida = disponiveis.filter(function (d) { return d._id === id; })[0];
      if (escolhida) {
        return { diretriz: escolhida, metodo: METODO_SELECAO.GEMINI };
      }
    } catch (e) {
      console.warn('Seleção por Gemini falhou; usando fallback sequencial. Detalhe: ' + e);
    }
  }

  // Fallback determinístico e reproduzível: primeira diretriz livre.
  return { diretriz: disponiveis[0], metodo: METODO_SELECAO.SEQUENCIAL };
}
