// GoogleSheetsAPI.gs
/**
 * @overview Módulo de baixo nível para interagir diretamente com a Google Sheets API (avançado).
 *           Permite operações mais complexas e eficientes do que o SpreadsheetApp padrão.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da Google Planilha.
 *   - Logger.gs: Para registrar chamadas de API.
 *
 * @integrations
 *   - Google Sheets API: Acesso programático avançado a planilhas.
 *
 * @description
 *   Este módulo fornece uma interface para interagir com a Google Sheets API V4,
 *   permitindo operações em lote, formatação avançada e manipulação de dados
 *   em grande escala de forma mais eficiente do que o serviço `SpreadsheetApp`
 *   nativo do Apps Script. É útil para cenários que exigem alta performance
 *   ou funcionalidades que não estão disponíveis no serviço padrão.
 *   Requer a ativação da Google Sheets API no projeto GCP associado ao Apps Script.
 */

function getSheetsService() {
  return GoogleAppsScript.getService().Sheets.v4();
}

function batchUpdateSheet(spreadsheetId, requests) {
  try {
    var sheetsService = getSheetsService();
    var response = sheetsService.spreadsheets.batchUpdate({
      requests: requests
    }, spreadsheetId);
    Logger.log(`Batch update na planilha ${spreadsheetId} realizado com sucesso.`);
    return { success: true, response: response };
  } catch (e) {
    Logger.log(`Erro ao realizar batch update na planilha ${spreadsheetId}: ${e.message}`);
    throw new Error(`Erro ao realizar batch update: ${e.message}`);
  }
}

function getSheetValues(spreadsheetId, range) {
  try {
    var sheetsService = getSheetsService();
    var response = sheetsService.spreadsheets.values.get(spreadsheetId, range);
    Logger.log(`Valores lidos do range ${range} na planilha ${spreadsheetId}.`);
    return { success: true, values: response.values };
  } catch (e) {
    Logger.log(`Erro ao ler valores do range ${range} na planilha ${spreadsheetId}: ${e.message}`);
    throw new Error(`Erro ao ler valores: ${e.message}`);
  }
}

function updateSheetValues(spreadsheetId, range, values) {
  try {
    var sheetsService = getSheetsService();
    var resource = {
      values: values
    };
    var response = sheetsService.spreadsheets.values.update(resource, spreadsheetId, range, {
      valueInputOption: 'RAW'
    });
    Logger.log(`Valores atualizados no range ${range} na planilha ${spreadsheetId}.`);
    return { success: true, response: response };
  } catch (e) {
    Logger.log(`Erro ao atualizar valores no range ${range} na planilha ${spreadsheetId}: ${e.message}`);
    throw new Error(`Erro ao atualizar valores: ${e.message}`);
  }
}
