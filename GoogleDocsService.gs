// GoogleDocsService.gs
/**
 * @overview Módulo de integração com o Google Docs para gerenciamento de documentos.
 *           Permite criar, ler e atualizar documentos do Google Docs.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da pasta do Drive.
 *   - Logger.gs: Para registrar operações do Docs.
 *
 * @integrations
 *   - Google Docs API: Gerenciamento de documentos.
 *
 * @description
 *   Este módulo facilita a criação e manipulação de documentos de texto no Google Docs.
 *   Pode ser usado para gerar relatórios formatados, criar modelos de documentos
 *   ou extrair conteúdo de documentos existentes. A integração com o Google Docs
 *   permite que o sistema gerencie e utilize documentos de forma programática,
 *   aproveitando os recursos de colaboração e formatação do Google Docs.
 */

function createDocument(title, content, parentFolderId) {
  try {
    var doc = DocumentApp.create(title);
    doc.getBody().setText(content);
    doc.saveAndClose();

    var file = DriveApp.getFileById(doc.getId());
    if (parentFolderId) {
      var parentFolder = DriveApp.getFolderById(parentFolderId);
      file.moveTo(parentFolder);
    }

    Logger.log(`Documento '${title}' (${file.getId()}) criado no Google Docs.`);
    return { success: true, message: "Documento criado com sucesso.", fileId: file.getId(), fileUrl: file.getUrl() };
  } catch (e) {
    Logger.log(`Erro ao criar documento no Google Docs: ${e.message}`);
    throw new Error(`Erro ao criar documento no Google Docs: ${e.message}`);
  }
}

function getDocumentContent(fileId) {
  try {
    var doc = DocumentApp.openById(fileId);
    var content = doc.getBody().getText();
    doc.saveAndClose();
    Logger.log(`Conteúdo do documento ID ${fileId} lido.`);
    return { success: true, content: content };
  } catch (e) {
    Logger.log(`Erro ao ler conteúdo do documento ID ${fileId}: ${e.message}`);
    throw new Error(`Erro ao ler conteúdo do documento: ${e.message}`);
  }
}

function updateDocumentContent(fileId, newContent) {
  try {
    var doc = DocumentApp.openById(fileId);
    doc.getBody().clear().setText(newContent);
    doc.saveAndClose();
    Logger.log(`Conteúdo do documento ID ${fileId} atualizado.`);
    return { success: true, message: "Documento atualizado com sucesso." };
  } catch (e) {
    Logger.log(`Erro ao atualizar conteúdo do documento ID ${fileId}: ${e.message}`);
    throw new Error(`Erro ao atualizar conteúdo do documento: ${e.message}`);
  }
}
