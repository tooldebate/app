// DataProcessor.gs
/**
 * @overview Módulo para funções genéricas de processamento de dados.
 *           Inclui operações como filtragem, mapeamento, redução e ordenação de arrays de objetos.
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
 *   Este módulo fornece um conjunto de funções utilitárias para manipular coleções de dados,
 *   especialmente arrays de objetos que representam linhas de uma planilha. Ele permite
 *   realizar operações comuns de processamento de dados de forma eficiente e reutilizável,
 *   como filtrar itens com base em critérios, transformar a estrutura dos objetos,
 *   agregar valores e ordenar os dados para apresentação ou análise.
 */

function filterArrayOfObjects(arr, key, value) {
  return arr.filter(function(obj) {
    return obj[key] === value;
  });
}

function mapArrayOfObjects(arr, callback) {
  return arr.map(callback);
}

function reduceArrayOfObjects(arr, callback, initialValue) {
  return arr.reduce(callback, initialValue);
}

function sortArrayOfObjects(arr, key, ascending) {
  return arr.sort(function(a, b) {
    var valA = a[key];
    var valB = b[key];
    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });
}

function groupArrayOfObjects(arr, key) {
  return arr.reduce(function(acc, obj) {
    var groupKey = obj[key];
    (acc[groupKey] = acc[groupKey] || []).push(obj);
    return acc;
  }, {});
}
