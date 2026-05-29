// GeminiIntegration.gs
/**
 * @overview Módulo de integração com a API do Google Gemini para funcionalidades agenticas.
 *           Contém funções para enviar requisições à API Gemini e processar suas respostas,
 *           utilizando a chave de API configurada nas variáveis de ambiente do Apps Script.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter a chave da API Gemini.
 *   - Logger.gs: Para registrar requisições e respostas da API.
 *
 * @integrations
 *   - Google Gemini API: Geração de texto, análise, sumarização, etc.
 *
 * @description
 *   Este módulo atua como a ponte entre o sistema Google Apps Script e a API do Google Gemini.
 *   Ele encapsula a lógica de chamada à API, formatação de prompts e tratamento das respostas.
 *   Pode ser utilizado para diversas finalidades, como gerar feedback automatizado para avaliações,
 *   sumarizar descrições de projetos, sugerir tarefas ou aprimorar a compreensão de documentos.
 *   A chave da API Gemini deve ser configurada como uma propriedade de script (`ScriptProperties`) ou
 *   variável de ambiente no projeto Google Apps Script.
 */

function getGeminiApiKey() {
  // A chave da API Gemini deve ser configurada como uma propriedade de script ou variável de ambiente.
  // Exemplo: ScriptApp.getProperties().getProperty('GEMINI_API_KEY');
  // Para este projeto, assumimos que está em Config.gs
  return Config.getGeminiApiKey();
}

function callGeminiApi(prompt) {
  var apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Chave da API Gemini não configurada.");
  }

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify({
      'contents': [{
        'parts': [{
          'text': prompt
        }]
      }]
    })
  };

  try {
    Logger.log(`Chamando Gemini API com prompt: ${prompt.substring(0, 100)}...`);
    var response = UrlFetchApp.fetch(url, options);
    var jsonResponse = JSON.parse(response.getContentText());
    Logger.log(`Resposta da Gemini API: ${JSON.stringify(jsonResponse).substring(0, 200)}...`);
    return jsonResponse;
  } catch (e) {
    Logger.log(`Erro ao chamar Gemini API: ${e.message}`);
    throw new Error(`Erro ao interagir com a API Gemini: ${e.message}`);
  }
}

function generateEvaluationFeedback(evaluationComments) {
  var prompt = `Analise o seguinte comentário de avaliação e forneça um feedback construtivo e sugestões para melhoria, focando na aderência e compreensão do projeto:\n\n"${evaluationComments}"\n\nFeedback:`;
  var response = callGeminiApi(prompt);
  if (response && response.candidates && response.candidates.length > 0) {
    return { text: response.candidates[0].content.parts[0].text };
  }
  return { text: "Não foi possível gerar feedback da Gemini." };
}

function summarizeProjectDescription(projectDescription) {
  var prompt = `Resuma a seguinte descrição de projeto em um parágrafo conciso, destacando os objetivos principais:\n\n"${projectDescription}"\n\nResumo:`;
  var response = callGeminiApi(prompt);
  if (response && response.candidates && response.candidates.length > 0) {
    return { text: response.candidates[0].content.parts[0].text };
  }
  return { text: "Não foi possível gerar resumo da Gemini." };
}

function suggestTasksForProject(projectDescription) {
  var prompt = `Com base na seguinte descrição de projeto, sugira 5 tarefas detalhadas que seriam essenciais para sua execução:\n\n"${projectDescription}"\n\nTarefas Sugeridas (lista numerada):`;
  var response = callGeminiApi(prompt);
  if (response && response.candidates && response.candidates.length > 0) {
    return { text: response.candidates[0].content.parts[0].text };
  }
  return { text: "Não foi possível sugerir tarefas da Gemini." };
}
