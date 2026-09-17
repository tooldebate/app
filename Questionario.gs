/**
 * Questionario.gs — Definição canônica do questionário (domínio).
 *
 * Esta é a ÚNICA fonte de verdade das perguntas e opções. Ela alimenta tanto a
 * renderização do formulário (cliente) quanto a montagem do cabeçalho e das
 * linhas da aba "Respostas" (Respostas.gs), evitando divergência entre o que é
 * perguntado e o que é gravado. Espelha o arquivo Questionario.md.
 *
 * Cada pergunta tem:
 *   - id:      chave estável usada na submissão (não muda)
 *   - coluna:  cabeçalho curto da coluna na aba "Respostas"
 *   - pergunta: texto exibido para a criança
 *   - opcoes:  lista de opções (escolha única, com radio buttons)
 */

/** Alfabeto usado nas perguntas de "inicial do nome". */
var LETRAS_ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

var QUESTIONARIO = [
  {
    id: 'inicial_principal',
    coluna: 'Inicial Personagem Principal',
    pergunta: 'Qual será a inicial do nome do personagem principal? (escolha 1 letra)',
    opcoes: LETRAS_ALFABETO
  },
  {
    id: 'tipo_principal',
    coluna: 'Tipo do Personagem Principal',
    pergunta: 'O personagem principal é:',
    opcoes: ['criança da mesma idade que eu', 'criança mais nova', 'criança mais velha', 'um adulto', 'um animal que fala']
  },
  {
    id: 'cor_principal',
    coluna: 'Cor do Personagem',
    pergunta: 'Qual cor melhor descreve o personagem principal?',
    opcoes: ['vermelho/alaranjado (extrovertido)', 'amarelo/verde (alegre)', 'azul/roxo (misterioso)', 'marrom/cinza (tranquilo)']
  },
  {
    id: 'caracteristica_fisica',
    coluna: 'Característica Física',
    pergunta: 'Qual é a característica física que te parece mais engraçada ou curiosa?',
    opcoes: ['cabelos muito compridos ou muito curtos', 'orelhas grandes', 'pés ou mãos muito grandes', 'olhos muito brilhantes', 'nada de diferente']
  },
  {
    id: 'tom_voz',
    coluna: 'Tom de Voz',
    pergunta: 'Como é o tom de voz do personagem principal?',
    opcoes: ['muito alto e animado', 'baixo e calmo', 'rouco ou engraçado', 'sussurrante e misterioso', 'muda muito conforme a situação']
  },
  {
    id: 'jeito_principal',
    coluna: 'Jeito do Personagem',
    pergunta: 'Qual jeito seu o personagem principal também pode ter?',
    opcoes: ['gosta de observar detalhes antes de agir', 'faz amigos conversando e brincando', 'prefere desenhar, construir ou inventar coisas', 'ajuda quando alguém fica triste', 'faz perguntas até entender o que aconteceu']
  },
  {
    id: 'tipo_amigo',
    coluna: 'Tipo do Amigo',
    pergunta: 'O amigo/a do personagem principal será:',
    opcoes: ['colega da mesma escola', 'um animal amigo', 'um parente', 'um vizinho', 'um personagem mágico']
  },
  {
    id: 'inicial_amigo',
    coluna: 'Inicial do Amigo',
    pergunta: 'Qual a inicial do nome do amigo?',
    opcoes: LETRAS_ALFABETO
  },
  {
    id: 'relacao_amigo',
    coluna: 'Relação com o Amigo',
    pergunta: 'Qual a relação entre personagem principal e amigo?',
    opcoes: ['brincam juntos sempre', 'às vezes brigam, depois fazem as pazes', 'ajudam um ao outro em aventuras', 'um cuida do outro', 'são estranhos que se tornam amigos']
  },
  {
    id: 'antagonista',
    coluna: 'Antagonista',
    pergunta: 'Quem é o antagonista (quem causa problemas)?',
    opcoes: ['uma pessoa malvada', 'um animal atrapalhado', 'um monstro assustador', 'um brinquedo que ganha vida', 'problema da natureza (tempestade)']
  },
  {
    id: 'inicial_antagonista',
    coluna: 'Inicial do Antagonista',
    pergunta: 'Qual a inicial do nome do antagonista?',
    opcoes: LETRAS_ALFABETO
  },
  {
    id: 'traco_antagonista',
    coluna: 'Traço do Antagonista',
    pergunta: 'Qual traço engraçado o antagonista pode ter?',
    opcoes: ['fala sozinho', 'tropeça muito', 'tem um cheiro estranho', 'ri alto sem querer', 'troca as coisas de lugar']
  },
  {
    id: 'cenario',
    coluna: 'Cenário',
    pergunta: 'Onde acontece a história?',
    opcoes: ['na escola', 'em casa', 'no parque', 'numa cidade diferente', 'num lugar mágico (castelo)']
  },
  {
    id: 'lugar_ec115',
    coluna: 'Lugar EC 115 Norte',
    pergunta: 'Qual lugar da EC 115 Norte ou do caminho da escola combina mais com a sua história?',
    opcoes: ['sala de aula ou biblioteca', 'superquadra', 'pilotis', 'árvores do Plano Piloto', 'comércio local ou ponto de ônibus']
  },
  {
    id: 'gesto_curioso',
    coluna: 'Gesto Curioso',
    pergunta: 'Qual gesto ou jeito curioso você acha divertido em alguém?',
    opcoes: ['faz caretas o tempo todo', 'bate palmas de um jeito especial', 'dança sem avisar', 'faz caretas com a língua', 'mexe no cabelo sempre']
  },
  {
    id: 'objeto',
    coluna: 'Objeto Importante',
    pergunta: 'Que objeto importante aparece na história?',
    opcoes: ['um brinquedo especial', 'um mapa ou carta', 'uma chave antiga', 'um livro mágico', 'nenhum objeto especial']
  },
  {
    id: 'emocao',
    coluna: 'Emoção Principal',
    pergunta: 'Qual emoção principal deve aparecer no conto?',
    opcoes: ['alegria e riso', 'medo e mistério leve', 'surpresa e curiosidade', 'amizade e carinho', 'coragem e aventura']
  },
  {
    id: 'final',
    coluna: 'Final',
    pergunta: 'Como termina a história?',
    opcoes: ['com todos felizes', 'com uma surpresa engraçada', 'com uma lição aprendida', 'com continuação (vai ter mais)', 'com algo ainda misterioso']
  },
  {
    id: 'estrutura',
    coluna: 'Estrutura do Conto',
    pergunta: 'A estrutura do conto deve ser:',
    opcoes: ['bem curta (apenas uma cena)', 'pequena (introdução + problema + final simples)', 'média (algumas cenas curtas)', 'um pouco mais desenvolvida (várias aventuras)', 'livre (o que a criança quiser)']
  },
  {
    id: 'narrador',
    coluna: 'Narrador',
    pergunta: 'Quem conta a história?',
    opcoes: ['narrador em terceira pessoa (ele/ela)', 'autobiografia (eu)', 'narrador que fala com leitor (você)', 'alterna entre personagens', 'narrador misterioso']
  },
  {
    id: 'natureza',
    coluna: 'Natureza',
    pergunta: 'Você quer incluir algo sobre a natureza?',
    opcoes: ['sim, muitas plantas e animais', 'sim, uma mudança no tempo (chuva)', 'só um lugar (árvore, lago)', 'não, cenário urbano']
  },
  {
    id: 'humor',
    coluna: 'Humor',
    pergunta: 'Quanto de humor você quer no conto?',
    opcoes: ['só um pouco', 'moderado', 'muito', 'apenas final engraçado', 'humor bobo o tempo todo']
  },
  {
    id: 'medo',
    coluna: 'Medo Engraçado',
    pergunta: 'O personagem tem algum medo engraçado?',
    opcoes: ['medo de escuro', 'medo de baratas', 'medo de água', 'medo de subir em algo alto', 'não tem medo']
  },
  {
    id: 'ritmo',
    coluna: 'Ritmo',
    pergunta: 'Sobre o ritmo da história (velocidade):',
    opcoes: ['lento e calmo', 'médio, com pequenos picos', 'rápido e cheio de ação', 'ritmado, com partes calmas e partes rápidas', 'trocas rápidas de cenas']
  },
  {
    id: 'moral',
    coluna: 'Moral',
    pergunta: 'Você quer que o conto tenha uma moral (lição)?',
    opcoes: ['sim, sobre amizade', 'sim, sobre coragem', 'sim, sobre honestidade', 'não, só diversão']
  },
  {
    id: 'girias',
    coluna: 'Gírias Brasileiras',
    pergunta: 'Escolha até 3 gírias ou expressões que você mais usa ou acha engraçadas (máximo 3):',
    opcoes: [
      // Vocativos e relações (12)
      'mano', 'brother', 'parça', 'mina', 'crush',
      'ficante', 'firmeza', 'tamo junto', 'papo reto',
      'trocar ideia', 'vai na / vai no', 'dar um toque',
      
      // Aprovação e sucesso (10)
      'maneiro', 'bacana', 'sussa', 'sinistro', 'zika',
      'mitou', 'lacrar', 'de milhões', 'hitar', 'bombar',
      
      // Desaprovação e fracasso (8)
      'mó paia', 'cringe', 'flopar', 'vacilão', 'ranço',
      'pagar mico', 'foi de base', 'intankável',
      
      // Ações e estados (10)
      'zoar', 'trampo', 'rolê', 'stalkear', 'biscoitar',
      'trollar', 'coringar', 'tiltar', 'tankar', 'pé na jaca',
      
      // Situações e contextos (8)
      'treta', 'perrengue', 'resenha', 'balada', 'sextou',
      'barril', 'migué', 'fuleragem',
      
      // Regionalismo e identidade (7)
      'quebrada', 'grana', 'parada', 'camela', 'mó',
      'uai', 'oxente',
      
      // Digital e contemporâneo (8)
      'POV', 'shippar', 'low profile', 'aura', 'delulu',
      'pega a visão', 'dar um perdido', 'bolado'
    ],
    multipla: true,
    maxEscolhas: 3
  }
];

/** Devolve a definição do questionário (lista de perguntas). */
function obterPerguntas() {
  return QUESTIONARIO;
}

/** Localiza uma pergunta pelo id (ou null). */
function obterPerguntaPorId(id) {
  for (var i = 0; i < QUESTIONARIO.length; i++) {
    if (QUESTIONARIO[i].id === id) return QUESTIONARIO[i];
  }
  return null;
}
