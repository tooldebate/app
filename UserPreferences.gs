// UserPreferences.gs
/**
 * @overview Módulo para gerenciar as preferências do usuário no sistema de gestão agentica.
 *           Permite que os usuários configurem opções personalizadas, como tema, notificações,
 *           e outras configurações específicas de sua conta.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - SessionManagement.gs: Para identificar o usuário logado.
 *   - SpreadsheetService.gs: Para armazenar as preferências na planilha (ou usar UserProperties).
 *   - Logger.gs: Para registrar alterações nas preferências.
 *
 * @integrations
 *   - Google Sheets (opcional): Armazenamento de preferências.
 *   - Google Apps Script UserProperties: Armazenamento de preferências por usuário.
 *
 * @description
 *   Este módulo permite que cada usuário personalize sua experiência no sistema.
 *   As preferências podem incluir configurações de interface, frequência de notificações,
 *   e outras opções que melhoram a usabilidade individual. As preferências são armazenadas
 *   de forma persistente, seja em uma aba dedicada na Google Planilha ou utilizando
 *   o `PropertiesService.getUserProperties()` do Apps Script, garantindo que as
 *   configurações sejam mantidas entre as sessões.
 */

function getUserPreferences() {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  // Usar UserProperties para preferências individuais é mais adequado que a planilha para este caso.
  var userProperties = PropertiesService.getUserProperties();
  var preferences = {
    theme: userProperties.getProperty("theme") || "light",
    emailNotifications: userProperties.getProperty("emailNotifications") === "true",
    // Adicionar outras preferências aqui
  };
  Logger.log(`Preferências do usuário ${session.email} recuperadas.`);
  return preferences;
}

function saveUserPreferences(newPreferences) {
  var session = SessionManagement.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }
  var userProperties = PropertiesService.getUserProperties();
  for (var key in newPreferences) {
    userProperties.setProperty(key, newPreferences[key].toString());
  }
  Logger.log(`Preferências do usuário ${session.email} salvas: ${JSON.stringify(newPreferences)}`);
  return { success: true, message: "Preferências salvas com sucesso." };
}
