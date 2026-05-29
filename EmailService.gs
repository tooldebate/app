// EmailService.gs
/**
 * @overview Módulo de serviço de e-mail para o sistema de gestão agentica.
 *           Fornece uma interface para enviar e-mails de forma programática.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Logger.gs: Para registrar o envio de e-mails.
 *
 * @integrations
 *   - Google MailApp: Serviço nativo do Google Apps Script para envio de e-mails.
 *
 * @description
 *   Este módulo encapsula a funcionalidade de envio de e-mails, permitindo que outras
 *   partes do sistema enviem notificações, relatórios ou outras comunicações por e-mail.
 *   Ele utiliza o serviço `MailApp` do Google Apps Script, que permite enviar e-mails
 *   em nome do usuário que executa o script. A centralização dessa funcionalidade
 *   facilita a manutenção e a padronização das comunicações por e-mail do sistema.
 */

function sendEmail(recipient, subject, body, options) {
  try {
    MailApp.sendEmail(recipient, subject, body, options);
    Logger.log(`E-mail enviado para: ${recipient} com assunto: ${subject}`);
    return { success: true, message: "E-mail enviado com sucesso." };
  } catch (e) {
    Logger.log(`Erro ao enviar e-mail para ${recipient}: ${e.message}`);
    throw new Error(`Falha ao enviar e-mail: ${e.message}`);
  }
}

