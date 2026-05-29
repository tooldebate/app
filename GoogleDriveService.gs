// GoogleDriveService.gs
/**
 * @overview Módulo de serviço de baixo nível para interagir com a API do Google Drive.
 *           Fornece funções para operações CRUD em arquivos e pastas no Google Drive.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da pasta raiz do Drive.
 *   - Logger.gs: Para registrar operações do Drive.
 *
 * @integrations
 *   - Google Drive API: Acesso programático a arquivos e pastas.
 *
 * @description
 *   Este módulo oferece uma camada de abstração para as operações da API do Google Drive.
 *   Ele lida com a autenticação e as chamadas de API para criar, ler, atualizar e excluir
 *   arquivos e pastas. É uma versão mais genérica e de baixo nível que o `DriveIntegration.gs`,
 *   que se concentra em casos de uso específicos do sistema.
 */

function getRootDriveFolderId() {
  return Config.getDriveFolderId();
}

function createDriveFolder(folderName, parentFolderId) {
  try {
    var parentFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
    var newFolder = parentFolder.createFolder(folderName);
    Logger.log(`Pasta '${folderName}' criada com ID: ${newFolder.getId()}`);
    return { success: true, id: newFolder.getId(), name: newFolder.getName(), url: newFolder.getUrl() };
  } catch (e) {
    Logger.log(`Erro ao criar pasta no Drive: ${e.message}`);
    throw new Error(`Erro ao criar pasta no Drive: ${e.message}`);
  }
}

function getDriveFolderByName(folderName, parentFolderId) {
  var parentFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return null;
}

function uploadFile(fileBlob, parentFolderId) {
  try {
    var parentFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
    var file = parentFolder.createFile(fileBlob);
    Logger.log(`Arquivo '${file.getName()}' (${file.getId()}) enviado para o Drive.`);
    return { success: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
  } catch (e) {
    Logger.log(`Erro ao fazer upload de arquivo para o Drive: ${e.message}`);
    throw new Error(`Erro ao fazer upload de arquivo para o Drive: ${e.message}`);
  }
}

function getFileById(fileId) {
  try {
    return DriveApp.getFileById(fileId);
  } catch (e) {
    Logger.log(`Erro ao obter arquivo do Drive por ID ${fileId}: ${e.message}`);
    return null;
  }
}

function deleteDriveFile(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    Logger.log(`Arquivo ID ${fileId} movido para a lixeira.`);
    return { success: true, message: "Arquivo movido para a lixeira." };
  } catch (e) {
    Logger.log(`Erro ao deletar arquivo do Drive: ${e.message}`);
    throw new Error(`Erro ao deletar arquivo do Drive: ${e.message}`);
  }
}
