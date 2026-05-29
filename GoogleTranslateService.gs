// GoogleTranslateService.gs
/**
 * @overview Módulo de integração com a Google Translate API para tradução de texto.
 *           Permite traduzir strings de texto entre diferentes idiomas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter a chave da API de tradução (se necessário, ou usar o serviço nativo).
 *   - Logger.gs: Para registrar operações de tradução.
 *
 * @integrations
 *   - Google Translate API: Serviço de tradução de idiomas.
 *
 * @description
 *   Este módulo fornece funcionalidades de tradução de texto, o que pode ser útil
 *   para sistemas multi-idioma ou para analisar conteúdo em diferentes línguas.
 *   Ele pode usar o serviço `LanguageApp` nativo do Apps Script para traduções
 *   simples ou integrar-se com a Google Cloud Translation API para recursos mais
 *   avançados e volumes maiores. A capacidade de traduzir comentários de avaliação,
 *   descrições de projetos ou mensagens de usuários pode melhorar a colaboração
 *   em equipes globais.
 */

function translateText(text, targetLanguage, sourceLanguage) {
  try {
    var translatedText = LanguageApp.translate(text, sourceLanguage || "auto", targetLanguage);
    Logger.log(`Texto traduzido de ${sourceLanguage || "auto"} para ${targetLanguage}: ${text.substring(0, 30)}... -> ${translatedText.substring(0, 30)}...`);
    return { success: true, translatedText: translatedText };
  } catch (e) {
    Logger.log(`Erro ao traduzir texto: ${e.message}`);
    throw new Error(`Erro ao traduzir texto: ${e.message}`);
  }
}

function detectLanguage(text) {
  try {
    var detectedLanguage = LanguageApp.detectLanguage(text);
    Logger.log(`Idioma detectado para "${text.substring(0, 30)}...": ${detectedLanguage}`);
    return { success: true, language: detectedLanguage };
  } catch (e) {
    Logger.log(`Erro ao detectar idioma: ${e.message}`);
    throw new Error(`Erro ao detectar idioma: ${e.message}`);
  }
}
