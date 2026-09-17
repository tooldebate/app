/**
 * AdaptacaoMassiva.gs — Ferramenta de adaptação de nomenclatura em toda a frota
 * 
 * Remove referências hard-coded a "Tool Debate" e substitui por nomes de projeto
 * configuráveis, permitindo que cada projeto da frota seja independente.
 * 
 * MOTIVAÇÃO:
 * - Projetos como "Preferencial PCA" atualmente dizem "A experiência segue a 
 *   mesma anatomia visual do Tool Debate", criando dependência conceitual.
 * - Cada projeto deve ter identidade própria e não referenciar outros projetos.
 * 
 * USO:
 * 1. Configure MAPA_ADAPTACAO com os nomes específicos do seu projeto
 * 2. Execute gerarRelatorioAdaptacao() para ver o que será mudado
 * 3. Execute aplicarAdaptacaoMassiva() para aplicar as mudanças
 * 4. Revise e ajuste manualmente casos especiais
 */

/**
 * Configuração de adaptação para cada projeto.
 * Copie este objeto para cada projeto da frota e ajuste os valores.
 */
var MAPA_ADAPTACAO = {
  // Nome do projeto (usado em títulos, headers, descrições)
  nomeProjeto: "Um conto por aluno",
  
  // Nome técnico (usado em variáveis, funções, IDs)
  nomeTecnico: "ContoPorAluno",
  
  // Nome curto para displays (usado em botões, labels)
  nomeCurto: "Acervo de Contos",
  
  // Descrição do propósito (usado em meta descriptions, sobre)
  descricao: "Sistema de criação e leitura de contos personalizados para estudantes",
  
  // Tema pedagógico (usado em contextos educacionais)
  tema: "Escrita criativa e contos na escola",
  
  // Termo legado a ser substituído
  termoLegado: "Tool Debate"
};

/**
 * Padrões de substituição por tipo de arquivo.
 */
var PADROES_SUBSTITUICAO = {
  // Arquivos .gs (Google Apps Script)
  gs: [
    { busca: /Tool Debate - Um conto por aluno/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /Tool Debate/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /toolDebate/gi, substitui: function(m) { return m.nomeTecnico.charAt(0).toLowerCase() + m.nomeTecnico.slice(1); } },
    { busca: /ToolDebate/g, substitui: function(m) { return m.nomeTecnico; } }
  ],
  
  // Arquivos .html
  html: [
    { busca: /<title>Tool Debate[^<]*<\/title>/g, substitui: function(m) { return '<title>' + m.nomeProjeto + '</title>'; } },
    { busca: /Tool Debate — /g, substitui: function(m) { return m.nomeProjeto + ' — '; } },
    { busca: /Sobre Tool Debate/g, substitui: function(m) { return 'Sobre ' + m.nomeCurto; } },
    { busca: /Acesse Tool Debate/g, substitui: function(m) { return 'Acesse ' + m.nomeCurto; } },
    { busca: /Entrar em Tool Debate/g, substitui: function(m) { return 'Entrar em ' + m.nomeCurto; } },
    { busca: /Módulos do Tool Debate/g, substitui: function(m) { return 'Módulos do ' + m.nomeProjeto; } }
  ],
  
  // Arquivos .md (Markdown/Documentação)
  md: [
    { busca: /Tool Debate - Um conto por aluno/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /Tool Debate/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /A experiência segue a mesma anatomia visual do Tool Debate/g, 
      substitui: function(m) { return 'Sistema independente com arquitetura própria'; } }
  ],
  
  // Arquivos .py (Python)
  py: [
    { busca: /Tool Debate - Um conto por aluno/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /Tool Debate/g, substitui: function(m) { return m.nomeProjeto; } },
    { busca: /PROJECT_NAME = "Tool Debate[^"]*"/g, substitui: function(m) { return 'PROJECT_NAME = "' + m.nomeProjeto + '"'; } }
  ]
};

/**
 * Gera relatório de todas as ocorrências que seriam adaptadas.
 * Execute este antes de aplicar as mudanças para revisar.
 */
function gerarRelatorioAdaptacao() {
  try {
    var relatorio = {
      projeto: MAPA_ADAPTACAO.nomeProjeto,
      dataAnalise: new Date(),
      ocorrencias: [],
      totalOcorrencias: 0,
      arquivosAfetados: 0
    };
  
    // Lista todos os arquivos do projeto
    var arquivos = obterArquivosParaAdaptacao_();
  
    arquivos.forEach(function(arquivo) {
      var extensao = arquivo.nome.split('.').pop().toLowerCase();
      var padroes = PADROES_SUBSTITUICAO[extensao] || [];
    
      if (padroes.length === 0) return;
    
      var ocorrenciasArquivo = [];
    
      padroes.forEach(function(padrao) {
        var matches = arquivo.conteudo.match(padrao.busca);
        if (matches && matches.length > 0) {
          ocorrenciasArquivo.push({
            padrao: padrao.busca.toString(),
            ocorrencias: matches.length,
            exemplos: matches.slice(0, 3), // Primeiras 3 ocorrências
            substituirPor: padrao.substitui(MAPA_ADAPTACAO)
          });
        }
      });
    
      if (ocorrenciasArquivo.length > 0) {
        relatorio.ocorrencias.push({
          arquivo: arquivo.nome,
          tipo: extensao,
          detalhes: ocorrenciasArquivo
        });
        relatorio.arquivosAfetados++;
        relatorio.totalOcorrencias += ocorrenciasArquivo.reduce(function(sum, o) { 
          return sum + o.ocorrencias; 
        }, 0);
      }
    });
  
    Logger.log('=== RELATÓRIO DE ADAPTAÇÃO ===');
    Logger.log('Projeto: ' + relatorio.projeto);
    Logger.log('Total de ocorrências: ' + relatorio.totalOcorrencias);
    Logger.log('Arquivos afetados: ' + relatorio.arquivosAfetados);
    Logger.log('');
  
    relatorio.ocorrencias.forEach(function(item) {
      Logger.log('📄 ' + item.arquivo + ' (' + item.tipo + ')');
      item.detalhes.forEach(function(detalhe) {
        Logger.log('  → ' + detalhe.ocorrencias + ' ocorrência(s): ' + detalhe.padrao);
        Logger.log('    Exemplos: ' + detalhe.exemplos.join(', '));
        Logger.log('    Substituir por: ' + detalhe.substituirPor);
      });
      Logger.log('');
    });
  
    return relatorio;
  } catch (error) {
    Logger.log("Erro em gerarRelatorioAdaptacao: " + error.message);
    throw error;
  }
}

/**
 * Aplica a adaptação massiva em todos os arquivos.
 * ATENÇÃO: Esta função modifica os arquivos. Execute gerarRelatorioAdaptacao() primeiro!
 * 
 * LIMITAÇÃO: Esta função NÃO pode modificar os arquivos do projeto Apps Script diretamente.
 * Use o script Python complementar para aplicar as mudanças nos arquivos locais.
 */
function aplicarAdaptacaoMassiva() {
  throw new Error(
    'ATENÇÃO: Esta função não pode modificar arquivos Apps Script diretamente.\n' +
    'Use o script Python "aplicar_adaptacao_massiva.py" para:\n' +
    '1. Fazer backup dos arquivos\n' +
    '2. Aplicar as substituições configuradas\n' +
    '3. Gerar relatório de mudanças\n' +
    '4. Fazer clasp push para atualizar o projeto'
  );
}

/**
 * Obtém lista de arquivos para adaptação.
 * NOTA: No ambiente Apps Script, esta função retorna uma lista simulada.
 * O script Python complementar varre os arquivos reais.
 */
function obterArquivosParaAdaptacao_() {
  // Esta é uma implementação placeholder
  // O script Python real lerá os arquivos do disco
  return [
    { nome: 'README.md', conteudo: '' },
    { nome: 'Auth.gs', conteudo: '' },
    { nome: 'Login.html', conteudo: '' },
    { nome: 'notebook.py', conteudo: '' }
    // ... outros arquivos serão processados pelo Python
  ];
}

/**
 * Exporta a configuração de adaptação como JSON.
 * Copie este JSON para configurar outros projetos da frota.
 */
function exportarConfiguracaoAdaptacao() {
  try {
    var config = {
      mapa: MAPA_ADAPTACAO,
      padroes: {},
      instrucoes: {
        uso: 'Copie este JSON para o arquivo adaptacao_config.json do projeto',
        passos: [
          '1. Ajuste os valores do "mapa" para o novo projeto',
          '2. Execute o script Python: python aplicar_adaptacao_massiva.py',
          '3. Revise as mudanças no relatório gerado',
          '4. Faça clasp push se estiver satisfeito'
        ]
      }
    };
  
    // Converte padrões regex para strings (JSON não suporta regex)
    Object.keys(PADROES_SUBSTITUICAO).forEach(function(tipo) {
      config.padroes[tipo] = PADROES_SUBSTITUICAO[tipo].map(function(p) {
        return {
          busca: p.busca.toString(),
          descricao: 'Substituição automática para ' + tipo
        };
      });
    });
  
    Logger.log(JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    Logger.log("Erro em exportarConfiguracaoAdaptacao: " + error.message);
    throw error;
  }
}

/**
 * Gera documentação sobre como adaptar novos projetos.
 */
function gerarDocumentacaoAdaptacao() {
  var doc = [
    '# Guia de Adaptação Massiva — Frota de Projetos',
    '',
    '## Objetivo',
    'Remover referências hard-coded a "Tool Debate" e tornar cada projeto',
    'independente com sua própria identidade.',
    '',
    '## Para que serve',
    '- Eliminar dependências conceituais entre projetos',
    '- Permitir que cada projeto tenha nome e identidade próprios',
    '- Facilitar fork e adaptação de projetos base',
    '- Manter consistência de nomenclatura em todo o código',
    '',
    '## Como usar',
    '',
    '### Passo 1: Configurar o mapa de adaptação',
    'Edite `MAPA_ADAPTACAO` em AdaptacaoMassiva.gs:',
    '```javascript',
    'var MAPA_ADAPTACAO = {',
    '  nomeProjeto: "Seu Projeto",',
    '  nomeTecnico: "SeuProjeto",',
    '  nomeCurto: "Projeto",',
    '  descricao: "Descrição do projeto",',
    '  tema: "Tema pedagógico",',
    '  termoLegado: "Tool Debate"',
    '};',
    '```',
    '',
    '### Passo 2: Gerar relatório',
    'Execute no Apps Script Editor:',
    '```javascript',
    'gerarRelatorioAdaptacao();',
    '```',
    'Revise o log para ver todas as mudanças que serão aplicadas.',
    '',
    '### Passo 3: Aplicar adaptação',
    'No terminal, execute o script Python:',
    '```bash',
    'python aplicar_adaptacao_massiva.py --projeto "Nome do Projeto"',
    '```',
    '',
    '### Passo 4: Revisar e commitar',
    'Revise as mudanças e faça commit:',
    '```bash',
    'git diff',
    'git add .',
    'git commit -m "Adapta nomenclatura do projeto"',
    '```',
    '',
    '## Arquivos processados',
    '- `.gs` — Google Apps Script',
    '- `.html` — Templates HTML',
    '- `.md` — Documentação Markdown',
    '- `.py` — Scripts Python',
    '',
    '## Casos especiais',
    '',
    '### Referências em comentários de código',
    'Referências históricas ou de arquitetura são mantidas se estiverem',
    'em comentários claramente marcados como "legado" ou "origem".',
    '',
    '### Nomes de funções e variáveis',
    'Funções como `testToolDebate()` são renomeadas para seguir o padrão',
    'do novo projeto (ex: `testSeuProjeto()`).',
    '',
    '### Documentação externa',
    'Referências em README e CHANGELOG que explicam a origem do projeto',
    'podem ser mantidas em uma seção "Histórico" se relevante.',
    '',
    '## Troubleshooting',
    '',
    '### "Muitas ocorrências, revisar manualmente"',
    'Se houver mais de 100 ocorrências em um arquivo, revise manualmente',
    'para evitar substituições indevidas.',
    '',
    '### "Substituição quebrou sintaxe"',
    'Verifique se há substituições dentro de strings ou regex. Ajuste os',
    'padrões em PADROES_SUBSTITUICAO para ser mais específico.',
    '',
    '### "Ainda há referências cruzadas"',
    'Busque por padrões como "mesmo que", "similar a", "baseado em" que',
    'podem indicar comparações entre projetos.',
    '',
    '## Para desenvolvedores',
    '',
    '### Adicionar novos padrões',
    'Edite `PADROES_SUBSTITUICAO` e adicione regex para novos casos:',
    '```javascript',
    'gs: [',
    '  { busca: /NovoPadrao/g, substitui: function(m) { return m.nomeTecnico; } }',
    ']',
    '```',
    '',
    '### Testar em projeto isolado',
    'Sempre teste a adaptação em um branch separado ou cópia do projeto',
    'antes de aplicar em produção.'
  ].join('\n');
  
  Logger.log(doc);
  return doc;
}
