/**
 * Conto.gs — Geração do conto (texto) com o Gemini.
 *
 * A partir das ESCOLHAS da criança (questionário) e da DIRETRIZ única atribuída,
 * pede ao Gemini um conto infantil ORIGINAL e curto (<= CONFIG.CONTO_MAX_CARACTERES),
 * em português do Brasil. Devolve { titulo, corpo, texto }, onde `texto` já está
 * no formato consumido pelo notebook (1ª linha = título, restante = corpo).
 */

/**
 * Gera o conto para uma criança.
 * @param {Object} respostas Mapa { idPergunta -> opção }.
 * @param {Object} diretriz Linha da diretriz (campos da aba + _id).
 * @return {{titulo:string, corpo:string, texto:string}}
 * @throws Se o Gemini não estiver configurado ou falhar.
 */
function gerarConto(respostas, diretriz) {
  try {
    if (!getGeminiApiKey()) {
      throw new Error('GEMINI_API_KEY não configurada — não é possível gerar o conto.');
    }

    var texto = chamarGemini_(montarPromptConto_(respostas, diretriz), {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { titulo: { type: 'STRING' }, corpo: { type: 'STRING' } },
        required: ['titulo', 'corpo']
      }
    });

    var obj = parseJsonGemini_(texto, 'geração do conto');
    var titulo = limparLinha_(obj.titulo) || 'Meu conto';
    var corpo = String(obj.corpo || '').replace(/\r\n/g, '\n').trim();
    if (!corpo) throw new Error('O Gemini não retornou o corpo do conto.');
    corpo = limitarCaracteres_(corpo, CONFIG.CONTO_MAX_CARACTERES);
    // FROTA-15: guarda ética sobre o TEXTO do conto (prosa), não sobre o JSON —
    // aplica substituições inclusivas e bloqueia conteúdo vetado para crianças.
    corpo = aplicarGuardaEticaConto_(corpo);

    return { titulo: titulo, corpo: corpo, texto: titulo + '\n\n' + corpo };
  } catch (error) {
    Logger.log("Erro em gerarConto: " + error.message);
    throw error;
  }
}

/**
 * Passa o corpo do conto pela guarda ética (EthicsGuardService). Em caso de
 * BLOQUEIO, lança erro para o chamador marcar "Erro ao gerar conto" (a resposta
 * já está gravada e o conto pode ser reprocessado). Se a própria guarda estiver
 * indisponível, o conto segue sem filtro — uma falha de infra não deve deixar a
 * criança sem história.
 * @param {string} corpo Texto do conto.
 * @return {string} Texto possivelmente ajustado pela política.
 */
function aplicarGuardaEticaConto_(corpo) {
  var r;
  try {
    r = EthicsGuardService.inspect(corpo, { stage: 'output' });
  } catch (e) {
    console.warn('Guarda ética indisponível; conto segue sem filtro: ' +
      ((e && e.message) ? e.message : e));
    return corpo;
  }
  if (r && r.ok) return r.content;
  throw new Error('Conto bloqueado pela guarda ética (' +
    ((r && r.error && r.error.code) ? r.error.code : 'política de conteúdo') + ').');
}

/** Monta o prompt do conto a partir das respostas e da diretriz. */
function montarPromptConto_(respostas, diretriz) {
  try {
    // FROTA-02: sanitiza escolhas e diretriz antes de compor o prompt.
    // O nome da criança nunca é enviado ao Gemini.
    var built = PromptContextBuilder.build('story.generate', {
      escolhas: respostas,
      diretriz: diretriz,
      maxChars: CONFIG.CONTO_MAX_CARACTERES
    });
    PromptContextBuilder.logAudit('story.generate', built.droppedKeys);

    var ctx = built.context;
    var safeEscolhas = ctx.escolhas || {};
    var safeDir = ctx.diretriz || {};

    var escolhas = obterPerguntas().map(function (p) {
      var v = safeEscolhas && safeEscolhas[p.id];
      // Para respostas múltiplas (arrays), formata como lista
      if (Array.isArray(v)) {
        v = v.length > 0 ? v.join(', ') : '(sem resposta)';
      }
      return '- ' + p.coluna + ': ' + (v != null && v !== '' ? v : '(sem resposta)');
    }).join('\n');

    // Extrai gírias escolhidas para instruir o modelo. Após a sanitização
    // (PromptContextBuilder) e no reprocessamento (reconstruirRespostas) o
    // valor chega como STRING separada por vírgulas — normaliza para array.
    var girias = safeEscolhas && safeEscolhas.girias;
    if (typeof girias === 'string') {
      girias = girias.split(/[;,]/).map(function (g) { return g.trim(); }).filter(String);
    }
    var instrucaoGirias = '';
    var regraGirias = '';
    if (Array.isArray(girias) && girias.length > 0) {
      instrucaoGirias = [
        '',
        'LINGUAGEM DOS DIÁLOGOS (OBRIGATÓRIO):',
        'A criança escolheu estas gírias brasileiras que ela usa: ' + girias.join(', ') + '.',
        'CADA UMA delas deve aparecer pelo menos UMA vez nos diálogos entre os personagens.',
        'Use-as de forma autêntica em falas de personagens jovens, sem forçar ou exagerar.',
        'Não use gírias na narração, apenas nos diálogos.'
      ].join('\n');
      regraGirias = '- Todas as gírias escolhidas pela criança (' + girias.join(', ') +
        ') aparecem pelo menos uma vez nos diálogos.';
    }

    var campo = function (nome) { return safeDir[nome] != null ? String(safeDir[nome]) : ''; };

    var diretrizTxt = [
      '- Título-guia: ' + campo(CONFIG.COL_TITULO_DIRETRIZ),
      '- Universo ficcional: ' + campo('Universo ficcional'),
      '- Problema narrativo: ' + campo('Problema narrativo'),
      '- Paisagem (DF): ' + campo('Paisagem DF'),
      '- Paisagem natural: ' + campo('Paisagem natural'),
      '- Paisagem urbana: ' + campo('Paisagem urbana'),
      '- Foco de pesquisa: ' + campo('Foco de pesquisa'),
      '- Âncora em referências: ' + campo('Ancora em referencias'),
      '- Personalização infantil: ' + campo('Personalizacao infantil'),
      '- Interesse da criança: ' + campo('Interesse da crianca'),
      '- Arranjo familiar ou social: ' + campo('Arranjo familiar ou social'),
      '- Chave emocional: ' + campo('Chave emocional'),
      '- Nuance diferenciadora: ' + campo('Nuance diferenciadora'),
      '- Motor lógico e sensibilização: ' + campo('Motor logico e sensibilizacao'),
      '- ODS relacionados: ' + campo('ODS relacionados'),
      '- Uso no modelo: ' + campo('Uso no modelo')
    ].join('\n');

    return [
      'Você é um escritor de contos infantis em português do Brasil.',
      'Escreva um conto ORIGINAL e curto para uma criança do ensino fundamental I',
      'da EC 115 Norte (Brasília). Linguagem simples, frases curtas, tom afetuoso e',
      'adequado à idade.',
      '',
      'Use as ESCOLHAS DA CRIANÇA para montar personagens, cenário, emoção, ritmo e',
      'final. Use a DIRETRIZ como espinha dorsal criativa (universo, problema,',
      'paisagens, chave emocional e motor narrativo), apenas como INSPIRAÇÃO — sem',
      'copiar nenhuma obra, marca ou personagem existente e sem citar títulos de obras.',
      instrucaoGirias,
      '',
      'Regras obrigatórias:',
      '- No máximo ' + CONFIG.CONTO_MAX_CARACTERES + ' caracteres no corpo do conto.',
      '- Os nomes dos personagens começam com as iniciais escolhidas.',
      '- Respeite a emoção principal, o final, a estrutura, o narrador e a moral pedidos.',
      '- Ambiente coerente com as paisagens da diretriz e com o lugar da EC 115 escolhido.',
      regraGirias,
      '- Sem violência gráfica, sem medo intenso, sem temas adultos.',
      '',
      'ESCOLHAS DA CRIANÇA:',
      escolhas,
      '',
      'DIRETRIZ (id ' + (safeDir._id || '') + '):',
      diretrizTxt,
      '',
      'Responda em JSON: {"titulo": "<título curto e cativante>", "corpo": "<texto do conto>"}.'
    ].join('\n');
  } catch (error) {
    Logger.log("Erro em montarPromptConto_: " + error.message);
    throw error;
  }
}

/**
 * Gera 3 perguntas de leitura sobre o conto recém-criado (prática de
 * recuperação / testing effect): uma literal, uma inferencial e uma de
 * conexão pessoal — o andaime clássico de compreensão leitora. Reusa o
 * ponto único chamarGemini_ (já resiliente). Pensadas para a criança
 * responder DEPOIS de ler o conto, no caderno ou em roda de conversa.
 *
 * @param {{titulo:string, corpo:string}} conto Conto gerado.
 * @return {Array<{pergunta:string, dica:string}>} Exatamente até 3 perguntas.
 * @throws Se o Gemini falhar (o chamador decide degradar).
 */
function gerarPerguntasDeLeitura(conto) {
  try {
    var texto = chamarGemini_([
      'Você é uma professora alfabetizadora do ensino fundamental I.',
      'Leia o conto abaixo e crie EXATAMENTE 3 perguntas de compreensão para a',
      'própria criança autora responder depois de ler o conto:',
      '1) uma pergunta LITERAL (a resposta está escrita no texto);',
      '2) uma pergunta INFERENCIAL (a resposta exige juntar pistas do texto);',
      '3) uma pergunta de CONEXÃO PESSOAL (liga a história à vida da criança).',
      'Cada pergunta vem com uma "dica" curta de onde/como procurar a resposta.',
      'Linguagem simples e afetuosa, adequada à idade. Não revele as respostas.',
      '',
      'CONTO — "' + conto.titulo + '":',
      conto.corpo
    ].join('\n'), {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          perguntas: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                pergunta: { type: 'STRING' },
                dica: { type: 'STRING' }
              },
              required: ['pergunta', 'dica']
            }
          }
        },
        required: ['perguntas']
      }
    });

    var obj = parseJsonGemini_(texto, 'perguntas de leitura');
    return (Array.isArray(obj.perguntas) ? obj.perguntas : [])
      .map(function (p) {
        return {
          pergunta: limparLinha_(p && p.pergunta),
          dica: limparLinha_(p && p.dica)
        };
      })
      .filter(function (p) { return p.pergunta; })
      .slice(0, 3);
  } catch (error) {
    Logger.log("Erro em gerarPerguntasDeLeitura: " + error.message);
    throw error;
  }
}

/** Normaliza um título: uma linha, sem espaços duplicados. */
function limparLinha_(s) {
  try {
    return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    Logger.log("Erro em limparLinha_: " + error.message);
    throw error;
  }
}

/** Limita o texto a `max` caracteres, cortando preferencialmente no fim de uma frase. */
function limitarCaracteres_(texto, max) {
  try {
    if (texto.length <= max) return texto;
    var corte = texto.slice(0, max);
    var fim = Math.max(
      corte.lastIndexOf('. '), corte.lastIndexOf('! '),
      corte.lastIndexOf('? '), corte.lastIndexOf('\n')
    );
    if (fim > max * 0.6) return corte.slice(0, fim + 1).trim();
    return corte.replace(/\s+\S*$/, '').trim();
  } catch (error) {
    Logger.log("Erro em limitarCaracteres_: " + error.message);
    throw error;
  }
}
