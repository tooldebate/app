/**
 * WebApp.gs — Ponto de entrada do web app (HTML Service) e API do cliente.
 *
 * Camada de controle de fluxo: serve a interface (doGet), expõe os endpoints
 * chamados por google.script.run e orquestra validação + seleção de diretriz +
 * registro na planilha. A seção crítica é serializada por LockService para que
 * duas submissões quase simultâneas nunca recebam a mesma diretriz.
 */

/**
 * Rotas administrativas servidas por ?page= (mesma origem do web app). A rota
 * padrão (sem page) é sempre o questionário "Um conto por aluno". Centralizar o
 * roteamento aqui torna cada painel da frota alcançável de verdade pela URL:
 *   ?page=features → AdminFeatures (micro-jornal: recomendações, temas, aprovações)
 *   ?page=reality  → SchoolRealityAnalyticsPanel (analítica da realidade escolar)
 *   ?page=maturity → BackendMaturityHtml (auto-avaliação de maturidade do backend)
 *   ?page=fleet    → observabilidade da frota (somente leitura, renderizada aqui)
 */
var PAGINAS_ADMIN_ = {
  features: { arquivo: 'AdminFeatures',               titulo: 'Funcionalidades' },
  reality:  { arquivo: 'SchoolRealityAnalyticsPanel', titulo: 'Realidade da escola' },
  maturity: {
    arquivo: 'BackendMaturityHtml',
    titulo:  'Maturidade do backend',
    preparar: function (tpl) {
      // O template injeta `var report = <?!= initialReport ?>;` — sem um valor
      // JSON válido o script quebra. Em falha, injeta `null` e a página recarrega
      // sozinha pelo botão "Atualizar".
      try {
        tpl.initialReport = JSON.stringify(runBackendMaturityAssessment({ skipWrite: true }));
      } catch (e) {
        tpl.initialReport = 'null';
      }
    }
  }
};

/** Serve a entrada autenticada, o questionário ou um painel administrativo. */
function doGet(e) {
  // FLEET_FRAGMENT_BOOTSTRAP: o token fica no fragmento (#tok=), que não é
  // enviado ao servidor. O shell valida o token antes de chamar qualquer API.
  var fleetBootstrapPage = e && e.parameter && String(e.parameter.page || '') === 'app';
  var fleetBootstrapToken = e && e.parameter && e.parameter.tok;
  if (fleetBootstrapPage && !fleetBootstrapToken) {
    var fleetTemplates = ['Index', 'index', 'Dashboard'];
    for (var fleetI = 0; fleetI < fleetTemplates.length; fleetI++) {
      try {
        var fleetTemplate = HtmlService.createTemplateFromFile(fleetTemplates[fleetI]);
        fleetTemplate.authToken = '';
        fleetTemplate.tok = '';
        fleetTemplate.sessionUser = {};
        fleetTemplate.data = { scriptUrl: ScriptApp.getService().getUrl() };
        return fleetTemplate.evaluate()
          .setTitle('Tool Debate - Um conto por aluno')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      } catch (fleetTemplateError) {}
    }
    return HtmlService.createHtmlOutput('Aplicação indisponível.');
  }
  try {
    try {
      var page = (e && e.parameter && e.parameter.page) || '';
      // Token de sessao passado na URL pelo cliente apos login bem-sucedido.
      // Usamos ScriptProperties (por instancia) em vez de UserProperties (por usuario
      // Google), corrigindo o compartilhamento de sessao em deployments "Execute as: Me".
      var tok  = (e && e.parameter && e.parameter.tok)  || '';

      if (page === 'login') {
        return renderLogin_();
      }

      if (page === 'app') {
        return isAuthenticatedByToken(tok) ? renderApp_(tok) : renderLogin_();
      }

      var def = PAGINAS_ADMIN_[page];
      if (page === 'fleet' || def) {
        var adminSession = tok ? getSessionUser(tok) : null;
        var adminRole = adminSession
          ? String(adminSession.role || adminSession.perfil || '').toLowerCase().trim()
          : '';
        if (!adminSession || adminRole !== 'admin') {
          return renderLogin_();
        }
        if (page === 'fleet') {
          return renderPaginaFrota_();
        }
        var tpl = HtmlService.createTemplateFromFile(def.arquivo);
        if (def.preparar) def.preparar(tpl);
        return tpl.evaluate()
          .setTitle(def.titulo)
          .addMetaTag('viewport', 'width=device-width, initial-scale=1')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }

      return isAuthenticatedByToken(tok) ? renderApp_(tok) : renderLogin_();
    } catch (err) {
      var msg = (err && err.message) ? err.message : String(err);
      var stack = (err && err.stack) ? err.stack : '';
      Logger.log('doGet erro: ' + msg + '\n' + stack);
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
        '<style>body{font-family:system-ui,sans-serif;background:#15171c;color:#eef1f5;' +
        'padding:32px;max-width:720px;margin:auto}h1{color:#f2a6ad}pre{background:#20242b;' +
        'padding:16px;border-radius:8px;overflow:auto;font-size:13px;color:#aeb7c4}</style></head>' +
        '<body><h1>Erro ao carregar a página</h1><p>' +
        'Não foi possível carregar esta página agora. Tente novamente em instantes.' +
        '</p></body></html>'
      ).setTitle('Erro | Tool Debate')
       .addMetaTag('viewport', 'width=device-width, initial-scale=1')
       .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  } catch (error) {
    Logger.log("Erro em doGet: " + error.message);
    throw error;
  }
}

/** Tela inicial minimalista compartilhando o mesmo contrato de autenticacao. */
function renderLogin_() {
  try {
    try {
      var tpl = HtmlService.createTemplateFromFile('Login');
      // O Login.html usa <?!= JSON.stringify(data.scriptUrl || getScriptUrl()) ?>,
      // portanto 'data' precisa ser injetado antes de evaluate().
      tpl.data = { scriptUrl: getScriptUrl_() };
      return tpl.evaluate()
        .setTitle('Entrar | ' + CONFIG.TITULO_APP)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      Logger.log("Erro em renderLogin_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em renderLogin_: " + error.message);
    throw error;
  }
}

/** URL canonica do deployment atual (usada pelo Login para redirecionar apos autenticacao). */
function getScriptUrl_() {
  try {
    try {
      return ScriptApp.getService().getUrl();
    } catch (e) {
      return '';
    }
  } catch (error) {
    Logger.log("Erro em getScriptUrl_: " + error.message);
    throw error;
  }
}

/** Aplicacao principal, acessivel apenas com sessao valida. */
function renderApp_(tok) {
  try {
    var session = getSessionUser(tok || '') || {};
    var tpl = HtmlService.createTemplateFromFile('Index');
    tpl.sessionUsername = session.username || '';
    tpl.authToken = tok || '';
    tpl.baseUrl = getScriptUrl_();
    return tpl
      .evaluate()
      .setTitle(CONFIG.TITULO_APP)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log("Erro em renderApp_: " + error.message);
    throw error;
  }
}

/** Página somente-leitura de observabilidade da frota (FROTA-10). */
function renderPaginaFrota_() {
  try {
    var resumo = null;
    try {
      resumo = FleetObservabilityService.getMetricsSummary({ periodDays: 7 });
    } catch (e) {
      console.error('Resumo da frota indisponível: ' + ((e && e.message) ? e.message : e));
    }
    return HtmlService.createHtmlOutput(montarHtmlFrota_(resumo))
      .setTitle('Observabilidade da frota')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log("Erro em renderPaginaFrota_: " + error.message);
    throw error;
  }
}

/** Monta o HTML (autossuficiente) do painel da frota a partir do resumo. */
function montarHtmlFrota_(r) {
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function pct(v) { return Math.round((Number(v) || 0) * 100) + '%'; }

  var estilo = '<style>' +
    'body{font-family:system-ui,-apple-system,sans-serif;background:#0b1020;color:#e2e8f0;margin:0;padding:32px}' +
    'h1{font-size:20px;margin:0 0 4px}.sub{color:#94a3b8;font-size:13px;margin:0 0 24px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}' +
    '.card{background:#151b2e;border:1px solid #232a42;border-radius:10px;padding:16px}' +
    '.rotulo{color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em}' +
    '.valor{font-size:24px;font-weight:600;margin-top:6px}' +
    'h2{font-size:15px;margin:28px 0 8px}.ok{color:#4ade80}ul{margin:0;padding-left:18px}' +
    '</style>';

  if (!r) {
    return '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">' + estilo +
      '</head><body><h1>Observabilidade da frota</h1>' +
      '<p class="sub">Métricas indisponíveis (verifique a Script Property ' +
      'AI_AUDIT_SPREADSHEET_ID e os serviços da frota).</p></body></html>';
  }

  var k = r.kpis || {};
  var q = r.quota || {};
  var cards = [
    ['Chamadas (' + esc(r.period_days) + 'd)', esc(k.total_calls)],
    ['Taxa de sucesso', pct(k.success_rate)],
    ['Taxa de fallback', pct(k.fallback_rate)],
    ['Taxa de erro', pct(k.error_rate)],
    ['Latência média', esc(k.avg_latency_ms) + ' ms'],
    ['Revisões pendentes', esc(k.pending_reviews)],
    ['Aprovados', esc(k.approved)],
    ['Rejeitados', esc(k.rejected)],
    ['Quota diária', esc(q.used) + '/' + esc(q.limit) + ' (' + pct(q.pct) + ')']
  ].map(function (c) {
    return '<div class="card"><div class="rotulo">' + c[0] +
      '</div><div class="valor">' + c[1] + '</div></div>';
  }).join('');

  var alertas = (r.alerts && r.alerts.length)
    ? '<ul>' + r.alerts.map(function (a) {
        return '<li>' + esc(a.code) + (a.message ? ' — ' + esc(a.message) : '') + '</li>';
      }).join('') + '</ul>'
    : '<p class="ok">Nenhum alerta ativo.</p>';

  return '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">' + estilo +
    '</head><body>' +
    '<h1>Observabilidade da frota — ' + esc(r.project) + '</h1>' +
    '<p class="sub">Janela de ' + esc(r.period_days) + ' dias · atualizado em ' + esc(r.timestamp) + '</p>' +
    '<div class="grid">' + cards + '</div>' +
    '<h2>Alertas</h2>' + alertas +
    '</body></html>';
}

/** Inclui arquivos .html (CSS/JS) dentro do Index via templating. */
function include(nome) {
  try {
    return HtmlService.createHtmlOutputFromFile(nome).getContent();
  } catch (error) {
    Logger.log("Erro em include: " + error.message);
    throw error;
  }
}

/**
 * Dados iniciais para o cliente: título, perguntas e progresso de atribuição.
 * Também garante o cabeçalho da aba "Respostas" logo na abertura.
 */
function apiObterDadosIniciais(tok) {
  var principal = requireAuthenticatedPrincipal_(tok || '');
  var draft = null;
  try { draft = StoryPublicationService.getCurrent(tok || ''); } catch (ignored) {}
  montarAbaRespostas();
  return {
    titulo: CONFIG.TITULO_APP,
    perguntas: obterPerguntas(),
    progresso: calcularProgresso_(),
    estudante: estadoCriacaoEstudante_(principal, draft)
  };
}

/**
 * Estado do aluno autenticado para o módulo "Criar um conto": quem é e se já
 * respondeu (cada aluno cria um único conto). O Index só é servido com sessão
 * válida, então normalmente há um principal; o fallback mantém o cliente estável.
 * @return {{autenticado:boolean, jaRespondeu:boolean, identificacao:string}}
 */
function estadoCriacaoEstudante_(principal, draft) {
  try {
    if (!principal) {
      return { autenticado: false, jaRespondeu: false, identificacao: '' };
    }
    var perfil = resolverPerfilLeitorAutenticado_(principal);
    var registros = (perfil && perfil.perfilQuestionario)
      ? Number(perfil.perfilQuestionario.totalRegistros) || 0
      : 0;
    return {
      autenticado: true,
      jaRespondeu: registros > 0,
      rascunho: draft || null,
      identificacao: (perfil && perfil.identificacao) ||
        identidadeEstudanteParaResposta_(principal)
    };
  } catch (error) {
    Logger.log("Erro em estadoCriacaoEstudante_: " + error.message);
    throw error;
  }
}

/**
 * Recebe a submissão do formulário, atribui UMA diretriz única e grava a linha
 * na aba "Respostas".
 *
 * @param {Object} submissao { respostas:{id->opção}, identificacao, idade, comentario }
 * @return {Object} Resultado com o aluno, a diretriz atribuída e o progresso.
 */
function apiRegistrarResposta(tok, submissao) {
  var principal = requireAuthenticatedPrincipal_(tok || '');
  validarSubmissao_(submissao);

  if (CONFIG.GERAR_CONTO) {
    if (submissao.consentAcknowledged !== true) {
      throw new Error('Confirme o uso opcional de IA para gerar o rascunho do conto.');
    }
    if (!getGeminiApiKey()) throw new Error('Gemini não configurado; nenhuma resposta foi registrada.');
    ConsentService.check(principal.username || principal.userId, 'generative');
  }

  // Seção crítica curta: reserva a diretriz única e grava a linha (status inicial).
  var reserva = reservarDiretrizERegistrar_(submissao, principal);

  // Fora do lock: gera somente o rascunho (a chamada à IA pode demorar).
  // A publicação no Drive acontece depois, via apiPublicarConto.
  var conto = null, erroConto = null, review = null;
  if (CONFIG.GERAR_CONTO) {
    try {
      conto = gerarConto(submissao.respostas, reserva.diretriz);
      var envelope = HumanReviewService.decorateResult(
        'tool_debate.story',
        {},
        conto.corpo,
        { ownerId: String(principal.username || principal.userId || '') }
      );
      review = envelope.review;
      StoryPublicationService.bindDraft(review.id, principal, reserva, conto);
      atualizarLinhaResposta(reserva.linha, {
        'Status': STATUS.AGUARDANDO_REVISAO,
        'Título do Conto': conto.titulo
      });
    } catch (e) {
      // A resposta + diretriz continuam gravadas (diretriz já consumida); marca erro.
      erroConto = (e && e.message) ? e.message : String(e);
      console.error('Falha ao gerar/salvar o conto (' + reserva.idAluno + '): ' + erroConto);
      atualizarLinhaResposta(reserva.linha, { 'Status': STATUS.ERRO_CONTO });
    }
  }

  return {
    ok: true,
    idAluno: reserva.idAluno,
    linha: reserva.linha,
    metodo: reserva.metodo,
    diretriz: montarDiretrizParaCliente_(reserva.diretriz),
    conto: conto ? {
      titulo: conto.titulo,
      caracteres: conto.corpo.length,
      arquivo: '',
      link: '',
      perguntas: [],
      rascunho: true,
      review: review
    } : null,
    erroConto: erroConto,
    progresso: calcularProgresso_()
  };
}

/**
 * Seção crítica serializada: seleciona UMA diretriz livre e grava a linha já com
 * a diretriz "consumida" (a próxima criança não a recebe). O conto é gerado
 * depois, fora do lock, para não segurar o bloqueio durante a chamada à IA.
 */
function reservarDiretrizERegistrar_(submissao, principal) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (principal && contarRespostasDoEstudante_(principal) > 0) {
        throw new Error('Você já criou o seu conto. Cada aluno cria um único conto. ' +
          'Use a aba "Ouvir o acervo" para ler os contos da turma.');
      }
      var selecao = selecionarDiretrizUnica(submissao.respostas);
      var idAluno = gerarIdAluno();
      // Quando há aluno autenticado, gravamos a identidade estável (username) na
      // coluna "Identificação". É esse vínculo que permite ao player do acervo
      // reencontrar as respostas deste aluno e ordenar os contos pelo gosto dele.
      var identificacao = principal
        ? identidadeEstudanteParaResposta_(principal)
        : limpar_(submissao.identificacao);
      var linha = registrarLinhaResposta({
        timestamp: new Date(),
        idAluno: idAluno,
        identificacao: identificacao,
        idade: limpar_(submissao.idade),
        respostas: submissao.respostas,
        comentario: limpar_(submissao.comentario),
        metodo: selecao.metodo,
        status: CONFIG.GERAR_CONTO ? STATUS.GERANDO : STATUS.REGISTRADO,
        diretriz: selecao.diretriz
      });
      return { idAluno: idAluno, linha: linha, diretriz: selecao.diretriz, metodo: selecao.metodo };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log("Erro em reservarDiretrizERegistrar_: " + error.message);
    throw error;
  }
}

/**
 * Prepara a diretriz para o cliente: id, título e TODOS os demais campos
 * (rótulo + valor), para o painel de confirmação exibir tudo o que foi gravado.
 */
function montarDiretrizParaCliente_(diretriz) {
  try {
    var campos = [];
    obterColunasDiretriz().forEach(function (h) {
      if (h === CONFIG.COL_TITULO_DIRETRIZ) return; // título é exibido à parte
      var v = diretriz[h];
      campos.push({ rotulo: h, valor: v != null ? String(v) : '' });
    });
    return {
      id: diretriz._id,
      titulo: diretriz[CONFIG.COL_TITULO_DIRETRIZ] || '',
      campos: campos
    };
  } catch (error) {
    Logger.log("Erro em montarDiretrizParaCliente_: " + error.message);
    throw error;
  }
}

/** Progresso de consumo das diretrizes (para a barra do cabeçalho). */
function calcularProgresso_() {
  var atribuidas = lerDiretrizesAtribuidas().length;
  var total = CONFIG.TOTAL_DIRETRIZES_ESPERADO;
  return {
    atribuidas: atribuidas,
    total: total,
    disponiveis: Math.max(0, total - atribuidas)
  };
}

/**
 * Validação de entrada: todas as perguntas respondidas e cada resposta dentro
 * das opções válidas. Lança erro com mensagem amigável (mostrada ao usuário).
 */
function validarSubmissao_(submissao) {
  try {
    if (!submissao || typeof submissao !== 'object') {
      throw new Error('Submissão inválida.');
    }
    var respostas = submissao.respostas || {};

    var faltando = obterPerguntas().filter(function (p) {
      var v = respostas[p.id];
      return v == null || String(v).trim() === '';
    });
    if (faltando.length > 0) {
      throw new Error('Responda todas as perguntas. Faltam: ' +
        faltando.map(function (p) { return p.coluna; }).join(', ') + '.');
    }

    obterPerguntas().forEach(function (p) {
      var resposta = respostas[p.id];
    
      // Para múltipla escolha, valida cada opção do array
      if (p.multipla === true) {
        if (!Array.isArray(resposta) || resposta.length === 0) {
          throw new Error('Opção inválida para "' + p.coluna + '".');
        }
        // Verifica se todas as opções selecionadas são válidas
        for (var i = 0; i < resposta.length; i++) {
          if (p.opcoes.indexOf(resposta[i]) === -1) {
            throw new Error('Opção inválida para "' + p.coluna + '".');
          }
        }
        // Verifica o limite máximo de escolhas
        if (p.maxEscolhas && resposta.length > p.maxEscolhas) {
          throw new Error('Você pode escolher no máximo ' + p.maxEscolhas + ' opções para "' + p.coluna + '".');
        }
      } else {
        // Para escolha única, valida a string diretamente
        if (p.opcoes.indexOf(resposta) === -1) {
          throw new Error('Opção inválida para "' + p.coluna + '".');
        }
      }
    });
  } catch (error) {
    Logger.log("Erro em validarSubmissao_: " + error.message);
    throw error;
  }
}

/** Normaliza um campo de texto opcional. */
function limpar_(valor) {
  try {
    return valor == null ? '' : String(valor).trim();
  } catch (error) {
    Logger.log("Erro em limpar_: " + error.message);
    throw error;
  }
}

/**
 * Retorna o status agregado de geração de contos da turma para o painel
 * de acompanhamento do professor na aba "Criar um conto".
 *
 * Lê a aba Respostas e conta por status da coluna "Status do Conto".
 * Não expõe nomes, emails ou identificadores de alunos.
 *
 * @return {{ total:number, gerando:number, prontos:number, erros:number }}
 */
function getStatusTurma() {
  try {
    try {
      try {
        var sheet = obterAbaRespostas_();
        if (!sheet || sheet.getLastRow() <= 1) {
          return { total: 0, gerando: 0, prontos: 0, erros: 0 };
        }
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var colStatus = -1;
        for (var i = 0; i < headers.length; i++) {
          if (String(headers[i]).toLowerCase().replace(/\s/g, '_') === 'status_do_conto' ||
              String(headers[i]).toLowerCase() === 'status') {
            colStatus = i;
            break;
          }
        }
        var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        var total = data.length;
        var gerando = 0, prontos = 0, erros = 0;
        data.forEach(function(row) {
          var status = colStatus >= 0 ? String(row[colStatus] || '').toLowerCase() : '';
          if (status.indexOf('gerando') >= 0 || status.indexOf('pendente') >= 0) { gerando++; }
          else if (status.indexOf('pronto') >= 0 || status.indexOf('ok') >= 0 || status.indexOf('conclu') >= 0) { prontos++; }
          else if (status.indexOf('erro') >= 0 || status.indexOf('falha') >= 0) { erros++; }
        });
        return { total: total, gerando: gerando, prontos: prontos, erros: erros };
      } catch (e) {
        Logger.log('getStatusTurma erro: ' + e.message);
        return { total: 0, gerando: 0, prontos: 0, erros: 0 };
      }
    } catch (error) {
      Logger.log("Erro em getStatusTurma: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getStatusTurma: " + error.message);
    throw error;
  }
}

/** Retorna a aba Respostas (alias interno para compatibilidade). */
function obterAbaRespostas_() {
  try {
    try {
      try {
        var ss = SpreadsheetApp.openById(
          PropertiesService.getScriptProperties().getProperty('PLANILHA_DAS_DIRETRIZES') ||
          PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
        );
        return ss ? (ss.getSheetByName(CONFIG.ABA_RESPOSTAS || 'Respostas') || null) : null;
      } catch (e) {
        return null;
      }
    } catch (error) {
      Logger.log("Erro em obterAbaRespostas_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em obterAbaRespostas_: " + error.message);
    throw error;
  }
}

/**
 * Compacta dados estáticos para uso em data URLs (como logos base64)
 * Remove todos os espaços em branco para otimizar o tamanho
 */
function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}

/**
 * Compacta dados estáticos para uso em data URLs (como logos base64)
 * Remove todos os espaços em branco para otimizar o tamanho
 */
function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}
