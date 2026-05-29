// GoogleSheetsFormatter.gs
/**
 * @overview Módulo para formatação avançada de células e intervalos na Google Planilha.
 *           Permite aplicar estilos, cores, validações de dados e formatação condicional.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SpreadsheetService.gs: Para interagir com a Google Planilha.
 *   - Logger.gs: Para registrar operações de formatação.
 *
 * @integrations
 *   - Google Sheets API: Formatação programática de planilhas.
 *
 * @description
 *   Este módulo fornece funções para aplicar formatação sofisticada às células
 *   e intervalos da Google Planilha. Isso inclui a definição de cores de fundo,
 *   estilos de fonte, bordas, alinhamento, validação de dados e regras de
 *   formatação condicional. A formatação aprimora a legibilidade dos dados
 *   e pode ser usada para destacar informações importantes, como tarefas
 *   atrasadas ou projetos de alta prioridade.
 */

function applyHeaderFormatting(sheetName) {
  try {
    var sheet = SpreadsheetService.getSheetByName(sheetName);
    var range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    range.setBackground("#4285F4"); // Azul Google
    range.setFontColor("#FFFFFF"); // Branco
    range.setFontWeight("bold");
    range.setHorizontalAlignment("center");
    Logger.log(`Formatação de cabeçalho aplicada à aba "${sheetName}".`);
    return { success: true, message: "Formatação de cabeçalho aplicada." };
  } catch (e) {
    Logger.log(`Erro ao aplicar formatação de cabeçalho: ${e.message}`);
    throw new Error(`Erro ao aplicar formatação de cabeçalho: ${e.message}`);
  }
}

function applyConditionalFormattingForOverdueTasks(sheetName, dueDateColumnIndex, statusColumnIndex) {
  try {
    var sheet = SpreadsheetService.getSheetByName(sheetName);
    var range = sheet.getDataRange();
    var rule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND(INDIRECT("R[0]C${statusColumnIndex}",FALSE)<>"Concluída", INDIRECT("R[0]C${dueDateColumnIndex}",FALSE)<TODAY())`)
        .setBackground("#FFEBEE") // Vermelho claro
        .setFontColor("#D32F2F") // Vermelho escuro
        .setRanges([range])
        .build();
    var rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
    Logger.log(`Formatação condicional para tarefas atrasadas aplicada à aba "${sheetName}".`);
    return { success: true, message: "Formatação condicional aplicada." };
  } catch (e) {
    Logger.log(`Erro ao aplicar formatação condicional: ${e.message}`);
    throw new Error(`Erro ao aplicar formatação condicional: ${e.message}`);
  }
}

function applyDataValidationToList(sheetName, range, items) {
  try {
    var sheet = SpreadsheetService.getSheetByName(sheetName);
    var cellRange = sheet.getRange(range);
    var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(items)
        .setAllowInvalid(false)
        .setHelpText("Selecione um item da lista.")
        .build();
    cellRange.setDataValidation(rule);
    Logger.log(`Validação de dados por lista aplicada ao range ${range} na aba "${sheetName}".`);
    return { success: true, message: "Validação de dados aplicada." };
  } catch (e) {
    Logger.log(`Erro ao aplicar validação de dados: ${e.message}`);
    throw new Error(`Erro ao aplicar validação de dados: ${e.message}`);
  }
}
