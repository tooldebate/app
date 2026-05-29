// FileDownloader.gs
/**
 * @overview Módulo para lidar com o download de arquivos do Google Drive.
 *           Fornece funções para solicitar um arquivo do Drive e retorná-lo ao frontend.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - DriveIntegration.gs: Para realizar o download real do Google Drive.
 *   - Auth.gs: Para verificar a autenticação do usuário.
 *   - Logger.gs: Para registrar operações de download.
 *
 * @integrations
 *   - Google Drive: Armazenamento de arquivos.
 *
 * @description
 *   Este módulo atua como um intermediário para o processo de download de arquivos.
 *   Ele recebe o ID do arquivo do frontend, valida a sessão do usuário e, em seguida,
 *   invoca as funções apropriadas no `DriveIntegration.gs` para recuperar o arquivo
 *   do Google Drive. O arquivo é então retornado ao cliente, geralmente codificado
 *   em base64 para transmissão via JavaScript.
 */

function handleFileDownload(fileId) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado. Não é possível baixar arquivos.");
  }
  Logger.log(`Tentativa de download do arquivo ID: ${fileId} por ${session.email}`);
  return DriveIntegration.downloadFileFromDrive(fileId);
}
