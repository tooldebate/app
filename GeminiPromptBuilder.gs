// GeminiPromptBuilder.gs
/**
 * @overview Módulo para construir prompts complexos para a API do Google Gemini.
 *           Facilita a criação de prompts dinâmicos e estruturados para diferentes
 *           casos de uso, como sumarização, geração de feedback e sugestão de tarefas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations
 *   - Google Gemini API: Fornece os prompts para a interação.
 *
 * @description
 *   Este módulo é responsável por abstrair a complexidade da criação de prompts
 *   para a API Gemini. Em vez de construir strings de prompt diretamente em outros
 *   módulos, este serviço oferece funções que geram prompts bem formatados com base
 *   nos dados de entrada. Isso garante consistência, facilita a manutenção e permite
 *   otimizar os prompts para obter melhores resultados da Gemini.
 */

function buildEvaluationFeedbackPrompt(evaluationComments) {
  return `Analise o seguinte comentário de avaliação e forneça um feedback construtivo e sugestões para melhoria, focando na aderência e compreensão do projeto:\n\n"${evaluationComments}"\n\nFeedback:`;
}

function buildProjectSummaryPrompt(projectDescription) {
  return `Resuma a seguinte descrição de projeto em um parágrafo conciso, destacando os objetivos principais:\n\n"${projectDescription}"\n\nResumo:`;
}

function buildTaskSuggestionPrompt(projectDescription) {
  return `Com base na seguinte descrição de projeto, sugira 5 tarefas detalhadas que seriam essenciais para sua execução:\n\n"${projectDescription}"\n\nTarefas Sugeridas (lista numerada):`;
}

function buildTeamPerformanceAnalysisPrompt(projectData, teamEvaluations) {
  var prompt = `Analise os seguintes dados de projeto e avaliações de equipe para fornecer um resumo do desempenho da equipe, identificando pontos fortes e áreas para melhoria:\n\n`;
  prompt += `Dados do Projeto:\n${JSON.stringify(projectData, null, 2)}\n\n`;
  prompt += `Avaliações da Equipe:\n${JSON.stringify(teamEvaluations, null, 2)}\n\n`;
  prompt += `Análise de Desempenho da Equipe:`;
  return prompt;
}
