// GoogleCloudLogging.gs
/**
 * @overview Módulo para integração com o Google Cloud Logging para registro de logs avançado.
 *           Permite enviar logs estruturados para o Google Cloud Logging para monitoramento e análise.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID do projeto Google Cloud.
 *   - Logger.gs: Para fallback de logs e registro interno.
 *
 * @integrations
 *   - Google Cloud Logging API: Serviço de logging centralizado.
 *
 * @description
 *   Este módulo estende as capacidades de logging do sistema, permitindo que os logs
 *   sejam enviados para o Google Cloud Logging. Isso oferece um sistema de logging
 *   centralizado e robusto, com recursos avançados de pesquisa, filtragem, análise
 *   e alertas. É ideal para ambientes de produção onde a visibilidade sobre o
 *   comportamento da aplicação e a depuração de problemas são críticas.
 *   Requer a ativação da Cloud Logging API no projeto GCP associado ao Apps Script.
 */

function getCloudProjectId() {
  // O ID do projeto Google Cloud deve ser configurado em Config.gs
  return Config.getProperty('GOOGLE_CLOUD_PROJECT_ID');
}

function sendLogToCloudLogging(logName, severity, message, jsonPayload) {
  var projectId = getCloudProjectId();
  if (!projectId) {
    Logger.log('ERROR', 'ID do projeto Google Cloud não configurado para Cloud Logging.');
    return;
  }

  var url = `https://logging.googleapis.com/v2/projects/${projectId}/entries:write`;
  var logEntry = {
    logName: `projects/${projectId}/logs/${logName}`,
    resource: {
      type: 'global',
      labels: {
        'project_id': projectId
      }
    },
    severity: severity,
    textPayload: message,
    jsonPayload: jsonPayload
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({
      entries: [logEntry]
    }),
    'headers': {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      Logger.log('ERROR', `Falha ao enviar log para Cloud Logging: ${responseCode} - ${response.getContentText()}`);
    }
  } catch (e) {
    Logger.log('ERROR', `Erro ao chamar Cloud Logging API: ${e.message}`);
  }
}

function logInfo(logName, message, jsonPayload) {
  sendLogToCloudLogging(logName, 'INFO', message, jsonPayload);
}

function logWarning(logName, message, jsonPayload) {
  sendLogToCloudLogging(logName, 'WARNING', message, jsonPayload);
}

function logError(logName, message, jsonPayload) {
  sendLogToCloudLogging(logName, 'ERROR', message, jsonPayload);
}
