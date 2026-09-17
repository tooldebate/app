# Webapp — Um conto por aluno (Google Apps Script)

Web app que recebe as respostas de até **300 crianças**, atribui a cada uma
**exatamente uma diretriz única** (CT-001…CT-300) da aba `Diretrizes`, grava na
aba `Respostas` as respostas **e todos os detalhes da diretriz atribuída**, e
então **gera um rascunho com o Gemini para revisão humana**. Somente a versão
aprovada é salva como arquivo `.txt` no Google Drive.
Tudo na planilha indicada por `PLANILHA_DAS_DIRETRIZES`.

O percurso autoritativo, seus estados e falhas esperadas estão em
[`WORKFLOW_BASICO.md`](WORKFLOW_BASICO.md).

O `.txt` é salvo na pasta configurada pela Script Property `FOLDER_ID` — a mesma
pasta que o `notebook_editor.py` pode ler para diagramar os fanzines em PDF e que abastece o módulo
**Ouvir o acervo**, no qual os contos podem ser lidos em voz alta por TTS.

## Propósito pedagógico

O projeto transforma as preferências de cada estudante em uma experiência de
leitura autoral: o aluno se torna protagonista de um conto exclusivo, produzido
a partir de uma diretriz narrativa que combina tema, espaço, conflito e emoção.
A diretriz funciona como contorno criativo, não como resposta pronta.

Além do conto, o sistema gera perguntas de interpretação de texto. Os arquivos
podem ser diagramados como fanzines impressos para atividades de leitura,
letramento autoral e feiras literárias. No acervo digital, a criança também pode
acompanhar o texto enquanto o navegador o narra, ajustar a voz e a velocidade e
responder a um pequeno desafio de compreensão.

### Estrutura da aba `Respostas`

`[metadados]` (carimbo, ID do aluno, identificação, idade) + `[1 coluna por
pergunta]` + `[processo]` (comentário, método, **ID Diretriz**) + `[conto]`
(status, título do conto, arquivo, link do .txt) + `[Diretriz: <campo>]` para
**cada** coluna da aba `Diretrizes` (Título, Universo ficcional, Problema
narrativo, Paisagens, Foco de pesquisa, Âncora, Chave emocional, ODS, etc.). A
linha é gravada casando valor↔coluna pelo **nome** do cabeçalho real, então
nunca há desalinhamento.

## Arquivos (todos na raiz)

| Arquivo | Camada | Papel |
|---|---|---|
| `appsscript.json` | Manifesto | Configura o deploy como web app |
| `Config.gs` | Configuração | Script Properties, nomes de abas, utilitários de planilha |
| `Questionario.gs` | Domínio | Definição canônica das perguntas e opções |
| `Respostas.gs` | Planilha (CRUD) | **Monta a aba `Respostas`** e grava 1 linha por formulário |
| `Diretrizes.gs` | Seleção | Lê `Diretrizes` e escolhe 1 diretriz única por criança |
| `Gemini.gs` | Integração IA | Ponto único de HTTP do Gemini (seleção + conto) |
| `Conto.gs` | Geração | Escreve o conto (<= 2500 caracteres) e gera perguntas de leitura |
| `Drive.gs` | Persistência | Salva o conto como `.txt` na pasta do Drive |
| `StoryPublicationService.gs` | Workflow | Vincula rascunho, estudante, versão aprovada e publicação idempotente |
| `LeituraAcervo.gs` | Leitura | Sorteia contos, prepara perguntas, corrige respostas e registra o progresso |
| `LeituraAcervoCliente.html` | Player TTS | Controla a narração, o destaque do texto e a experiência de leitura |
| `LeituraAcervoEstilos.html` | Interface | Estilos responsivos do acervo, player e desafio |
| `WebApp.gs` | Controle | `doGet()`, API do cliente, validação e `LockService` |
| `Index.html` + `Estilos.html` + `JsCliente.html` | Interface | Formulário do questionário |
| `notebook_editor.py` | Diagramação | Gera PDFs dos fanzines com layout profissional |
| `fanzine_builder.py` | Compatibilidade | Reexporta o gerador para imports antigos |
| `notebook_pipeline.py` | Colab/IA | Preserva o pipeline de micro-jornais com SDXL/Gemini |

## Geração de Fanzines em PDF

O módulo `notebook_editor.py` permite diagramar os contos como fanzines impressos
profissionais em formato PDF.

### Características do Layout

- **Formato A5** (14,8 cm × 21,0 cm) ideal para impressão
- **Margem esquerda: 0,7 cm** para encadernação
- **Margem direita: 0,3 cm** para otimizar espaço
- **Logo `plantao_escolar.png`** centralizado na contracapa (1,2 cm × 1,2 cm)
- **3 ODS relacionados** abaixo do logo
- **Validação visual** automática do layout

### Instalação e Uso

```bash
# Instalar dependências
pip install -r requirements_fanzine.txt

# Teste local (sem Google Drive)
python test_fanzine.py

# Teste com Google Drive (baixa logo real)
python test_fanzine.py --use-drive
```

### No Google Colab

```python
# Instalar
!pip install -r requirements_fanzine.txt

# Configurar FOLDER_ID nos Secrets do Colab

# Executar
!python test_fanzine.py --use-drive
```

Consulte `FANZINE_BUILDER.md` para documentação completa, personalização e
integração com o fluxo de geração de contos.

---

## Ouvir contos no player com TTS

A aba **Ouvir o acervo** transforma os arquivos `.txt` da pasta de contos em
uma experiência de leitura acompanhada. O sistema sorteia um fanzine, mostra o
texto na tela e usa a **Web Speech API** do navegador
(`window.speechSynthesis`) para narrá-lo. O áudio é sintetizado no dispositivo:
o backend não gera nem armazena arquivos de áudio.

### Fluxo do leitor

1. Informe um nome, apelido ou código da turma e, opcionalmente, a idade.
2. Selecione **Sugerir conto**. O sistema evita, quando possível, repetir o
   último arquivo e sortear um conto cujo nome pareça pertencer ao próprio
   leitor.
3. Escolha uma voz disponível no dispositivo e ajuste a velocidade entre
   **0,6x e 1,5x**.
4. Use **Ouvir**, **Pausar/Retomar**, **Parar** ou **Recomeçar**.
5. Acompanhe a barra de progresso e o destaque automático do trecho que está
   sendo narrado.
6. Ao terminar a escuta, responda às duas perguntas de compreensão. Quem optar
   pela leitura silenciosa pode usar **Já li até o fim** para abrir o desafio
   sem áudio.

As perguntas trabalham tema, motivação, transformação, causa, consequência ou
ponto de vista. O gabarito permanece no servidor e cada resposta recebe uma
explicação curta e acolhedora.

### Progresso e gamificação

Cada acerto vale **10 pontos** e a escuta completa concede **5 pontos extras**.
Sequências de leituras com todas as respostas corretas podem liberar bônus,
níveis e conquistas, como `Voz companheira` e `Explorador de fanzines`. O
sistema registra duração, conclusão da escuta, voz e velocidade utilizadas,
além dos resultados do desafio.

O módulo cria e utiliza as abas `LEITURAS_ACERVO`, `PROGRESSO_LEITOR` e
`PERGUNTAS_ACERVO`. As perguntas são reutilizadas enquanto o arquivo de origem
não for alterado, reduzindo chamadas ao Gemini.

### Compatibilidade e acessibilidade

- As vozes são fornecidas pelo navegador e pelo sistema operacional; nomes,
  idiomas e qualidade variam conforme o dispositivo.
- O player prioriza uma voz `pt-BR` quando disponível e usa português do Brasil
  como idioma padrão.
- Navegadores sem suporte à Web Speech API ainda permitem a leitura visual e a
  conclusão pelo botão **Já li até o fim**.
- O texto permanece visível durante toda a reprodução, com foco por teclado,
  destaque sincronizado e respeito à preferência de movimento reduzido.
- O nome/apelido e a idade são preservados localmente no navegador para facilitar
  a próxima leitura.

## Geração do conto (.txt no Drive)

1. Ao enviar, uma **seção crítica curta** (`LockService`) reserva a diretriz e
   grava a linha com status `Gerando conto…`.
2. **Fora do lock**, o Gemini escreve o conto (1ª linha = título, corpo <= 2500
   caracteres) usando as respostas + a diretriz como espinha dorsal criativa.
3. O `.txt` é salvo no Drive como `ALU-001 - Título.txt`; a linha é atualizada
   para `Conto gerado` com o nome e o **link** do arquivo.
4. Se o Gemini falhar, a resposta **continua gravada** (diretriz já consumida) e
   o status vira `Erro ao gerar conto` — dá para reprocessar depois.

## Como a unicidade é garantida

1. Uma diretriz é considerada **consumida** quando seu ID aparece na coluna
   `ID Diretriz` da aba `Respostas`.
2. `selecionarDiretrizUnica()` só considera as diretrizes ainda livres.
3. O Gemini escolhe a melhor entre as **livres**; se falhar, usa a primeira
   livre (fallback determinístico).
4. Seleção + gravação rodam dentro de um `LockService`, evitando que duas
   submissões simultâneas peguem a mesma diretriz.

## Script Properties (já configuradas)

- `PLANILHA_DAS_DIRETRIZES` — ID da planilha (abas `Diretrizes` e `Respostas`).
- `GEMINI_API_KEY` — chave da API Gemini (necessária para gerar o conto).
- `FOLDER_ID` — ID da pasta do Drive onde os contos `.txt` serão salvos.
  Também são aceitos `PASTA_DOS_CONTOS`, `OUTPUT_FOLDER_ID` ou `DRIVE_FOLDER_ID`
  como aliases legados.
- `LOGO_FILE_ID` ou `LOGO_DRIVE_URL` *(opcional)* — aponta diretamente para o
  `plantao_escolar.png` da contracapa quando a busca por nome no `FOLDER_ID`
  não encontrar o arquivo.
- `GEMINI_MODEL` — modelo a usar, lido exclusivamente das Script Properties
  (ex.: `gemini-3.5-flash`). O código não define fallback de modelo.
- `AI_QUOTA_DAILY` *(recomendado em evento)* — teto diário de chamadas à IA
  (`AiRateLimitService`, padrão **200**). Cada criança consome ~3 chamadas
  (seleção + conto + perguntas), então **300 crianças ≈ 900 chamadas/dia**: suba
  este valor antes do evento, senão a geração começa a falhar no meio.
- `AI_AUDIT_SPREADSHEET_ID` *(opcional)* — planilha de auditoria/observabilidade
  da frota; sem ela, `?page=fleet` mostra "métricas indisponíveis".

Em **Configurações do projeto → Propriedades do script**. A conta que implanta o
web app precisa ter **acesso de escrita** à pasta de contos.

## Rotas administrativas (mesma URL do web app, via `?page=`)

A geração do conto passa por um ponto único — `chamarGemini_` → `GeminiGateway`
(retry, rate limit, logs estruturados, modelo validado) — e o corpo do conto
ainda atravessa a guarda ética (`EthicsGuardService`). Os painéis da frota são
servidos por `doGet`:

| URL | Painel |
|---|---|
| *(sem parâmetro)* | Acervo com player TTS e questionário "Um conto por aluno" |
| `?page=features` | Micro-jornal: recomendações, temas e aprovações (com login) |
| `?page=reality` | Analítica da realidade escolar |
| `?page=maturity` | Auto-avaliação de maturidade do backend |
| `?page=fleet` | Observabilidade da frota (somente leitura) |

## Governança e segurança da IA

- **Revisão humana (FROTA-03):** o projeto dispõe de fluxo de rascunho,
  aprovação, edição e rejeição antes da liberação de conteúdo que exija
  curadoria.
- **Limites de uso (FROTA-05):** cotas e rate limit reduzem abuso, estouro de
  custos e indisponibilidade durante eventos.
- **Auditoria (FROTA-06):** chamadas e decisões podem ser registradas sem
  reproduzir conteúdo sensível.
- **Modelo centralizado (FROTA-07):** o modelo Gemini é definido por Script
  Property e validado contra a lista homologada.
- **Guarda ética:** prompts e contos passam por inspeção de segurança; conteúdo
  inadequado pode ser bloqueado ou substituído.
- **Saúde do sistema (FROTA-10):** o painel da frota verifica serviços,
  configuração e métricas operacionais.

Como prática pedagógica, os contos devem ser usados em ambiente acolhedor, sem
feedback que desencoraje a criatividade. Qualquer publicação ou circulação
externa deve respeitar o consentimento da criança e dos responsáveis, além das
regras da escola para proteção de dados e moderação.

## Deploy

1. Crie/abra o projeto em [script.google.com](https://script.google.com) e copie
   estes arquivos para a raiz (ou use `clasp push`).
2. Confirme as Script Properties acima.
3. **Implantar → Nova implantação → Tipo: app da Web**.
   - Executar como: **eu (proprietário)**
   - Quem tem acesso: **qualquer pessoa** (ou conforme sua escola exigir)
4. Autorize os escopos: Sheets + **Drive** (salvar os `.txt`) + serviço externo
   (Gemini). Como o Drive é **novo**, será preciso **reautorizar** e publicar uma
   nova versão da implantação.
5. Abra a URL gerada: o cabeçalho da aba `Respostas` é montado automaticamente
   na primeira abertura.

## Uso

Formulário com **uma pergunta por página** (radio buttons), para manter o foco
da criança: barra de progresso "Pergunta X de N", botões Voltar/Próxima e uma
tela de **Revisão** final (toque em qualquer resposta para corrigir) antes de
enviar. As 25 perguntas espelham `Questionario.md`.

Cada aluno entra com seu **login** e cria **um único conto** (o questionário
fica bloqueado depois disso). A cada envio (leva alguns segundos para gerar o
conto), o app mostra a diretriz atribuída, o **conto gerado** com link para o
`.txt` no Drive, e oferece **"Ouvir o acervo →"**. A submissão é gravada já
vinculada à identidade do aluno autenticado (coluna *Identificação*), o que
permite ao player **"Ouvir o acervo"** ordenar os contos ainda não lidos do mais
próximo ao mais distante do gosto médio do aluno (aferido pelas respostas do seu
questionário). O total de contos já atribuídos aparece na tela inicial e na de
resultado.

## Ajustes rápidos

- **Atualizar questionário**: Após modificar perguntas em `Questionario.gs`, execute
  `atualizarCabecalhoRespostas()` no Editor de Scripts para sincronizar a aba
  "Respostas". Consulte `MIGRACAO_26A_QUESTAO.md` para mais detalhes.
- Avanço automático ao escolher a opção: `AUTO_AVANCAR` / `ATRASO_AVANCO` em
  `JsCliente.html` (defina `AUTO_AVANCAR = false` para exigir o botão Próxima).
- Desligar a geração do conto: `CONFIG.GERAR_CONTO = false` em `Config.gs`.
- Pasta dos `.txt`: defina a Script Property `FOLDER_ID`.
- Limite do conto: `CONFIG.CONTO_MAX_CARACTERES` (padrão 2500).
- Desligar o Gemini na seleção: `CONFIG.USAR_GEMINI = false` em `Config.gs`.
- Trocar o modelo: defina a Script Property `GEMINI_MODEL`. Sem essa propriedade,
  o projeto falha com mensagem explícita em vez de usar um modelo fixo no código.
- Recriar o cabeçalho (após mudar perguntas/colunas): rode
  `reconstruirCabecalhoRespostas()` no editor do Apps Script. **Faça isso agora**
  para a aba `Respostas` ganhar as novas colunas de **conto** (Status, Título do
  Conto, Arquivo, Link) e `Diretriz: *` (todos os detalhes da diretriz). A linha
  de teste anterior (ex.: CT-223) fica sob o layout antigo — pode apagá-la.


---

## Ferramenta de Adaptação Massiva (Frota)

Este projeto inclui uma ferramenta completa para remover referências cruzadas entre projetos da frota e estabelecer identidade independente para cada projeto.

### Por que usar?

Elimina referências como:
- "A experiência segue a mesma anatomia visual do Tool Debate"
- "Baseado no Tool Debate"
- Nomes de funções como `testToolDebate()` em outros projetos

### Componentes

- **`AdaptacaoMassiva.gs`** — Configuração e padrões de substituição
- **`aplicar_adaptacao_massiva.py`** — Script Python que aplica as mudanças
- **`adaptacao_config.json`** — Configuração por projeto
- **`adaptar_projeto.bat`** — Script Windows para facilitar uso
- **`adaptar_frota.ps1`** — Script PowerShell para processar múltiplos projetos
- **`ADAPTACAO_MASSIVA.md`** — Documentação completa
- **`GUIA_APLICACAO_FROTA.md`** — Guia para aplicar em toda a frota

### Uso Rápido

```bash
# Testar sem modificar arquivos
python aplicar_adaptacao_massiva.py --dry-run --verbose

# Aplicar com backup automático
python aplicar_adaptacao_massiva.py --backup

# Ou use o script Windows
adaptar_projeto.bat test
adaptar_projeto.bat apply
```

### Para aplicar em toda a frota

```powershell
# Adapta múltiplos projetos automaticamente
.\adaptar_frota.ps1
```

Consulte `ADAPTACAO_MASSIVA.md` e `GUIA_APLICACAO_FROTA.md` para instruções detalhadas.

---

## Mapeamento de Schema da Planilha (item 6 — pré-requisito para fixtures analíticos)

> **Status do catálogo AI:** 2 diretrizes sintéticas catalogadas; não contêm dados de estudantes nem substituem curadoria literária/pedagógica.

### Abas declaradas no SchemaService

| Aba (sheetName) | Entidade | Tipo | Colunas principais |
|---|---|---|---|
| `Usuarios` | USERS (login real) | Autenticação | `ID`, `Username`, `Password`, `PasswordHash`, `Role`, `Nome`, `Email`, `Status` |
| `Leituras_Acervo` | LEITURAS_ACERVO | **Domínio analítico** | `ID`, `CriadoEm`, `ConcluidoEm`, `ChaveAluno`, `Identificacao`, `Idade`, `ArquivoId`, `ArquivoNome`, `ArquivoAtualizadoEm`, `Titulo`, `PerguntasJson`, `RespostasJson`, `Acertos`, `TotalPerguntas`, `PontosBase`, `BonusEscuta`, `BonusSequencia`, `PontosTotal`, `EscutaConcluida`, `DuracaoSegundos`, `Voz`, `Velocidade`, `Status`, `ResultadoJson` |
| `Progresso_Leitor` | PROGRESSO_LEITOR | **Domínio analítico** | `ChaveAluno`, `Identificacao`, `Idade`, `Pontos`, `LeiturasConcluidas`, `RespostasCorretas`, `TotalPerguntas`, `SequenciaAtual`, `MelhorSequencia`, `Nivel`, `Conquistas`, `UltimaLeituraId`, `UltimaLeituraEm`, `AtualizadoEm` |
| `Perguntas_Acervo` | PERGUNTAS_ACERVO | **Domínio analítico** | `ArquivoId`, `ArquivoNome`, `ArquivoAtualizadoEm`, `Titulo`, `PerguntasJson`, `GeradoEm`, `Modelo`, `Status` |
| `Diretrizes` | DIRETRIZES | **Domínio analítico** | `ID`, `Titulo`, `Universo ficcional`, `Problema narrativo`, `Paisagem DF`, `Paisagem natural`, `Paisagem urbana`, `Foco de pesquisa`, `Ancora em referencias`, `Personalizacao infantil`, `Interesse da crianca`, `Arranjo familiar ou social`, `Chave emocional`, `Nuance diferenciadora`, `Motor logico e sensibilizacao`, `ODS relacionados`, `Uso no modelo` |
| `Respostas` | RESPOSTAS | **Domínio analítico** | Colunas dinâmicas compostas em runtime: `COLUNAS_META` + perguntas de `obterPerguntas()` + `COLUNAS_PROCESSO` + `COLUNAS_CONTO` |
| `Notas` | NOTAS | Domínio (inferido) | `ID`, `ChaveAluno`, `Identificacao`, `Referencia`, `Nota`, `Comentario`, `CriadoEm` |
| `Settings` | SETTINGS | Configuração/Infra | `Key`, `Value`, `Description`, `Scope`, `UpdatedAt`, `UpdatedBy` |
| `Audit_Logs` | AUDIT_LOGS | Infraestrutura | `ID`, `Timestamp`, `Level`, `Action`, `Entity`, `RecordID`, `UserID`, `Message`, `Details`, `CreatedAt` |

### Semântica das colunas de domínio

**`Leituras_Acervo`** — cada leitura completada por um aluno:
- `ChaveAluno`: identificador anonimizado do aluno (sem nome real).
- `PerguntasJson` / `RespostasJson`: perguntas geradas pela IA e respostas do aluno em JSON.
- `BonusEscuta` / `BonusSequencia`: bônus de pontuação por modo de escuta e sequência de acertos.
- `Voz` / `Velocidade`: parâmetros de síntese de voz usados na leitura em áudio.

**`Progresso_Leitor`** — perfil gamificado acumulado:
- `SequenciaAtual` / `MelhorSequencia`: streak atual e recorde de sequência de acertos.
- `Nivel` / `Conquistas`: gamificação baseada em pontos acumulados.
- Identificador: `ChaveAluno` (não `ID`) — uma linha por aluno.

**`Diretrizes`** — diretrizes pedagógicas para geração de contos:
- `ODS relacionados`: ODS da ONU vinculados à diretriz — ancoragem curricular.
- `Chave emocional` / `Nuance diferenciadora`: parâmetros narrativos que guiam o modelo de IA.
- `Uso no modelo`: instrução direta ao LLM sobre como aplicar a diretriz.

**`Respostas`** — questionário de criação de conto:
- Estrutura dinâmica: as 25 colunas de perguntas são compostas em runtime por `obterPerguntas()` (fonte única: `Questionario.gs`).
- `Método de Seleção` / `ID Diretriz`: como a diretriz foi escolhida.
- `Título do Conto`, `Arquivo do Conto`, `Link do Conto`: resultado da geração.

**`Notas`** — status **inferido**, sem uso confirmado no código:
> Aba `Notas` catalogada com colunas inferidas — não há leituras posicionais confirmadas. Verificar se há dados reais antes de criar fixtures.

### Entidades pendentes de mapeamento analítico

| Entidade | Por que ainda não catalogada como fixture | O que precisa ser feito |
|---|---|---|
| `Leituras_Acervo` | Schema completo mas sem cenários contrastantes no catálogo | Criar 2 leituras: aluno com alta precisão/bônus vs. aluno iniciante com poucas respostas corretas |
| `Progresso_Leitor` | Derivado de `Leituras_Acervo` — precisa de fixtures de leitura primeiro | Criar progresso após definir leituras |
| `Diretrizes` | 2 diretrizes sintéticas já expostas no `AI_FIXTURE_CATALOG`; o banco completo ainda requer revisão | Ampliar para 2–3 diretrizes representativas com ODS e parâmetros preenchidos |
| `Respostas` | Estrutura dinâmica dificulta fixture estático | Aguardar estabilização das colunas de `obterPerguntas()` antes de catalogar |
| `Perguntas_Acervo` | Perguntas geradas por IA — armazenadas como JSON | Criar 1–2 entradas de exemplo com `PerguntasJson` populado |

**Abas excluídas do catálogo analítico (correto):** `Usuarios`, `Settings`, `Audit_Logs`.
