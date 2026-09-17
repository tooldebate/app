/**
 * Dados sintéticos — Tool Debate - Um conto por aluno
 * Gerado em 2026-06-21 01:10:44 por generate_synthetic_data_all_projects.py
 *
 * Execute populateSyntheticData() PELO EDITOR do Apps Script para popular
 * as abas de domínio com ~30 registros cada (valida os gráficos do notebook).
 * Idempotente: limpa as linhas de dados antes de reinserir.
 *
 * NÃO define onOpen() — para não colidir com o menu real do projeto.
 */

function populateSyntheticData() {
  try {
    try {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var results = [];

        // Contos
        try {
          var sheet_Contos = ss.getSheetByName('Contos') || ss.insertSheet('Contos');
          if (sheet_Contos.getLastRow() > 1) {
            sheet_Contos.deleteRows(2, sheet_Contos.getLastRow() - 1);
          }
          var h_sheet_Contos = ["ID", "Titulo", "Autor", "Tema", "Palavras", "NotaAvaliacao", "Status", "DataEnvio"];
          sheet_Contos.getRange(1, 1, 1, h_sheet_Contos.length).setValues([h_sheet_Contos]);
          var d_sheet_Contos = [
            ["CON-0001", "Prática", "Gabriela Rocha", "D", 1071, 5.5, "ativo", "2026-05-12 01:10:44"],
            ["CON-0002", "Revisão", "Ana Silva", "A", 1828, 5.6, "inativo", "2026-05-15 01:10:44"],
            ["CON-0003", "Avaliação", "Henrique Alves", "A", 716, 5.2, "ativo", "2026-05-15 01:10:44"],
            ["CON-0004", "Conceitos", "Bruno Santos", "C", 1375, 5.0, "ativo", "2026-05-10 01:10:44"],
            ["CON-0005", "Introdução", "Felipe Costa", "B", 286, 6.3, "ativo", "2026-05-01 01:10:44"],
            ["CON-0006", "Revisão", "Eduarda Lima", "D", 1008, 8.9, "inativo", "2026-05-12 01:10:44"],
            ["CON-0007", "Conceitos", "Bruno Santos", "B", 1148, 8.0, "ativo", "2026-04-30 01:10:44"],
            ["CON-0008", "Avaliação", "Gabriela Rocha", "C", 409, 7.1, "inativo", "2026-06-15 01:10:44"],
            ["CON-0009", "Conceitos", "Diego Souza", "D", 787, 9.8, "inativo", "2026-05-22 01:10:44"],
            ["CON-0010", "Revisão", "Eduarda Lima", "B", 677, 9.2, "ativo", "2026-05-25 01:10:44"],
            ["CON-0011", "Conceitos", "Diego Souza", "C", 1393, 7.8, "ativo", "2026-05-13 01:10:44"],
            ["CON-0012", "Avaliação", "Ana Silva", "A", 1657, 9.1, "ativo", "2026-06-11 01:10:44"],
            ["CON-0013", "Avaliação", "Carla Oliveira", "A", 638, 7.3, "inativo", "2026-04-30 01:10:44"],
            ["CON-0014", "Revisão", "Carla Oliveira", "A", 382, 7.1, "ativo", "2026-05-10 01:10:44"],
            ["CON-0015", "Introdução", "Eduarda Lima", "A", 1940, 9.7, "ativo", "2026-06-06 01:10:44"],
            ["CON-0016", "Prática", "Henrique Alves", "B", 429, 5.4, "inativo", "2026-06-20 01:10:44"],
            ["CON-0017", "Revisão", "Eduarda Lima", "A", 1869, 9.1, "ativo", "2026-05-18 01:10:44"],
            ["CON-0018", "Avaliação", "Eduarda Lima", "C", 1295, 5.7, "ativo", "2026-05-24 01:10:44"],
            ["CON-0019", "Prática", "Diego Souza", "D", 1238, 6.9, "ativo", "2026-05-18 01:10:44"],
            ["CON-0020", "Conceitos", "Ana Silva", "A", 731, 7.7, "inativo", "2026-05-22 01:10:44"],
            ["CON-0021", "Prática", "Henrique Alves", "A", 1897, 9.2, "ativo", "2026-05-28 01:10:44"],
            ["CON-0022", "Revisão", "Bruno Santos", "C", 1419, 7.0, "ativo", "2026-04-23 01:10:44"],
            ["CON-0023", "Conceitos", "Henrique Alves", "C", 1820, 5.8, "inativo", "2026-05-17 01:10:44"],
            ["CON-0024", "Revisão", "Carla Oliveira", "D", 1687, 8.8, "inativo", "2026-05-10 01:10:44"],
            ["CON-0025", "Introdução", "Eduarda Lima", "A", 1405, 6.8, "ativo", "2026-06-05 01:10:44"],
            ["CON-0026", "Introdução", "Gabriela Rocha", "A", 926, 7.1, "inativo", "2026-04-25 01:10:44"],
            ["CON-0027", "Revisão", "Diego Souza", "B", 1198, 6.4, "ativo", "2026-05-31 01:10:44"],
            ["CON-0028", "Avaliação", "Felipe Costa", "A", 1795, 9.7, "inativo", "2026-06-10 01:10:44"],
            ["CON-0029", "Prática", "Ana Silva", "D", 1637, 8.2, "inativo", "2026-05-28 01:10:44"],
            ["CON-0030", "Revisão", "Diego Souza", "C", 1452, 7.1, "ativo", "2026-05-24 01:10:44"]
          ];
          sheet_Contos.getRange(2, 1, d_sheet_Contos.length, h_sheet_Contos.length).setValues(d_sheet_Contos);
          results.push('OK Contos: ' + d_sheet_Contos.length + ' registros');
        } catch (e) {
          results.push('ERRO Contos: ' + e.message);
        }

        // TemasPublicacao
        try {
          var sheet_TemasPublicacao = ss.getSheetByName('TemasPublicacao') || ss.insertSheet('TemasPublicacao');
          if (sheet_TemasPublicacao.getLastRow() > 1) {
            sheet_TemasPublicacao.deleteRows(2, sheet_TemasPublicacao.getLastRow() - 1);
          }
          var h_sheet_TemasPublicacao = ["ID", "Nome", "Categoria", "QtdContos", "Status", "CreatedAt"];
          sheet_TemasPublicacao.getRange(1, 1, 1, h_sheet_TemasPublicacao.length).setValues([h_sheet_TemasPublicacao]);
          var d_sheet_TemasPublicacao = [
            ["TEM-0001", "Eduarda Lima", "categoria_2", 5, "inativo", "2026-06-19 01:10:44"],
            ["TEM-0002", "Carla Oliveira", "categoria_3", 7, "inativo", "2026-06-02 01:10:44"],
            ["TEM-0003", "Carla Oliveira", "categoria_3", 38, "ativo", "2026-04-01 01:10:44"],
            ["TEM-0004", "Gabriela Rocha", "categoria_3", 35, "ativo", "2026-06-20 01:10:44"],
            ["TEM-0005", "Diego Souza", "categoria_3", 35, "inativo", "2026-04-13 01:10:44"],
            ["TEM-0006", "Diego Souza", "categoria_1", 28, "ativo", "2026-05-18 01:10:44"],
            ["TEM-0007", "Gabriela Rocha", "categoria_4", 10, "inativo", "2026-04-04 01:10:44"],
            ["TEM-0008", "Bruno Santos", "categoria_4", 2, "ativo", "2026-06-09 01:10:44"],
            ["TEM-0009", "Eduarda Lima", "categoria_1", 14, "ativo", "2026-04-06 01:10:44"],
            ["TEM-0010", "Diego Souza", "categoria_3", 43, "ativo", "2026-05-25 01:10:44"],
            ["TEM-0011", "Gabriela Rocha", "categoria_1", 15, "ativo", "2026-04-21 01:10:44"],
            ["TEM-0012", "Gabriela Rocha", "categoria_1", 22, "ativo", "2026-05-20 01:10:44"],
            ["TEM-0013", "Ana Silva", "categoria_3", 21, "ativo", "2026-04-30 01:10:44"],
            ["TEM-0014", "Felipe Costa", "categoria_1", 11, "ativo", "2026-05-16 01:10:44"],
            ["TEM-0015", "Eduarda Lima", "categoria_4", 10, "ativo", "2026-06-05 01:10:44"],
            ["TEM-0016", "Bruno Santos", "categoria_4", 21, "ativo", "2026-05-27 01:10:44"],
            ["TEM-0017", "Eduarda Lima", "categoria_3", 2, "inativo", "2026-04-30 01:10:44"],
            ["TEM-0018", "Bruno Santos", "categoria_4", 49, "inativo", "2026-06-12 01:10:44"],
            ["TEM-0019", "Carla Oliveira", "categoria_3", 39, "ativo", "2026-04-12 01:10:44"],
            ["TEM-0020", "Ana Silva", "categoria_4", 30, "ativo", "2026-06-08 01:10:44"],
            ["TEM-0021", "Eduarda Lima", "categoria_1", 29, "ativo", "2026-04-29 01:10:44"],
            ["TEM-0022", "Bruno Santos", "categoria_2", 21, "ativo", "2026-05-01 01:10:44"],
            ["TEM-0023", "Gabriela Rocha", "categoria_3", 35, "inativo", "2026-04-03 01:10:44"],
            ["TEM-0024", "Diego Souza", "categoria_4", 45, "inativo", "2026-05-12 01:10:44"],
            ["TEM-0025", "Gabriela Rocha", "categoria_3", 45, "ativo", "2026-05-10 01:10:44"],
            ["TEM-0026", "Felipe Costa", "categoria_3", 21, "ativo", "2026-06-06 01:10:44"],
            ["TEM-0027", "Bruno Santos", "categoria_2", 47, "ativo", "2026-06-13 01:10:44"],
            ["TEM-0028", "Henrique Alves", "categoria_3", 16, "inativo", "2026-03-24 01:10:44"],
            ["TEM-0029", "Ana Silva", "categoria_3", 8, "ativo", "2026-04-21 01:10:44"],
            ["TEM-0030", "Bruno Santos", "categoria_4", 44, "ativo", "2026-05-22 01:10:44"]
          ];
          sheet_TemasPublicacao.getRange(2, 1, d_sheet_TemasPublicacao.length, h_sheet_TemasPublicacao.length).setValues(d_sheet_TemasPublicacao);
          results.push('OK TemasPublicacao: ' + d_sheet_TemasPublicacao.length + ' registros');
        } catch (e) {
          results.push('ERRO TemasPublicacao: ' + e.message);
        }

        // Publicacoes
        try {
          var sheet_Publicacoes = ss.getSheetByName('Publicacoes') || ss.insertSheet('Publicacoes');
          if (sheet_Publicacoes.getLastRow() > 1) {
            sheet_Publicacoes.deleteRows(2, sheet_Publicacoes.getLastRow() - 1);
          }
          var h_sheet_Publicacoes = ["ID", "Data", "Conto", "Tipo", "Visualizacoes", "Curtidas", "Status"];
          sheet_Publicacoes.getRange(1, 1, 1, h_sheet_Publicacoes.length).setValues([h_sheet_Publicacoes]);
          var d_sheet_Publicacoes = [
            ["PUB-0001", "2026-04-29 01:10:44", "D", "tipo_a", 215, 160, "ativo"],
            ["PUB-0002", "2026-05-26 01:10:44", "B", "tipo_a", 263, 296, "ativo"],
            ["PUB-0003", "2026-06-01 01:10:44", "C", "tipo_c", 28, 194, "inativo"],
            ["PUB-0004", "2026-06-21 01:10:44", "A", "tipo_a", 304, 335, "ativo"],
            ["PUB-0005", "2026-05-01 01:10:44", "B", "tipo_b", 271, 497, "ativo"],
            ["PUB-0006", "2026-06-10 01:10:44", "A", "tipo_b", 471, 192, "inativo"],
            ["PUB-0007", "2026-05-09 01:10:44", "C", "tipo_c", 441, 285, "inativo"],
            ["PUB-0008", "2026-05-25 01:10:44", "D", "tipo_b", 25, 167, "inativo"],
            ["PUB-0009", "2026-06-05 01:10:44", "B", "tipo_a", 419, 404, "ativo"],
            ["PUB-0010", "2026-06-01 01:10:44", "D", "tipo_b", 250, 387, "inativo"],
            ["PUB-0011", "2026-05-31 01:10:44", "A", "tipo_c", 230, 400, "ativo"],
            ["PUB-0012", "2026-05-03 01:10:44", "C", "tipo_a", 98, 400, "ativo"],
            ["PUB-0013", "2026-05-25 01:10:44", "B", "tipo_a", 438, 400, "ativo"],
            ["PUB-0014", "2026-06-05 01:10:44", "D", "tipo_b", 401, 66, "ativo"],
            ["PUB-0015", "2026-05-03 01:10:44", "D", "tipo_b", 358, 148, "ativo"],
            ["PUB-0016", "2026-06-15 01:10:44", "D", "tipo_c", 171, 309, "ativo"],
            ["PUB-0017", "2026-06-07 01:10:44", "A", "tipo_a", 355, 477, "inativo"],
            ["PUB-0018", "2026-06-11 01:10:44", "B", "tipo_a", 89, 77, "ativo"],
            ["PUB-0019", "2026-06-10 01:10:44", "D", "tipo_b", 493, 451, "inativo"],
            ["PUB-0020", "2026-05-08 01:10:44", "D", "tipo_b", 205, 68, "ativo"],
            ["PUB-0021", "2026-05-13 01:10:44", "A", "tipo_b", 14, 53, "ativo"],
            ["PUB-0022", "2026-06-10 01:10:44", "C", "tipo_c", 51, 47, "ativo"],
            ["PUB-0023", "2026-04-24 01:10:44", "C", "tipo_c", 408, 264, "inativo"],
            ["PUB-0024", "2026-06-18 01:10:44", "A", "tipo_c", 7, 55, "inativo"],
            ["PUB-0025", "2026-05-15 01:10:44", "D", "tipo_b", 364, 253, "ativo"],
            ["PUB-0026", "2026-06-09 01:10:44", "A", "tipo_a", 295, 304, "ativo"],
            ["PUB-0027", "2026-05-24 01:10:44", "A", "tipo_b", 228, 69, "inativo"],
            ["PUB-0028", "2026-05-02 01:10:44", "C", "tipo_a", 326, 415, "inativo"],
            ["PUB-0029", "2026-06-17 01:10:44", "B", "tipo_c", 56, 470, "ativo"],
            ["PUB-0030", "2026-06-18 01:10:44", "B", "tipo_c", 128, 117, "inativo"]
          ];
          sheet_Publicacoes.getRange(2, 1, d_sheet_Publicacoes.length, h_sheet_Publicacoes.length).setValues(d_sheet_Publicacoes);
          results.push('OK Publicacoes: ' + d_sheet_Publicacoes.length + ' registros');
        } catch (e) {
          results.push('ERRO Publicacoes: ' + e.message);
        }

        Logger.log(results.join('\n'));
        return results;
      } catch (error) {
        Logger.log("Erro em populateSyntheticData: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em populateSyntheticData: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em populateSyntheticData: " + error.message);
    throw error;
  }
}
