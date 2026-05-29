"""// AnalyticsService.gs
/**
 * @overview Módulo para coletar e analisar dados de uso do sistema de gestão agentica.
 *           Registra eventos de interação do usuário e fornece insights sobre o uso da aplicação.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar eventos de análise.
 *   - SessionManagement.gs: Para identificar o usuário que realiza a ação.
 *
 * @integrations
 *   - Google Sheets: Armazenamento de dados de análise (opcional, ou pode ser enviado para Google Analytics).
 *
 * @description
 *   Este módulo é projetado para coletar dados anônimos ou pseudônimos sobre como os usuários
 *   interagem com o sistema. Ele pode registrar quais funcionalidades são mais utilizadas,
 *   o tempo gasto em diferentes seções, e outros padrões de uso. Esses dados são valiosos
 *   para entender o comportamento do usuário, identificar áreas de melhoria na interface
 *   e otimizar a experiência geral do sistema. Os dados podem ser armazenados em uma
 *   aba específica da planilha ou enviados para uma ferramenta de análise externa.
 */

function trackEvent(eventName, eventCategory, eventLabel, eventValue) {
  var session = SessionManagement.getSession();
  var userId = session ? session.id : 'N/A';
  var userEmail = session ? session.email : 'N/A';
  var timestamp = new Date().toISOString();

  var eventData = [
    Utilities.getUuid(),
    timestamp,
    userId,
    userEmail,
    eventName,
    eventCategory,
    eventLabel,
    eventValue
  ];

  try {
    var analyticsSheet = SpreadsheetService.getSheetByName('Analytics');
    // Garante que os cabeçalhos da aba Analytics suportam os campos
    var headers = analyticsSheet.getRange(1, 1, 1, analyticsSheet.getLastColumn()).getValues()[0];
    var expectedHeaders = ["ID", "Timestamp", "UsuarioID", "UsuarioEmail", "Evento", "Categoria", "Label", "Valor"];
    if (headers.join(',') !== expectedHeaders.join(',')) {
      Logger.log("WARN", "Cabeçalhos da aba 'Analytics' não correspondem ao formato esperado.");
    }
    analyticsSheet.appendRow(eventData);
    Logger.log(`ANALYTICS: Evento '${eventName}' registrado por ${userEmail}`);
  } catch (e) {
    Logger.log("ERROR", `Falha ao registrar evento de análise na planilha: ${e.message}. Evento original: ${JSON.stringify(eventData)}`);
  }
}

function getUsageStatistics() {
  if (!isAdmin()) {
    throw new Error("Apenas administradores podem acessar estatísticas de uso.");
  }
  var analyticsSheet = SpreadsheetService.getSheetByName('Analytics');
  var data = analyticsSheet.getDataRange().getValues();
  var headers = data[0];
  var events = [];

  for (var i = 1; i < data.length; i++) {
    var event = {};
    headers.forEach(function(header, index) {
      event[header] = data[i][index];
    });
    events.push(event);
  }

  // Exemplo de agregação: contar eventos por categoria
  var categoryCounts = {};
  events.forEach(function(event) {
    categoryCounts[event.Categoria] = (categoryCounts[event.Categoria] || 0) + 1;
  });

  return { totalEvents: events.length, categoryCounts: categoryCounts };
}
"""
