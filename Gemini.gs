/**
 * Gemini.gs — Camada de integração com o Google Gemini.
 *
 * Ponto único de integração (chamarGemini_), reutilizado por:
 *   - selecionarDiretrizComGemini() — escolhe UMA diretriz entre as disponíveis;
 *   - gerarConto() (Conto.gs) — escreve o conto a partir das respostas + diretriz.
 * Por dentro, chamarGemini_ delega ao GeminiGateway (frota): retry, rate limit,
 * logs estruturados e modelo validado ficam num só lugar — aqui só montamos os
 * prompts e interpretamos o texto. Pode-se trocar/desligar a IA (CONFIG.USAR_GEMINI)
 * sem reescrever o fluxo.
 */

/**
 * Chamada genérica ao Gemini (generateContent), via GeminiGateway.
 *
 * @param {string} prompt Texto do prompt.
 * @param {Object} generationConfig Config (temperatura, responseMimeType, schema…).
 * @return {string} Texto da resposta do modelo.
 * @throws Em erro de rede/HTTP ou resposta sem texto.
 */
// FROTA-07: modelo lido da Script Property GEMINI_MODEL, nunca hardcoded.
// Fonte única de verdade: GeminiModelConfig. Sem GEMINI_MODEL configurado,
// a falha é explícita para evitar chamadas silenciosas a um modelo antigo.
function toolDebateModel_() {
  return GeminiModelConfig.getModel();
}

function chamarGemini_(prompt, generationConfig) {
  try {
    if (!getGeminiApiKey()) throw new Error('GEMINI_API_KEY não configurada.');

    // FROTA-02: privacidade por construção — strip de PII + asserção final
    // (reusa o mesmo guardião testado em PromptContextBuilder). O nome da
    // criança nunca chega ao provedor.
    var safePrompt = PromptContextBuilder.buildGeminiPayload(prompt, {})
      .contents[0].parts[0].text;

    // Ponto único de saída → gateway oficial da frota (FROTA-14): retry com
    // backoff, rate limit/quota (FROTA-05), logs estruturados (FROTA-13) e
    // modelo configurado (FROTA-07, via toolDebateModel_ → GeminiModelConfig).
    var res = GeminiGateway.generate(safePrompt, {
      operation: 'toolDebate.gemini',
      model: toolDebateModel_(),
      generationConfig: generationConfig || {},
      rateLimitKey: 'toolDebateConto'
    });

    // O ExternalApiClient devolve um envelope { ok, data } e, em falha esgotada,
    // um ApiError ({ ok:false, ... }) — convertido aqui em exceção para preservar
    // o contrato dos chamadores (fallback de seleção / status de erro do conto).
    if (!res || res.ok === false) {
      var code = res && res.error ? (res.error.code || res.status) : 'desconhecido';
      // Traduz códigos técnicos em mensagens acionáveis para o usuário.
      if (code === 'GEMINI_RATE_LIMIT' || String(code) === 'UPSTREAM_HTTP_429') {
        throw new Error(
          'O limite de requisições da API do Gemini foi atingido. ' +
          'Aguarde 1 minuto e tente novamente.');
      }
      if (String(code) === 'UPSTREAM_HTTP_401' || String(code) === 'UPSTREAM_HTTP_403') {
        throw new Error(
          'Chave da API do Gemini inválida ou sem permissão. ' +
          'Verifique a propriedade GEMINI_API_KEY em Configurações do projeto.');
      }
      if (String(code) === 'UPSTREAM_HTTP_400') {
        throw new Error(
          'Requisição rejeitada pelo Gemini (400). ' +
          'O prompt pode conter conteúdo bloqueado pela política de segurança.');
      }
      throw new Error('Gemini indisponível (' + code + '). Tente novamente em instantes.');
    }
    var texto = res.data && res.data.text;
    if (!texto) throw new Error('Resposta do Gemini sem texto utilizável.');
    return texto;
  } catch (error) {
    Logger.log("Erro em chamarGemini_: " + error.message);
    throw error;
  }
}

/**
 * Pede ao Gemini que escolha UMA diretriz entre as disponíveis.
 *
 * @param {Object} respostas Mapa { idPergunta -> opção escolhida }.
 * @param {Array<Object>} disponiveis Diretrizes ainda não usadas.
 * @return {string} ID da diretriz escolhida (ex.: "CT-047").
 * @throws Em erro de rede/HTTP, resposta inválida, ou ID fora da lista.
 */
function selecionarDiretrizComGemini(respostas, disponiveis) {
  try {
    var texto = chamarGemini_(montarPromptGemini_(respostas, disponiveis), {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' } },
        required: ['id']
      }
    });

    var id = String(parseJsonGemini_(texto, 'seleção de diretriz').id || '').trim();
    var existe = disponiveis.some(function (d) { return d._id === id; });
    if (!existe) {
      throw new Error('Gemini retornou um ID fora das diretrizes disponíveis: "' + id + '".');
    }
    return id;
  } catch (error) {
    Logger.log("Erro em selecionarDiretrizComGemini: " + error.message);
    throw error;
  }
}

/** Monta o prompt com as respostas e o catálogo resumido das diretrizes. */
function montarPromptGemini_(respostas, disponiveis) {
  try {
    // FROTA-02: sanitiza respostas (remove PII por coluna) e diretrizes
    // (campos criativos apenas) antes de compor o prompt.
    var built = PromptContextBuilder.build('story.directive', {
      respostas:  respostas,
      diretrizes: disponiveis
    });
    PromptContextBuilder.logAudit('story.directive', built.droppedKeys);

    var ctx = built.context;
    var safeRespostas = ctx.respostas || {};
    var safeDiretrizes = ctx.diretrizes || [];

    var resumoRespostas = obterPerguntas().map(function (p) {
      var v = safeRespostas && safeRespostas[p.id];
      return '- ' + p.pergunta + ' => ' + (v != null && v !== '' ? v : '(sem resposta)');
    }).join('\n');

    var catalogo = safeDiretrizes.map(function (d) {
      return (d._id || '') + ' :: ' + (d[CONFIG.COL_TITULO_DIRETRIZ] || '') +
        ' | universo: ' + (d['Universo ficcional'] || '') +
        ' | problema: ' + (d['Problema narrativo'] || '') +
        ' | emoção: ' + (d['Chave emocional'] || '') +
        ' | interesse: ' + (d['Interesse da crianca'] || '');
    }).join('\n');

    return [
      'Você é um curador que associa a cada criança UMA diretriz de conto.',
      'A partir das respostas da criança ao questionário, escolha SOMENTE UMA linha',
      'da lista de diretrizes DISPONÍVEIS — a que melhor combina com o conjunto de',
      'respostas. Não combine linhas e não invente IDs. Responda apenas em JSON.',
      '',
      'RESPOSTAS DA CRIANÇA:',
      resumoRespostas,
      '',
      'DIRETRIZES DISPONÍVEIS (id :: resumo):',
      catalogo,
      '',
      'Responda exatamente no formato {"id":"CT-XXX"}, usando um id existente da lista.'
    ].join('\n');
  } catch (error) {
    Logger.log("Erro em montarPromptGemini_: " + error.message);
    throw error;
  }
}

/**
 * JSON.parse de um texto vindo do Gemini, lançando um erro CLARO (em vez do
 * SyntaxError cru) quando o modelo devolve algo que não é JSON válido — caso
 * comum quando ele embrulha a resposta em markdown ou texto livre.
 *
 * @param {string} texto Conteúdo a ser interpretado como JSON.
 * @param {string} contexto Rótulo curto para compor a mensagem de erro.
 * @return {Object} Objeto interpretado.
 * @throws {Error} Mensagem amigável quando o conteúdo não é JSON.
 */
function parseJsonGemini_(texto, contexto) {
  try {
    // GeminiResponseNormalizer tolera ```json … ``` (cercas markdown) que o
    // modelo às vezes adiciona mesmo com responseMimeType=application/json.
    var obj = GeminiResponseNormalizer.parseJson(texto);
    if (obj === null) {
      throw new Error('Resposta do Gemini não veio em JSON válido' +
        (contexto ? ' (' + contexto + ')' : '') + ': ' +
        String(texto == null ? '' : texto).slice(0, 200));
    }
    return obj;
  } catch (error) {
    Logger.log("Erro em parseJsonGemini_: " + error.message);
    throw error;
  }
}
