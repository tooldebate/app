// Utils.gs
/**
 * @overview Módulo de funções utilitárias diversas para o sistema de gestão agentica.
 *           Contém funções genéricas que podem ser reutilizadas em diferentes partes do sistema,
 *           como formatação de datas, manipulação de strings, etc.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies Nenhuma.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo agrupa funções de uso geral que não se encaixam em módulos específicos.
 *   O objetivo é promover a reutilização de código e manter a base de código limpa e organizada.
 *   Exemplos incluem funções para formatar datas para exibição, validar formatos de e-mail
 *   ou gerar identificadores únicos (UUIDs).
 */

function formatDate(dateString) {
  if (!dateString) return "";
  var date = new Date(dateString);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

function generateUuid() {
  return Utilities.getUuid();
}

function isValidEmail(email) {
  var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(String(email).toLowerCase());
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
