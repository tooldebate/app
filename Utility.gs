// Utility.gs
/**
 * @overview Módulo de funções utilitárias gerais para o sistema de gestão agentica.
 *           Contém funções de propósito geral que podem ser usadas em vários módulos.
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
 *   Este módulo agrupa funções utilitárias que são amplamente aplicáveis em todo o sistema.
 *   Ele serve como um repositório para funções que não se encaixam em categorias mais
 *   específicas, mas que são frequentemente necessárias, como manipulação de arrays,
 *   conversões de tipo, e outras operações básicas que promovem a reutilização de código.
 */

function isEmpty(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0);
}

function getUniqueValues(arr) {
  return [...new Set(arr)];
}

function convertToNumber(value) {
  var num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function getPropertyValue(obj, prop, defaultValue) {
  return obj.hasOwnProperty(prop) ? obj[prop] : defaultValue;
}
