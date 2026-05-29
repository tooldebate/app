// ErrorHandling.gs
/**
 * @overview Módulo de tratamento de erros padronizado para o sistema de gestão agentica.
 *           Fornece funções para capturar, registrar e responder a erros de forma consistente.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar erros.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo centraliza a lógica de tratamento de erros em todo o sistema.
 *   Ele permite que os erros sejam capturados, registrados de forma detalhada
 *   (incluindo stack traces) e, em seguida, apresentados ao usuário de maneira
 *   amigável, sem expor detalhes internos do sistema. Isso melhora a robustez
 *   da aplicação e facilita a depuração e manutenção.
 */

function handleError(e, functionName) {
  var errorMessage = e.message || "Erro desconhecido.";
  var stackTrace = e.stack || "Não disponível.";
  var userEmail = SessionManagement.getSession() ? SessionManagement.getSession().email : "Não autenticado";

  var logDetails = `Erro na função: ${functionName}\nUsuário: ${userEmail}\nMensagem: ${errorMessage}\nStack Trace: ${stackTrace}`;
  Logger.log("ERROR", logDetails);

  return {
    success: false,
    message: `Ocorreu um erro: ${errorMessage}`,
    detailedError: logDetails // Para depuração, pode ser removido em produção
  };
}

function tryCatch(func, functionName) {
  try {
    return func();
  } catch (e) {
    return handleError(e, functionName);
  }
}
