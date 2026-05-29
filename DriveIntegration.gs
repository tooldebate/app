// DriveIntegration.gs
/**
 * @overview Módulo de integração com o Google Drive para o sistema de gestão agentica.
 *           Contém funções para gerenciar arquivos (upload, download, listagem) em uma pasta específica do Google Drive,
 *           cujo ID é configurado nas variáveis de ambiente do Apps Script.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da pasta do Google Drive.
 *   - Logger.gs: Para registrar operações do Google Drive.
 *
 * @integrations
 *   - Google Drive API: Gerenciamento de arquivos e pastas.
 *
 * @description
 *   Este módulo facilita a interação do sistema com o Google Drive, permitindo que os usuários
 *   façam upload de documentos relacionados a projetos, baixem arquivos existentes e visualizem
 *   o conteúdo de uma pasta específica. Isso garante que todos os recursos do projeto
 *   estejam centralizados e acessíveis, aproveitando a infraestrutura de armazenamento do Google.
 *   O `DRIVE_FOLDER_ID` deve ser configurado como uma propriedade de script (`ScriptProperties`)
 *   ou variável de ambiente no projeto Google Apps Script.
 */

function getDriveFolderId() {
  // O ID da pasta do Drive deve ser configurado como uma propriedade de script ou variável de ambiente.
  // Exemplo: ScriptApp.getProperties().getProperty("DRIVE_FOLDER_ID");
  // Para este projeto, assumimos que está em Config.gs
  return Config.getDriveFolderId();
}

function uploadFileToDrive(fileData, fileName, mimeType) {
  var driveFolderId = getDriveFolderId();
  if (!driveFolderId) {
    throw new Error("ID da pasta do Google Drive não configurado.");
  }

  try {
    var folder = DriveApp.getFolderById(driveFolderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType, fileName);
    var file = folder.createFile(blob);
    Logger.log(`Arquivo ${fileName} (${file.getId()}) enviado para o Google Drive por ${SessionManagement.getSession().email}`);
    return { success: true, message: "Arquivo enviado com sucesso.", fileId: file.getId(), fileUrl: file.getUrl() };
  } catch (e) {
    Logger.log(`Erro ao enviar arquivo para o Google Drive: ${e.message}`);
    throw new Error(`Erro ao enviar arquivo para o Google Drive: ${e.message}`);
  }
}

function listFilesInDriveFolder() {
  var driveFolderId = getDriveFolderId();
  if (!driveFolderId) {
    throw new Error("ID da pasta do Google Drive não configurado.");
  }

  try {
    var folder = DriveApp.getFolderById(driveFolderId);
    var files = folder.getFiles();
    var fileList = [];
    while (files.hasNext()) {
      var file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        mimeType: file.getMimeType(),
        dateCreated: file.getDateCreated().toISOString()
      });
    }
    return fileList;
  } catch (e) {
    Logger.log(`Erro ao listar arquivos do Google Drive: ${e.message}`);
    throw new Error(`Erro ao listar arquivos do Google Drive: ${e.message}`);
  }
}

function downloadFileFromDrive(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    Logger.log(`Arquivo ${file.getName()} (${file.getId()}) baixado do Google Drive por ${SessionManagement.getSession().email}`);
    return { success: true, fileName: file.getName(), mimeType: file.getMimeType(), data: Utilities.base64Encode(blob.getBytes()) };
  } catch (e) {
    Logger.log(`Erro ao baixar arquivo do Google Drive: ${e.message}`);
    throw new Error(`Erro ao baixar arquivo do Google Drive: ${e.message}`);
  }
}
