/**
 * Config.gs — Configuração central do web app "Um conto por aluno".
 *
 * Camada de configuração: lê as Script Properties (PLANILHA_DAS_DIRETRIZES e
 * GEMINI_API_KEY), define os nomes das abas, os status e os utilitários de
 * acesso à planilha usados por todas as outras camadas. Mantém toda a
 * persistência centralizada na planilha indicada por PLANILHA_DAS_DIRETRIZES.
 */

/** Constantes gerais do aplicativo. */
const CONFIG = {
  ABA_DIRETRIZES: 'Diretrizes',          // aba 1 — matriz de regras dos contos
  ABA_RESPOSTAS: 'Respostas',            // aba 2 — respostas das crianças
  COL_ID_DIRETRIZ: 'ID',                 // cabeçalho da coluna de ID em Diretrizes
  COL_TITULO_DIRETRIZ: 'Titulo',         // cabeçalho do título em Diretrizes (sem acento, conforme planilha)
  TOTAL_DIRETRIZES_ESPERADO: 300,        // 300 crianças = 300 diretrizes (CT-001..CT-300)

  USAR_GEMINI: true,                     // true: Gemini escolhe a diretriz; fallback sequencial se falhar
  // O modelo NÃO fica aqui: é lido da Script Property GEMINI_MODEL via
  // GeminiModelConfig (fonte única, sem fallback hardcoded). Veja toolDebateModel_().

  GERAR_CONTO: true,                     // gera rascunho; Drive somente apos revisao e aprovacao
  CONTO_MAX_CARACTERES: 2500,            // limite do corpo do conto (questionário)

  TITULO_APP: 'Um conto por aluno — EC 115 Norte'
};

/** Status de processamento gravados na aba Respostas. */
var STATUS = {
  REGISTRADO: 'Registrado',
  GERANDO: 'Gerando conto…',
  AGUARDANDO_REVISAO: 'Pendente de revisão humana',
  CONTO_GERADO: 'Conto gerado',
  ERRO_CONTO: 'Erro ao gerar conto',
  SEM_DIRETRIZ: 'Sem diretriz disponível'
};

/** Como a diretriz foi escolhida (rastreabilidade). */
var METODO_SELECAO = {
  GEMINI: 'Gemini',
  SEQUENCIAL: 'Sequencial'
};

/** Acesso às propriedades de script. */
function _props() {
  try {
    return PropertiesService.getScriptProperties();
  } catch (error) {
    Logger.log("Erro em _props: " + error.message);
    throw error;
  }
}

/** ID da planilha das diretrizes (obrigatório). */
function getPlanilhaId() {
  try {
    var id = _props().getProperty('PLANILHA_DAS_DIRETRIZES');
    if (!id) {
      throw new Error('Script Property "PLANILHA_DAS_DIRETRIZES" não definida. ' +
        'Configure-a em Configurações do projeto > Propriedades do script.');
    }
    return id;
  } catch (error) {
    Logger.log("Erro em getPlanilhaId: " + error.message);
    throw error;
  }
}

/** Chave da API Gemini (opcional — vazia desativa a seleção por IA). */
function getGeminiApiKey() {
  try {
    return _props().getProperty('GEMINI_API_KEY') || '';
  } catch (error) {
    Logger.log("Erro em getGeminiApiKey: " + error.message);
    throw error;
  }
}

/** ID da pasta do Drive onde os contos .txt são salvos. */
function getPastaContosId() {
  try {
    var props = _props();
    var id = props.getProperty('FOLDER_ID') ||
      props.getProperty('PASTA_DOS_CONTOS') ||
      props.getProperty('OUTPUT_FOLDER_ID') ||
      props.getProperty('DRIVE_FOLDER_ID');
    if (!id) {
      throw new Error('Script Property FOLDER_ID não configurada para salvar os contos no Drive.');
    }
    return String(id).trim();
  } catch (error) {
    Logger.log("Erro em getPastaContosId: " + error.message);
    throw error;
  }
}

/**
 * ID da pasta usada pelo player de acervo.
 * Pode apontar para uma curadoria separada; por padrão reutiliza a pasta
 * onde os contos produzidos pelo projeto já são gravados.
 */
function getPastaAcervoContosId() {
  try {
    return _props().getProperty('PASTA_ACERVO_CONTOS') || getPastaContosId();
  } catch (error) {
    Logger.log("Erro em getPastaAcervoContosId: " + error.message);
    throw error;
  }
}

/** Abre a planilha configurada. */
function abrirPlanilha() {
  try {
    return SpreadsheetApp.openById(getPlanilhaId());
  } catch (error) {
    Logger.log("Erro em abrirPlanilha: " + error.message);
    throw error;
  }
}

/**
 * Planilha canônica do projeto, válida tanto no editor quanto no web app.
 * Ponte esperada por serviços da frota (ex.: SchoolRealityAnalyticsService) que,
 * por padrão, recorreriam a SpreadsheetApp.getActiveSpreadsheet() — que é NULL
 * num script standalone servindo doGet. Centralizar aqui evita esse buraco.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getProjectSpreadsheet() {
  return abrirPlanilha();
}

/**
 * Devolve uma aba pelo nome.
 *
 * A correspondência é tolerante: tenta o nome exato e, em seguida, ignora
 * espaços nas pontas e diferenças de maiúsculas/minúsculas. Isso evita o erro
 * comum de uma aba renomeada como "diretrizes" ou "Diretrizes " (com espaço)
 * derrubar a carga inteira. Se mesmo assim não houver correspondência, o erro
 * lista as abas existentes e o ID da planilha, para diagnóstico rápido.
 *
 * @param {string} nome Nome da aba.
 * @param {boolean} criarSeFaltar Cria a aba se ela não existir.
 */
function obterAba(nome, criarSeFaltar) {
  try {
    // Nome inválido (ex.: CONFIG.ABA_* indefinido) jamais deve virar uma aba
    // "undefined" nem ser criado em branco. Falha cedo, com causa explícita.
    if (nome == null || String(nome).trim() === '') {
      throw new Error('obterAba() recebeu um nome de aba vazio/indefinido. ' +
        'Provável causa: uma constante CONFIG.ABA_* não está definida no código ' +
        'publicado (verifique se o Config.gs implantado define ABA_DIRETRIZES e ABA_RESPOSTAS).');
    }

    var ss = abrirPlanilha();
    var aba = ss.getSheetByName(nome);

    if (!aba) {
      var alvo = String(nome == null ? '' : nome).trim().toLowerCase();
      var existentes = ss.getSheets();
      for (var i = 0; i < existentes.length; i++) {
        if (existentes[i].getName().trim().toLowerCase() === alvo) {
          aba = existentes[i];
          break;
        }
      }
    }

    if (!aba && criarSeFaltar) {
      aba = ss.insertSheet(nome);
    }
    if (!aba) {
      var nomes = ss.getSheets().map(function (s) { return '"' + s.getName() + '"'; });
      throw new Error('Aba "' + nome + '" não encontrada na planilha das diretrizes ' +
        '(ID ' + getPlanilhaId() + '). Abas existentes: ' +
        (nomes.length ? nomes.join(', ') : '(nenhuma)') + '. ' +
        'Verifique se a Script Property PLANILHA_DAS_DIRETRIZES aponta para a ' +
        'planilha certa e se há uma aba chamada "' + nome + '".');
    }
    return aba;
  } catch (error) {
    Logger.log("Erro em obterAba: " + error.message);
    throw error;
  }
}
