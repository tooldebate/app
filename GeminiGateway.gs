/**
 * Wrapper oficial da frota para Gemini.
 */
var GeminiGateway = (function () {
  'use strict';
  function generate(prompt, options) {
    try {
      options = options || {};
      if (options.ethics) {
        return EthicsGuardService.pipeline(prompt, function (safePrompt) {
          var nested = {};
          Object.keys(options).forEach(function (key) {
            if (key !== 'ethics') nested[key] = options[key];
          });
          return generateRaw_(safePrompt, nested);
        }, options.ethics);
      }
      return generateRaw_(prompt, options);
    } catch (error) {
      Logger.log("Erro em generate: " + error.message);
      throw error;
    }
  }

  function generateRaw_(prompt, options) {
    try {
      var model = String(options.model || '').trim();
      if (!model) {
        throw new Error(
          'Modelo Gemini não informado. Defina GEMINI_MODEL nas Script Properties ' +
          'e passe GeminiModelConfig.getModel() para GeminiGateway.generate().');
      }
      if (model.indexOf('models/') === 0) model = model.slice('models/'.length);

      // FROTA-05 / 429: o Gemini Free Tier exige esperas longas após rate limit.
      // maxAttempts=5 com baseDelayMs=15000 → delays: ~15s, ~30s, ~60s, ~60s
      // (cap em 65000ms). Cobre a janela de 1 minuto do RPM sem estourar o
      // timeout do Apps Script (~6 min).
      var _auditStart = Date.now();
      var result = ExternalApiClient.request({
        operation: options.operation || 'gemini.generate',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/' +
          encodeURIComponent(model) + ':generateContent',
        secretProperty: 'GEMINI_API_KEY',
        secretHeader: 'x-goog-api-key',
        secretPrefix: '',
        maxAttempts: 5,
        baseDelayMs: 15000,
        maxDelayMs: 65000,
        payload: {
          contents: [{ role: 'user', parts: [{ text: String(prompt) }] }],
          generationConfig: options.generationConfig || {}
        },
        cacheKey: options.cacheKey,
        cacheSeconds: options.cacheSeconds,
        rateLimitKey: options.rateLimitKey || 'gemini',
        fallback: options.fallback,
        normalize: function (body) {
          // Detecta bloqueio por cota diária / RPD (RESOURCE_EXHAUSTED com
          // message "quota") e traduz para código legível antes de devolver.
          if (body && body.error) {
            var msg = (body.error.message || '').toLowerCase();
            var status = body.error.code || body.error.status || '';
            if (String(status) === '429' || msg.indexOf('quota') !== -1 ||
                msg.indexOf('rate') !== -1 || String(status) === 'RESOURCE_EXHAUSTED') {
              return null; // força o ExternalApiClient a tratar como falha HTTP 429
            }
          }
          var candidates = body && body.candidates || [];
          var parts = candidates[0] && candidates[0].content &&
            candidates[0].content.parts || [];
          return {
            text: parts.map(function (part) { return part.text || ''; }).join(''),
            finishReason: candidates[0] && candidates[0].finishReason || null,
            usage: body && body.usageMetadata || null,
            model: model
          };
        }
      });

      auditGeneration_(options, model, result, _auditStart);

      // Traduz o código de erro genérico em mensagem acionável para o usuário.
      if (result && result.ok === false) {
        var code = result.error && (result.error.code || result.status);
        if (String(code) === 'UPSTREAM_HTTP_429') {
          return ApiError.create(429,
            'A API do Gemini atingiu o limite de requisições por minuto. ' +
            'Aguarde 1 minuto e tente novamente. ' +
            'Se o problema persistir, verifique sua cota em aistudio.google.com.',
            'GEMINI_RATE_LIMIT');
        }
      }
      return result;
    } catch (error) {
      Logger.log("Erro em generateRaw_: " + error.message);
      throw error;
    }
  }

    function auditGeneration_(options, model, result, startedAt) {
      try {
        if (typeof AiAuditLogService === 'undefined' || !AiAuditLogService.record) return;
        var failed = !!(result && result.ok === false);
        AiAuditLogService.record({
          useCase: (options && options.operation) || 'gemini.generate',
          model: model,
          durationMs: Date.now() - startedAt,
          status: failed ? 'fail' : 'ok',
          errorCode: failed && result.error ? (result.error.code || result.status || '') : ''
        });
      } catch (e) {}
    }
  return { generate: generate };
}());
