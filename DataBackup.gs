// DataBackup.gs
/**
 * @overview Módulo para realizar backups dos dados da Google Planilha.
 *           Cria cópias da planilha em intervalos regulares e as armazena no Google Drive.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da Google Planilha e da pasta do Drive.
 *   - Logger.gs: Para registrar operações de backup.
 *
 * @integrations
 *   - Google Sheets: Fonte dos dados para backup.
 *   - Google Drive: Destino dos arquivos de backup.
 *   - Google Apps Script Triggers: Acionado por gatilhos baseados em tempo.
 *
 * @description
 *   Este módulo é essencial para a resiliência do sistema, garantindo que os dados
 *   críticos da Google Planilha sejam regularmente copiados. Ele cria uma cópia
 *   completa da planilha e a salva em uma pasta designada no Google Drive.
 *   Isso protege contra perda de dados devido a erros humanos, corrupção de dados
 *   ou outros problemas inesperados, permitindo a recuperação do sistema para um
 *   estado anterior, se necessário.
 */

function backupSpreadsheetData() {
  var spreadsheetId = Config.getSpreadsheetId();
  var driveFolderId = Config.getDriveFolderId();

  if (!spreadsheetId || !driveFolderId) {
    Logger.log("ERROR", "IDs da Planilha ou Pasta do Drive não configurados para backup.");
    throw new Error("IDs da Planilha ou Pasta do Drive não configurados.");
  }

  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var backupName = `Backup_${spreadsheet.getName()}_${new Date().toISOString().replace(/:/g, "-")}`;
    var backupFile = DriveApp.getFileById(spreadsheetId).makeCopy(backupName, DriveApp.getFolderById(driveFolderId));

    Logger.log(`Backup da planilha '${spreadsheet.getName()}' criado: ${backupFile.getName()} (${backupFile.getId()})`);
    return { success: true, message: "Backup realizado com sucesso.", fileId: backupFile.getId() };
  } catch (e) {
    Logger.log("ERROR", `Erro ao realizar backup da planilha: ${e.message}`);
    throw new Error(`Erro ao realizar backup da planilha: ${e.message}`);
  }
}
