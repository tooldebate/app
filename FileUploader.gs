// FileUploader.gs
/**
 * @overview Módulo para lidar com o upload de arquivos para o Google Drive.
 *           Fornece funções para receber dados de arquivo do frontend e passá-los
 *           para o módulo de integração com o Drive.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - DriveIntegration.gs: Para realizar o upload real para o Google Drive.
 *   - Auth.gs: Para verificar a autenticação do usuário.
 *   - Logger.gs: Para registrar operações de upload.
 *
 * @integrations
 *   - Google Drive: Armazenamento de arquivos.
 *
 * @description
 *   Este módulo atua como um intermediário para o processo de upload de arquivos.
 *   Ele recebe os dados do arquivo (codificados em base64) e metadados do frontend,
 *   valida a sessão do usuário e, em seguida, invoca as funções apropriadas no
 *   `DriveIntegration.gs` para armazenar o arquivo no Google Drive. Isso garante
 *   que o processo de upload seja seguro e que os arquivos sejam corretamente
 *   associados aos projetos ou usuários.
 */

function handleFileUpload(fileData, fileName, mimeType) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado. Não é possível fazer upload de arquivos.");
  }
  Logger.log(`Tentativa de upload de arquivo: ${fileName} por ${session.email}`);
  return DriveIntegration.uploadFileToDrive(fileData, fileName, mimeType);
}
