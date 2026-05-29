// GoogleDriveUtils.gs
/**
 * @overview Módulo de utilitários gerais para operações com o Google Drive.
 *           Fornece funções auxiliares para manipulação de arquivos e pastas no Drive.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar operações do Drive.
 *
 * @integrations
 *   - Google Drive API: Operações de baixo nível com o Drive.
 *
 * @description
 *   Este módulo contém funções utilitárias que complementam o `GoogleDriveService.gs`
 *   e `DriveIntegration.gs`. Ele oferece funcionalidades como verificar a existência
 *   de arquivos/pastas, obter metadados, mover e copiar itens, e gerenciar permissões.
 *   O objetivo é fornecer um conjunto abrangente de ferramentas para interagir com
 *   o Google Drive de forma flexível e robusta.
 */

function fileExists(fileId) {
  try {
    DriveApp.getFileById(fileId);
    return true;
  } catch (e) {
    return false;
  }
}

function folderExists(folderId) {
  try {
    DriveApp.getFolderById(folderId);
    return true;
  } catch (e) {
    return false;
  }
}

function getFileMetadata(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    return {
      id: file.getId(),
      name: file.getName(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      dateCreated: file.getDateCreated().toISOString(),
      url: file.getUrl()
    };
  } catch (e) {
    Logger.log(`Erro ao obter metadados do arquivo ID ${fileId}: ${e.message}`);
    return null;
  }
}

function copyFile(fileId, destinationFolderId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var destinationFolder = DriveApp.getFolderById(destinationFolderId);
    var copiedFile = file.makeCopy(destinationFolder);
    Logger.log(`Arquivo ID ${fileId} copiado para a pasta ID ${destinationFolderId}. Novo ID: ${copiedFile.getId()}`);
    return { success: true, newFileId: copiedFile.getId() };
  } catch (e) {
    Logger.log(`Erro ao copiar arquivo ID ${fileId}: ${e.message}`);
    throw new Error(`Erro ao copiar arquivo: ${e.message}`);
  }
}

function moveFile(fileId, destinationFolderId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var destinationFolder = DriveApp.getFolderById(destinationFolderId);
    file.moveTo(destinationFolder);
    Logger.log(`Arquivo ID ${fileId} movido para a pasta ID ${destinationFolderId}.`);
    return { success: true };
  } catch (e) {
    Logger.log(`Erro ao mover arquivo ID ${fileId}: ${e.message}`);
    throw new Error(`Erro ao mover arquivo: ${e.message}`);
  }
}
