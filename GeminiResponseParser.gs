// GeminiResponseParser.gs
/**
 * @overview Módulo para analisar e extrair informações relevantes das respostas da API do Google Gemini.
 *           Facilita a extração de texto, listas ou estruturas de dados específicas das respostas JSON.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations
 *   - Google Gemini API: Processamento das respostas.
 *
 * @description
 *   Este módulo é responsável por interpretar as respostas complexas da API Gemini.
 *   Dada a natureza generativa da Gemini, as respostas podem variar em formato.
 *   Este serviço fornece funções para extrair de forma robusta o conteúdo textual
 *   principal, ou para tentar parsear estruturas mais complexas (como listas de tarefas)
 *   a partir do texto gerado. Isso garante que o sistema possa utilizar de forma eficaz
 *   os insights e o conteúdo gerado pela inteligência artificial.
 */

function parseGeminiTextResponse(geminiResponse) {
  if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates.length > 0) {
    return geminiResponse.candidates[0].content.parts[0].text;
  }
  return "";
}

function parseGeminiSuggestedTasks(geminiResponse) {
  var text = parseGeminiTextResponse(geminiResponse);
  if (!text) return [];

  // Tenta extrair tarefas de uma lista numerada ou com marcadores
  var tasks = text.split(/\n\s*\d+\.\s*|\n\s*[-*]\s*/).filter(function(line) { return line.trim() !== ""; });
  // Remove o primeiro elemento se for vazio devido ao split inicial
  if (tasks.length > 0 && tasks[0].trim() === "") {
    tasks.shift();
  }
  return tasks.map(function(task) { return task.trim(); });
}

function parseGeminiStructuredFeedback(geminiResponse) {
  var text = parseGeminiTextResponse(geminiResponse);
  if (!text) return { feedback: "", suggestions: [] };

  // Exemplo: tentar parsear feedback e sugestões de um formato específico
  // Isso pode ser mais complexo dependendo do formato esperado da Gemini
  var feedbackMatch = text.match(/Feedback:\s*([\s\S]*?)(Sugestões:|\Z)/i);
  var suggestionsMatch = text.match(/Sugestões:\s*([\s\S]*)/i);

  var feedback = feedbackMatch && feedbackMatch[1] ? feedbackMatch[1].trim() : text;
  var suggestions = suggestionsMatch && suggestionsMatch[1] ? suggestionsMatch[1].split(/\n/).map(function(s) { return s.trim(); }).filter(function(s) { return s !== ""; }) : [];

  return { feedback: feedback, suggestions: suggestions };
}
