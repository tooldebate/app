// DashboardUtils.gs
/**
 * @overview Módulo de utilitários para processamento de dados de dashboard no sistema de gestão agentica.
 *           Contém funções para formatar, agregar e preparar dados para exibição em dashboards.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Utils.gs: Para funções utilitárias gerais.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo fornece funções auxiliares para o processamento de dados que serão
 *   apresentados nos dashboards de administrador e funcionário. Ele pode incluir
 *   lógica para calcular percentuais, formatar números, agrupar dados por categorias
 *   e outras transformações necessárias para tornar os dados compreensíveis e visuais.
 *   O objetivo é manter a lógica de apresentação separada da lógica de negócios principal.
 */

function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return (part / total) * 100;
}

function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function aggregateDataByStatus(dataArray, statusField) {
  var aggregated = {};
  dataArray.forEach(function(item) {
    var status = item[statusField] || "Desconhecido";
    aggregated[status] = (aggregated[status] || 0) + 1;
  });
  return aggregated;
}

function getTopNItems(dataArray, key, n) {
  // Ordena e retorna os N primeiros itens com base em uma chave numérica
  return dataArray.sort(function(a, b) { return b[key] - a[key]; }).slice(0, n);
}
