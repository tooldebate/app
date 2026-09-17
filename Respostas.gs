/**
 * Respostas.gs — COMPONENTE que monta e mantém a aba "Respostas".
 *
 * Este é o componente pedido para "montar a aba Respostas aos formulários,
 * quando forem sendo respondidos". Ele:
 *   1) constrói o cabeçalho da aba a partir do questionário E de TODAS as
 *      colunas da aba "Diretrizes" (montarAbaRespostas);
 *   2) registra UMA linha por formulário enviado (registrarLinhaResposta),
 *      gravando as respostas e TODOS os detalhes da diretriz atribuída;
 *   3) oferece as leituras de CRUD usadas pelo restante do sistema.
 *
 * O cabeçalho da aba "Respostas" é:
 *   [metadados] + [1 coluna por pergunta] + [processo] + [ID Diretriz] +
 *   ["Diretriz: <campo>" para cada coluna da aba "Diretrizes"]
 *
 * A linha é gravada casando valor↔coluna PELO NOME do cabeçalho real da aba,
 * então nunca há desalinhamento mesmo que as colunas sejam reordenadas.
 */

/** Colunas de metadados, antes das respostas das perguntas. */
var COLUNAS_META = ['Carimbo de data/hora', 'ID do Aluno', 'Identificação', 'Idade'];

/** Colunas de processo + a chave de unicidade (ID Diretriz). */
var COLUNAS_PROCESSO = ['Comentário livre', 'Método de Seleção', 'ID Diretriz'];

/** Colunas do conto gerado (status e arquivo .txt no Drive). */
var COLUNAS_CONTO = ['Status', 'Título do Conto', 'Arquivo do Conto', 'Link do Conto'];

/** Prefixo das colunas espelhadas da diretriz atribuída. */
var PREFIXO_DIRETRIZ = 'Diretriz: ';

/**
 * Colunas da aba "Diretrizes" que serão espelhadas em "Respostas" (todas,
 * exceto a coluna de ID — já guardada como "ID Diretriz" — e vazias).
 * Lê apenas a 1ª linha de "Diretrizes" (barato).
 */
function obterColunasDiretriz() {
  try {
    // Estrutura simplificada da planilha pode nao ter a aba "Diretrizes". Nesse
    // caso o conto e criado sem colunas espelhadas (o CRUD de Respostas nao depende
    // mais de uma matriz de diretrizes pre-carregada — ver SchemaService.RESPOSTAS).
    var aba = abrirPlanilha().getSheetByName(CONFIG.ABA_DIRETRIZES || 'Diretrizes');
    if (!aba) return [];
    var ultimaCol = aba.getLastColumn();
    if (ultimaCol < 1) return [];
    var cabecalho = aba.getRange(1, 1, 1, ultimaCol).getValues()[0];
    return cabecalho.filter(function (h) {
      return String(h).trim() !== '' && h !== CONFIG.COL_ID_DIRETRIZ;
    });
  } catch (error) {
    Logger.log("Erro em obterColunasDiretriz: " + error.message);
    throw error;
  }
}

/** Ordem canônica e completa das colunas da aba "Respostas". */
function obterColunasResposta() {
  try {
    var perguntas = obterPerguntas().map(function (p) { return p.coluna; });
    var diretriz = obterColunasDiretriz().map(function (h) { return PREFIXO_DIRETRIZ + h; });
    return COLUNAS_META
      .concat(perguntas)
      .concat(COLUNAS_PROCESSO)
      .concat(COLUNAS_CONTO)
      .concat(diretriz);
  } catch (error) {
    Logger.log("Erro em obterColunasResposta: " + error.message);
    throw error;
  }
}

/**
 * Garante que a aba "Respostas" exista e tenha o cabeçalho canônico.
 *
 * Não é destrutiva: só escreve o cabeçalho se a primeira célula estiver vazia
 * (planilha recém-configurada). Se já houver cabeçalho, é preservado. Para
 * acrescentar as novas colunas de diretriz a uma aba já criada, rode
 * reconstruirCabecalhoRespostas(). Idempotente.
 *
 * @return {Sheet} A aba "Respostas".
 */
function montarAbaRespostas() {
  try {
    var aba = obterAba(CONFIG.ABA_RESPOSTAS, true);
    var primeiraCelula = aba.getRange(1, 1).getValue();
    if (primeiraCelula === '' || primeiraCelula === null) {
      aplicarCabecalho_(aba);
    }
    return aba;
  } catch (error) {
    Logger.log("Erro em montarAbaRespostas: " + error.message);
    throw error;
  }
}

/**
 * Reescreve (força) a linha de cabeçalho — útil ao mudar perguntas/colunas de
 * diretriz. Afeta apenas a linha 1; as respostas já gravadas permanecem.
 */
function reconstruirCabecalhoRespostas() {
  var aba = obterAba(CONFIG.ABA_RESPOSTAS, true);
  aplicarCabecalho_(aba);
  return aba;
}

/** Escreve e formata a linha de cabeçalho na aba. */
function aplicarCabecalho_(aba) {
  try {
    try {
      try {
        var colunas = obterColunasResposta();
        // Limpa a linha 1 inteira antes (caso o novo cabeçalho seja menor que o antigo).
        aba.getRange(1, 1, 1, Math.max(colunas.length, aba.getLastColumn() || colunas.length)).clearContent();
        aba.getRange(1, 1, 1, colunas.length).setValues([colunas]);
        aba.setFrozenRows(1);
        aba.getRange(1, 1, 1, colunas.length)
          .setFontWeight('bold')
          .setBackground('#1a73e8')
          .setFontColor('#ffffff');
        aba.setColumnWidths(1, colunas.length, 180);
      } catch (error) {
        Logger.log("Erro em aplicarCabecalho_: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em aplicarCabecalho_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em aplicarCabecalho_: " + error.message);
    throw error;
  }
}

/**
 * Mapa { nomeDaColuna -> valor } com tudo que pode ser gravado em uma linha:
 * metadados, respostas, processo, a chave ID Diretriz e TODOS os campos da
 * diretriz atribuída (prefixados).
 */
function montarMapaValores(dados) {
  try {
    var d = dados.diretriz || {};
    var mapa = {};

    mapa['Carimbo de data/hora'] = dados.timestamp;
    mapa['ID do Aluno'] = dados.idAluno;
    mapa['Identificação'] = dados.identificacao || '';
    mapa['Idade'] = dados.idade || '';

    obterPerguntas().forEach(function (p) {
      var v = dados.respostas ? dados.respostas[p.id] : '';
      // Se for array (múltipla escolha), converte para string separada por vírgulas
      if (Array.isArray(v)) {
        v = v.join(', ');
      }
      mapa[p.coluna] = v != null ? v : '';
    });

    mapa['Comentário livre'] = dados.comentario || '';
    mapa['Método de Seleção'] = dados.metodo || '';
    mapa['ID Diretriz'] = d._id || '';
    mapa['Status'] = dados.status || '';
    mapa['Título do Conto'] = dados.tituloConto || '';
    mapa['Arquivo do Conto'] = dados.arquivoConto || '';
    mapa['Link do Conto'] = dados.linkConto || '';

    // Espelha cada campo da diretriz atribuída.
    obterColunasDiretriz().forEach(function (h) {
      var v = d[h];
      mapa[PREFIXO_DIRETRIZ + h] = v != null ? v : '';
    });

    return mapa;
  } catch (error) {
    Logger.log("Erro em montarMapaValores: " + error.message);
    throw error;
  }
}

/**
 * Acrescenta uma resposta à aba (uma criança = uma linha).
 * Casa valor↔coluna pelo NOME do cabeçalho real, evitando desalinhamento.
 * @return {number} Número da linha gravada.
 */
function registrarLinhaResposta(dados) {
  try {
    var aba = montarAbaRespostas();
    var cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var mapa = montarMapaValores(dados);
    var linha = cabecalho.map(function (col) {
      return Object.prototype.hasOwnProperty.call(mapa, col) ? mapa[col] : '';
    });
    aba.appendRow(linha);
    return aba.getLastRow();
  } catch (error) {
    Logger.log("Erro em registrarLinhaResposta: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

/**
 * Atualiza células específicas de uma linha já gravada, casando pelo NOME da
 * coluna no cabeçalho real (ex.: marcar Status e os dados do conto gerado).
 * @param {number} linha Número da linha (1-based, inclui o cabeçalho).
 * @param {Object} atualizacoes Mapa { nomeColuna -> valor }.
 */
function atualizarLinhaResposta(linha, atualizacoes) {
  try {
    try {
      var aba = montarAbaRespostas();
      var cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      Object.keys(atualizacoes).forEach(function (col) {
        var idx = cabecalho.indexOf(col);
        if (idx !== -1) aba.getRange(linha, idx + 1).setValue(atualizacoes[col]);
      });
    } catch (error) {
      Logger.log("Erro em atualizarLinhaResposta: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em atualizarLinhaResposta: " + error.message);
    throw error;
  }
}

/** Lê todas as linhas da aba como objetos { linha, valores: {coluna -> valor} }. */
function lerLinhasResposta() {
  try {
    var aba = montarAbaRespostas();
    var ultima = aba.getLastRow();
    if (ultima < 2) return [];
    var nCol = aba.getLastColumn();
    var cabecalho = aba.getRange(1, 1, 1, nCol).getValues()[0];
    var dados = aba.getRange(2, 1, ultima - 1, nCol).getValues();
    return dados.map(function (r, i) {
      var valores = {};
      cabecalho.forEach(function (h, c) { valores[h] = r[c]; });
      return { linha: i + 2, valores: valores };
    });
  } catch (error) {
    Logger.log("Erro em lerLinhasResposta: " + error.message);
    throw error;
  }
}

/** Reconstrói o mapa { idPergunta -> opção } a partir dos valores de uma linha. */
function reconstruirRespostas(valores) {
  try {
    var respostas = {};
    obterPerguntas().forEach(function (p) {
      var v = valores[p.coluna];
      if (v != null && String(v) !== '') respostas[p.id] = String(v);
    });
    return respostas;
  } catch (error) {
    Logger.log("Erro em reconstruirRespostas: " + error.message);
    throw error;
  }
}

/** Quantidade de respostas já registradas (sem contar o cabeçalho). */
function contarRespostas() {
  try {
    var aba = montarAbaRespostas();
    return Math.max(0, aba.getLastRow() - 1);
  } catch (error) {
    Logger.log("Erro em contarRespostas: " + error.message);
    throw error;
  }
}

/** Gera o próximo ID sequencial de aluno (ALU-001, ALU-002, ...). */
function gerarIdAluno() {
  var n = contarRespostas() + 1;
  return 'ALU-' + ('000' + n).slice(-3);
}

/**
 * Lê os IDs de diretriz já atribuídos (coluna "ID Diretriz"), para garantir a
 * unicidade — nenhuma diretriz pode ser usada por duas crianças.
 * @return {Array<string>} IDs já consumidos.
 */
function lerDiretrizesAtribuidas() {
  try {
    try {
      var aba = montarAbaRespostas();
      var ultima = aba.getLastRow();
      if (ultima < 2) return [];

      // Localiza a coluna pelo cabeçalho real da aba (robusto a reordenações).
      var cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      var idx = cabecalho.indexOf('ID Diretriz');
      if (idx === -1) idx = obterColunasResposta().indexOf('ID Diretriz');
      if (idx === -1) return [];

      var valores = aba.getRange(2, idx + 1, ultima - 1, 1).getValues();
      return valores
        .map(function (r) { return String(r[0]).trim(); })
        .filter(function (v) { return v !== ''; });
    } catch (error) {
      Logger.log("Erro em lerDiretrizesAtribuidas: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em lerDiretrizesAtribuidas: " + error.message);
    throw error;
  }
}
