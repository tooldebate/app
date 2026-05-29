// SpreadsheetService.gs
/**
 * @overview Módulo de serviço para interação de baixo nível com a Google Planilha.
 *           Fornece funções para acessar planilhas e abas específicas, ler e escrever dados,
 *           e gerenciar a estrutura da planilha (criação de abas, cabeçalhos).
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da Google Planilha.
 *   - Logger.gs: Para registrar operações na planilha.
 *
 * @integrations
 *   - Google Sheets API: Acesso programático a planilhas.
 *
 * @description
 *   Este módulo é a camada de abstração para todas as operações de leitura e escrita
 *   na Google Planilha central. Ele garante que as interações com a planilha sejam
 *   consistentes e robustas, lidando com a obtenção da planilha pelo ID, acesso a abas
 *   específicas e manipulação de dados. Também inclui uma função para criar a estrutura
 *   inicial da planilha, garantindo que todas as abas e cabeçalhos necessários estejam presentes.
 */

function getSpreadsheetId() {
  // O ID da planilha deve ser configurado como uma propriedade de script ou variável de ambiente.
  // Exemplo: ScriptApp.getProperties().getProperty("SPREADSHEETS_ID");
  // Para este projeto, assumimos que está em Config.gs
  return Config.getSpreadsheetId();
}

function getSpreadsheet() {
  var spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error("ID da Google Planilha não configurado.");
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getSheetByName(sheetName) {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`A aba "${sheetName}" não foi encontrada na planilha.`);
  }
  return sheet;
}

function createSheetStructure() {
  var spreadsheet = getSpreadsheet();
  var sheetsToCreate = {
    "Usuários": ["ID", "Nome", "Email", "Senha", "Role", "Ativo"],
    "Projetos": ["ID", "NomeProjeto", "Descricao", "Status", "DataInicio", "DataFim", "ResponsavelID"],
    "Tarefas": ["ID", "ProjetoID", "Descricao", "ResponsavelID", "Prazo", "Status"],
    "Avaliações": ["ID", "ProjetoID", "UsuarioID", "DataAvaliacao", "Pontuacao", "Comentarios", "GeminiFeedback"],
    "Logs": ["ID", "Timestamp", "UsuarioID", "Acao", "Detalhes"]
  };

  for (var sheetName in sheetsToCreate) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow(sheetsToCreate[sheetName]);
      Logger.log(`Aba "${sheetName}" criada com cabeçalhos.`);
    } else {
      Logger.log(`Aba "${sheetName}" já existe.`);
      // Opcional: verificar e adicionar cabeçalhos ausentes
    }
  }
  return { success: true, message: "Estrutura da planilha verificada/criada com sucesso." };
}

function appendRowToSheet(sheetName, rowData) {
  var sheet = getSheetByName(sheetName);
  sheet.appendRow(rowData);
  Logger.log(`Linha adicionada à aba "${sheetName}".`);
}

function getRowDataById(sheetName, id) {
  var sheet = getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("ID");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      var row = {};
      headers.forEach(function(header, index) {
        row[header] = data[i][index];
      });
      return { row: row, rowIndex: i + 1 }; // Retorna o objeto da linha e o índice real da linha
    }
  }
  return null;
}

function updateRowInSheet(sheetName, rowIndex, rowData) {
  var sheet = getSheetByName(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = [];
  headers.forEach(function(header) {
    newRow.push(rowData[header] || "");
  });
  sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  Logger.log(`Linha ${rowIndex} atualizada na aba "${sheetName}".`);
}

function deleteRowInSheet(sheetName, rowIndex) {
  var sheet = getSheetByName(sheetName);
  sheet.deleteRow(rowIndex);
  Logger.log(`Linha ${rowIndex} deletada da aba "${sheetName}".`);
}
