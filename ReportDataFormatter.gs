// ReportDataFormatter.gs
/**
 * @overview Módulo para formatar dados brutos em estruturas prontas para relatórios.
 *           Converte arrays de objetos em formatos tabulares ou sumarizados para exibição.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Utils.gs: Para formatação de datas e outros utilitários.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo é responsável por pegar os dados brutos obtidos das planilhas
 *   e transformá-los em um formato mais legível e estruturado, adequado para
 *   a geração de relatórios. Ele pode converter arrays de objetos em tabelas HTML,
 *   sumarizar dados numéricos, ou formatar datas e moedas para apresentação.
 *   Isso garante que os relatórios sejam consistentes e fáceis de consumir.
 */

function formatDataAsHtmlTable(dataArray, headers, title) {
  if (!dataArray || dataArray.length === 0) {
    return `<p>${title || "Dados"}: Nenhum registro encontrado.</p>`;
  }

  var html = `<h3>${title || "Tabela de Dados"}</h3>`;
  html += `<table border="1" style="width:100%; border-collapse: collapse;">`;
  html += `<thead><tr>`;
  headers.forEach(function(header) {
    html += `<th style="padding: 8px; text-align: left; background-color: #f2f2f2;">${header}</th>`;
  });
  html += `</tr></thead><tbody>`;

  dataArray.forEach(function(row) {
    html += `<tr>`;
    headers.forEach(function(header) {
      var value = row[header] !== undefined ? row[header] : "";
      // Exemplo de formatação específica para datas
      if (header.includes("Data") && value) {
        value = Utils.formatDate(value);
      }
      html += `<td style="padding: 8px; border: 1px solid #ddd;">${value}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function summarizeNumericData(dataArray, key) {
  var sum = 0;
  var count = 0;
  dataArray.forEach(function(item) {
    if (typeof item[key] === "number") {
      sum += item[key];
      count++;
    }
  });
  return { sum: sum, count: count, average: count > 0 ? sum / count : 0 };
}
