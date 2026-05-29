// GoogleDrivePicker.gs
/**
 * @overview Módulo para integrar o Google Drive Picker no frontend.
 *           Permite que os usuários selecionem arquivos do Google Drive diretamente da interface web.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter a chave da API do Google e o ID do cliente OAuth.
 *   - Logger.gs: Para registrar eventos do Picker.
 *
 * @integrations
 *   - Google Drive Picker API: Seleção de arquivos do Drive.
 *
 * @description
 *   Este módulo facilita a seleção de arquivos do Google Drive a partir da interface
 *   do usuário do sistema. Ele integra o Google Drive Picker, uma ferramenta que
 *   permite aos usuários navegar e selecionar arquivos de seu Google Drive. Isso é
 *   útil para anexar documentos a projetos, tarefas ou avaliações, garantindo que
 *   os arquivos relevantes estejam sempre acessíveis e vinculados ao contexto correto.
 *   Requer a configuração da Google API Key e do OAuth Client ID no projeto.
 */

function getDrivePickerConfig() {
  return {
    apiKey: Config.getProperty('GOOGLE_API_KEY'),
    clientId: Config.getProperty('GOOGLE_OAUTH_CLIENT_ID')
  };
}

function getDrivePickerHtml() {
  return HtmlService.createHtmlOutputFromFile('DrivePicker').getContent();
}
