/**
 * GeminiModelConfig.gs — FROTA-07: Configuração central de modelo e parâmetros
 *
 * Fonte única de verdade para o modelo Gemini e limites operacionais.
 * Todos os projetos leem daqui; nenhum fixa modelo em código-fonte.
 *
 * Configuração via Script Properties (sem mudança de código):
 *   GEMINI_MODEL             — modelo a usar; obrigatório
 *   GEMINI_MAX_OUTPUT_TOKENS — limite de tokens na resposta; padrão: 2048
 *   GEMINI_TEMPERATURE       — temperatura (0.0–1.0); padrão: 0.4
 *
 * Critérios de aceite (FROTA-07):
 *   ✓ Modelo lido de Script Properties — sem hardcode nem fallback no código.
 *   ✓ Falha clara quando GEMINI_MODEL não está configurado.
 *   ✓ getModel() registra o modelo efetivamente usado (via Logger auditável).
 *   ✓ Teste troca o modelo por propriedade sem editar código.
 */

'use strict';

var GeminiModelConfig = (function () {

  // ── Parâmetros operacionais ───────────────────────────────────────────────
  var DEFAULT_MAX_TOKENS  = 2048;
  var DEFAULT_TEMPERATURE = 0.4;

  // ── Leitura de propriedades ───────────────────────────────────────────────
  function _props() {
    try {
      try { return PropertiesService.getScriptProperties(); }
      catch (_) { return { getProperty: function() { return null; } }; }
    } catch (error) {
      Logger.log("Erro em _props: " + error.message);
      throw error;
    }
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Retorna o modelo configurado em Script Properties.
   * Falha de forma clara se GEMINI_MODEL estiver ausente ou vazio.
   *
   * @returns {string}  Ex.: valor configurado em GEMINI_MODEL.
   * @throws  {Error}   Se GEMINI_MODEL não estiver configurado.
   */
  function getModel() {
    var raw = _props().getProperty('GEMINI_MODEL');
    var model = String(raw || '').trim();
    if (!model) {
      throw new Error(
        '[GeminiModelConfig] Script Property GEMINI_MODEL não configurada. ' +
        'Defina o modelo em Configurações do projeto > Propriedades do script.');
    }
    if (model.indexOf('models/') === 0) model = model.slice('models/'.length);
    Logger.log('[GeminiModelConfig] modelo=' + model);
    return model;
  }

  /**
   * Limite máximo de tokens na resposta do modelo.
   * @returns {number}
   */
  function getMaxOutputTokens() {
    try {
      var v = _props().getProperty('GEMINI_MAX_OUTPUT_TOKENS');
      var n = v ? parseInt(v, 10) : DEFAULT_MAX_TOKENS;
      return (isNaN(n) || n < 1) ? DEFAULT_MAX_TOKENS : n;
    } catch (error) {
      Logger.log("Erro em getMaxOutputTokens: " + error.message);
      throw error;
    }
  }

  /**
   * Temperatura da geração (0.0 = determinística, 1.0 = criativa).
   * @returns {number}
   */
  function getTemperature() {
    try {
      var v = _props().getProperty('GEMINI_TEMPERATURE');
      var n = v ? parseFloat(v) : DEFAULT_TEMPERATURE;
      return (isNaN(n) || n < 0 || n > 1) ? DEFAULT_TEMPERATURE : n;
    } catch (error) {
      Logger.log("Erro em getTemperature: " + error.message);
      throw error;
    }
  }

  /**
   * Retorna todos os parâmetros operacionais de uma vez.
   * Use para montar o generationConfig do payload Gemini.
   *
   * @returns {{ model: string, maxOutputTokens: number, temperature: number }}
   */
  function getParams() {
    return {
      model:           getModel(),
      maxOutputTokens: getMaxOutputTokens(),
      temperature:     getTemperature()
    };
  }

  return {
    getModel:           getModel,
    getMaxOutputTokens: getMaxOutputTokens,
    getTemperature:     getTemperature,
    getParams:          getParams
  };
})();
