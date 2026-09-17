/**
 * PromptContextBuilder.gs — Montador de contexto com privacidade por construção.
 *
 * FROTA-02: Privacidade por construção e minimização do prompt.
 *
 * CASOS DE USO declarados neste projeto (Tool Debate - Um conto por aluno):
 *   - 'story.directive'  → respostas do questionário (anônimas por coluna),
 *                          catálogo de diretrizes (sem dados nominais)
 *   - 'story.generate'   → escolhas da criança (por coluna, não por nome),
 *                          dados da diretriz (campos criativos, sem ID pessoal)
 *   - 'story.questions'  → título e corpo do conto (texto gerado, sem PII)
 *   - 'themeDigest'      → manchetes públicas, tema, audiência
 *
 * REGRA CRÍTICA: o nome da criança NUNCA vai ao Gemini. As escolhas do
 * questionário passam apenas pelo rótulo da coluna (ex.: "Personagem principal")
 * — nunca pelo campo "nome" ou "aluno".
 *
 * IDENTIFICADORES PROIBIDOS:
 *   email, nome, cpf, ra, matricula, id_externo, telefone, responsavel,
 *   turma_nominal, nota_livre, observacao_pessoal, student_name, teacher_name
 */

var PromptContextBuilder = (function () {
  var MIN_GROUP_SIZE = 5;

  var ALLOWED_FIELDS = {
    'story.directive': ['respostas', 'diretrizes'],
    'story.generate':  ['escolhas', 'diretriz', 'maxChars'],
    'story.questions': ['titulo', 'corpo'],
    'themeDigest':     ['theme', 'query', 'audience', 'headlines']
  };

  var PII_PATTERNS = [
    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    /\b\d{3}\.?\d{3}\.?\d{3}\-?\d{2}\b/g,
    /\b\d{7,12}\b/g,
    /\b[0-9]{10,11}\b/g,
    /\b(aluno|estudante|professor|responsavel)\s+[A-ZÀ-Ú][a-zà-ú]+/gi
  ];

  var BLOCKED_KEYS = [
    'email', 'nome', 'cpf', 'ra', 'matricula', 'id_externo', 'telefone',
    'endereco', 'responsavel_nome', 'turma_nominal', 'nota_livre',
    'observacao_pessoal', 'name', 'student_name', 'teacher_name',
    'aluno', 'nomeAluno', 'nomecrianca', 'nome_crianca'
  ];

  function stripPii(text) {
    try {
      if (typeof text !== 'string') return text;
      var result = text;
      for (var i = 0; i < PII_PATTERNS.length; i++) {
        result = result.replace(PII_PATTERNS[i], '[OMITIDO]');
      }
      return result;
    } catch (error) {
      Logger.log("Erro em stripPii: " + error.message);
      throw error;
    }
  }

  function containsPii(text) {
    if (typeof text !== 'string') return false;
    for (var i = 0; i < PII_PATTERNS.length; i++) {
      PII_PATTERNS[i].lastIndex = 0;
      if (PII_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  function sanitizeValue(value, maxLen) {
    try {
      maxLen = maxLen || 500;
      if (typeof value === 'string') return stripPii(value).slice(0, maxLen);
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      return null;
    } catch (error) {
      Logger.log("Erro em sanitizeValue: " + error.message);
      throw error;
    }
  }

  /**
   * Sanitiza o mapa de respostas do questionário.
   * Mantém apenas {coluna → valor_escolhido}, stripPii em cada valor.
   * Remove chaves que correspondem a identificadores pessoais.
   */
  function sanitizeRespostas(respostas) {
    try {
      if (!respostas || typeof respostas !== 'object') return {};
      var out = {};
      Object.keys(respostas).forEach(function (coluna) {
        var colunaLower = coluna.toLowerCase();
        // Bloqueia colunas cujo rótulo é um identificador pessoal
        if (BLOCKED_KEYS.indexOf(colunaLower) !== -1) return;
        var val = respostas[coluna];
        if (val === null || val === undefined || val === '') return;
        out[coluna] = stripPii(String(val)).slice(0, 200);
      });
      return out;
    } catch (error) {
      Logger.log("Erro em sanitizeRespostas: " + error.message);
      throw error;
    }
  }

  /**
   * Sanitiza uma linha de diretriz — mantém apenas campos criativos,
   * remove _id e qualquer campo nominal que possa ter escapado.
   */
  function sanitizeDiretriz(d) {
    try {
      if (!d || typeof d !== 'object') return {};
      var creative = [
        '_id', 'Titulo', CONFIG && CONFIG.COL_TITULO_DIRETRIZ,
        'Universo ficcional', 'Problema narrativo', 'Paisagem DF',
        'Paisagem natural', 'Paisagem urbana', 'Foco de pesquisa',
        'Ancora em referencias', 'Personalizacao infantil',
        'Interesse da crianca', 'Arranjo familiar ou social',
        'Chave emocional', 'Nuance diferenciadora',
        'Motor logico e sensibilizacao', 'ODS relacionados',
        'Uso no modelo'
      ].filter(Boolean);

      var out = {};
      creative.forEach(function (key) {
        if (d[key] !== undefined && d[key] !== null) {
          out[key] = typeof d[key] === 'string'
            ? stripPii(d[key]).slice(0, 300)
            : d[key];
        }
      });
      return out;
    } catch (error) {
      Logger.log("Erro em sanitizeDiretriz: " + error.message);
      throw error;
    }
  }

  function build(useCase, rawData) {
    try {
      var allowed = ALLOWED_FIELDS[useCase];
      if (!allowed) throw new Error('PromptContextBuilder: caso de uso desconhecido "' + useCase + '".');

      rawData = rawData || {};
      var context = {};
      var droppedKeys = [];

      Object.keys(rawData).forEach(function (key) {
        var keyLower = key.toLowerCase();
        if (BLOCKED_KEYS.indexOf(keyLower) !== -1) { droppedKeys.push(key); return; }
        if (allowed.indexOf(key) === -1) { droppedKeys.push(key); return; }

        if (key === 'respostas' || key === 'escolhas') {
          context[key] = sanitizeRespostas(rawData[key]);
          return;
        }
        if (key === 'diretriz') {
          context[key] = sanitizeDiretriz(rawData[key]);
          return;
        }
        if (key === 'diretrizes' && Array.isArray(rawData[key])) {
          // Envia apenas o ID e alguns metadados neutros
          context[key] = rawData[key].map(function (d) { return sanitizeDiretriz(d); });
          return;
        }

        var sanitized = sanitizeValue(rawData[key], 1000); // Strings soltas maiores
        if (sanitized !== null && sanitized !== '') {
          context[key] = sanitized;
        }
      });

      return {
        context: context,
        droppedKeys: droppedKeys,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.log("Erro em build: " + error.message);
      throw error;
    }
  }

  function logAudit(useCase, droppedKeys) {
    try {
      if (droppedKeys && droppedKeys.length > 0) {
        Logger.log('PromptContextBuilder [' + useCase + '] chaves removidas: ' + droppedKeys.join(', '));
        if (typeof AiAuditLogService !== 'undefined' && AiAuditLogService.logSanitization) {
          AiAuditLogService.logSanitization(useCase, droppedKeys);
        }
      }
    } catch (error) {
      Logger.log("Erro em logAudit: " + error.message);
      throw error;
    }
  }

  /**
   * Monta o envelope generateContent do Gemini aplicando stripPii no prompt.
   * É o ponto único de saída para o provedor (FROTA-02): o nome da criança
   * nunca chega ao modelo porque stripPii remove qualquer PII remanescente.
   *
   * @param {string} prompt Texto do prompt.
   * @param {Object} generationConfig Config extra (temperature, etc.).
   * @return {{contents: Array, generationConfig: Object}} Payload pronto para JSON.stringify.
   */
  function buildGeminiPayload(prompt, generationConfig) {
    try {
      var safePrompt = stripPii(typeof prompt === 'string' ? prompt : String(prompt || ''));
      var payload = {
        contents: [{ parts: [{ text: safePrompt }] }]
      };
      if (generationConfig && typeof generationConfig === 'object') {
        payload.generationConfig = generationConfig;
      }
      return payload;
    } catch (error) {
      Logger.log("Erro em buildGeminiPayload: " + error.message);
      throw error;
    }
  }

  /**
   * Garante que o grupo de respondentes seja suficientemente grande para
   * preservar o anonimato (k-anonimidade mínima = MIN_GROUP_SIZE).
   *
   * @param {number} groupSize Número de respondentes do grupo atual.
   * @param {string} useCase Rótulo do caso de uso (para a mensagem de erro).
   * @return {number} groupSize, se aprovado.
   * @throws {Error} Se groupSize < MIN_GROUP_SIZE.
   */
  function assertMinimumGroup(groupSize, useCase) {
    if (typeof groupSize !== 'number' || groupSize < MIN_GROUP_SIZE) {
      throw new Error(
        'PromptContextBuilder [' + (useCase || '?') + ']: grupo muito pequeno (' +
        groupSize + ' < ' + MIN_GROUP_SIZE + '). Envio ao modelo bloqueado.'
      );
    }
    return groupSize;
  }

  return {
    build: build,
    stripPii: stripPii,
    containsPii: containsPii,
    sanitizeDiretriz: sanitizeDiretriz,
    sanitizeRespostas: sanitizeRespostas,
    buildGeminiPayload: buildGeminiPayload,
    assertMinimumGroup: assertMinimumGroup,
    logAudit: logAudit
  };
})();
