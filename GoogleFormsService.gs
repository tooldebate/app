// GoogleFormsService.gs
/**
 * @overview Módulo de integração com o Google Forms para coleta de feedback e avaliações.
 *           Permite criar formulários dinamicamente e processar suas respostas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Config.gs: Para obter o ID da pasta do Drive para formulários.
 *   - Logger.gs: Para registrar operações do Forms.
 *
 * @integrations
 *   - Google Forms API: Gerenciamento de formulários.
 *
 * @description
 *   Este módulo permite que o sistema crie e gerencie formulários do Google Forms
 *   programaticamente. Isso pode ser usado para coletar feedback da equipe sobre
 *   projetos, realizar pesquisas de satisfação ou criar formulários de avaliação
 *   personalizados. A capacidade de criar formulários dinamicamente e processar
 *   suas respostas diretamente no Apps Script adiciona uma poderosa ferramenta
 *   de coleta de dados ao sistema.
 */

function createFeedbackForm(title, description, questions, parentFolderId) {
  try {
    var form = FormApp.create(title);
    form.setDescription(description);

    questions.forEach(function(q) {
      if (q.type === "TEXT") {
        form.addTextItem().setTitle(q.title).setRequired(q.required || false);
      } else if (q.type === "PARAGRAPH_TEXT") {
        form.addParagraphTextItem().setTitle(q.title).setRequired(q.required || false);
      } else if (q.type === "MULTIPLE_CHOICE") {
        form.addMultipleChoiceItem().setTitle(q.title).setChoiceValues(q.choices).setRequired(q.required || false);
      } else if (q.type === "SCALE") {
        form.addScaleItem().setTitle(q.title).setLowerBound(q.lowerBound || 1).setUpperBound(q.upperBound || 5).setRequired(q.required || false);
      }
      // Adicionar outros tipos de perguntas conforme necessário
    });

    var file = DriveApp.getFileById(form.getId());
    if (parentFolderId) {
      var parentFolder = DriveApp.getFolderById(parentFolderId);
      file.moveTo(parentFolder);
    }

    Logger.log(`Formulário de feedback '${title}' (${form.getId()}) criado no Google Forms.`);
    return { success: true, message: "Formulário criado com sucesso.", formId: form.getId(), formUrl: form.getPublishedUrl() };
  } catch (e) {
    Logger.log(`Erro ao criar formulário no Google Forms: ${e.message}`);
    throw new Error(`Erro ao criar formulário no Google Forms: ${e.message}`);
  }
}

function getFormResponses(formId) {
  try {
    var form = FormApp.openById(formId);
    var responses = form.getResponses();
    var formattedResponses = [];
    responses.forEach(function(response) {
      var itemResponses = response.getItemResponses();
      var responseData = { timestamp: response.getTimestamp().toISOString() };
      itemResponses.forEach(function(itemResponse) {
        responseData[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
      });
      formattedResponses.push(responseData);
    });
    Logger.log(`Respostas do formulário ID ${formId} lidas.`);
    return { success: true, responses: formattedResponses };
  } catch (e) {
    Logger.log(`Erro ao ler respostas do formulário ID ${formId}: ${e.message}`);
    throw new Error(`Erro ao ler respostas do formulário: ${e.message}`);
  }
}
