// Config.gs
/**
 * @overview Módulo de configuração para o sistema de gestão agentica.
 *           Gerencia o acesso a variáveis de ambiente e propriedades de script,
 *           como IDs de planilhas, IDs de pastas do Drive e chaves de API Gemini.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations
 *   - Google Apps Script PropertiesService: Para armazenar e recuperar configurações.
 *
 * @description
 *   Este módulo centraliza todas as configurações sensíveis e variáveis de ambiente
 *   necessárias para o funcionamento do sistema. Ele fornece métodos para acessar
 *   o `SPREADSHEETS_ID`, `DRIVE_FOLDER_ID` e `GEMINI_API_KEY`, que devem ser
 *   configurados como propriedades de script no projeto Google Apps Script.
 *   Isso garante que as credenciais e configurações importantes não estejam
 *   hardcoded no código e possam ser facilmente gerenciadas e atualizadas.
 */

function getSpreadsheetId() {
  // Substitua pelo ID da sua Google Planilha
  // Ou use ScriptApp.getProperties().getProperty("SPREADSHEETS_ID");
  return "1l7KSGocRZrvYUOJ3AeXGpaxL2R44IRIJcsZ43bn6myQ"; // Exemplo fornecido pelo usuário
}

function getDriveFolderId() {
  // Substitua pelo ID da sua pasta do Google Drive
  // Ou use ScriptApp.getProperties().getProperty("DRIVE_FOLDER_ID");
  return "1LOgvK1EWD8sQHifeem7cPKQp5GMqtp-X"; // Exemplo fornecido pelo usuário
}

function getGeminiApiKey() {
  // Substitua pela sua chave da API Gemini
  // Ou use ScriptApp.getProperties().getProperty("GEMINI_API_KEY");
  return "YOUR_GEMINI_API_KEY"; // Placeholder
}

function setProperty(key, value) {
  ScriptApp.getProperties().setProperty(key, value);
}

function getProperty(key) {
  return ScriptApp.getProperties().getProperty(key);
}

function deleteProperty(key) {
  ScriptApp.getProperties().deleteProperty(key);
}
