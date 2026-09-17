/**
 * Liga um rascunho de conto a sua linha reservada e impede publicação no Drive
 * antes da aprovação humana da versão exata.
 */
var StoryPublicationService = (function() {
  var PREFIX = 'TOOL_STORY_PUBLICATION_V1_';
  var OWNER_PREFIX = 'TOOL_STORY_OWNER_V1_';

  function key_(reviewId) {
    var id = String(reviewId || '').trim();
    if (!/^[A-Za-z0-9_-]{8,180}$/.test(id)) throw new Error('Rascunho de conto inválido.');
    return PREFIX + id;
  }

  function props_() {
    return PropertiesService.getScriptProperties();
  }

  function owner_(principal) {
    var value = String(principal && (principal.username || principal.userId) || '').trim();
    if (!value) throw new Error('Sessão sem estudante identificado.');
    return value;
  }

  function ownerKey_(ownerId) {
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(ownerId),
      Utilities.Charset.UTF_8
    );
    var digest = Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 32);
    return OWNER_PREFIX + digest;
  }

  function read_(reviewId) {
    var raw = props_().getProperty(key_(reviewId));
    if (!raw) throw new Error('Vínculo de publicação inexistente. Gere um novo rascunho.');
    return JSON.parse(raw);
  }

  function write_(record) {
    props_().setProperty(key_(record.reviewId), JSON.stringify(record));
    return record;
  }

  function bindDraft(reviewId, principal, reservation, story) {
    var record = {
      reviewId: String(reviewId),
      ownerId: owner_(principal),
      row: Number(reservation.linha),
      studentRecordId: String(reservation.idAluno),
      title: String(story.titulo || 'Meu conto').slice(0, 180),
      directive: montarDiretrizParaCliente_(reservation.diretriz),
      method: String(reservation.metodo || ''),
      status: 'draft',
      createdAt: new Date().toISOString(),
      publication: null
    };
    write_(record);
    props_().setProperty(ownerKey_(record.ownerId), record.reviewId);
    return record;
  }

  function getCurrent(token) {
    var principal = requireAuthenticatedPrincipal_(token || '');
    var ownerId = owner_(principal);
    var reviewId = props_().getProperty(ownerKey_(ownerId));
    if (!reviewId) return null;
    var record = read_(reviewId);
    if (record.ownerId !== ownerId || record.status === 'published') return null;
    var draft;
    try {
      draft = HumanReviewService.get(reviewId);
    } catch (error) {
      return {
        expired: true,
        message: 'O prazo de revisão terminou. Peça à professora para reprocessar o conto.',
        studentRecordId: record.studentRecordId,
        row: record.row,
        title: record.title
      };
    }
    var review = HumanReviewService.metadata(draft);
    review.content = draft.content;
    return {
      expired: false,
      studentRecordId: record.studentRecordId,
      row: record.row,
      title: record.title,
      directive: record.directive,
      method: record.method,
      review: review
    };
  }

  function localQuestions_(title) {
    var label = String(title || 'o conto');
    return [
      { pergunta: 'Quem é o personagem principal de “' + label + '” e o que ele queria?', dica: 'Procure no começo do conto.' },
      { pergunta: 'Que escolha mudou o rumo da história?', dica: 'Junte as pistas do problema e da solução.' },
      { pergunta: 'O que você manteria ou mudaria se escrevesse uma nova versão?', dica: 'Pense na sua própria intenção como autora ou autor.' }
    ];
  }

  function syncRow_(record) {
    atualizarLinhaResposta(record.row, {
      'Status': STATUS.CONTO_GERADO,
      'Título do Conto': record.title,
      'Arquivo do Conto': record.publication.fileName,
      'Link do Conto': record.publication.url
    });
  }

  function publish(token, reviewId, expectedVersion) {
    var principal = requireAuthenticatedPrincipal_(token || '');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('Outra publicação está em andamento. Tente novamente.');
    try {
      var record = read_(reviewId);
      if (record.ownerId !== owner_(principal)) throw new Error('Este conto pertence a outro estudante.');

      if (record.status === 'published' && record.publication) {
        syncRow_(record);
        return record.publication;
      }

      var approved = HumanReviewService.assertApproved(reviewId, expectedVersion);
      var body = limitarCaracteres_(String(approved.content || '').trim(), CONFIG.CONTO_MAX_CARACTERES);
      if (!body) throw new Error('O conto aprovado está vazio.');
      body = aplicarGuardaEticaConto_(body);

      var file = salvarContoNoDrive(
        nomeArquivoConto_(record.studentRecordId, record.title),
        record.title + '\n\n' + body
      );
      record.status = 'published';
      record.publishedAt = new Date().toISOString();
      record.publication = {
        ok: true,
        reviewId: record.reviewId,
        version: approved.version,
        title: record.title,
        characters: body.length,
        fileName: file.nome,
        url: file.url,
        questions: localQuestions_(record.title)
      };
      write_(record);
      syncRow_(record);
      return record.publication;
    } finally {
      lock.releaseLock();
    }
  }

  return { bindDraft: bindDraft, getCurrent: getCurrent, publish: publish };
})();

function apiPublicarConto(token, reviewId, expectedVersion) {
  return StoryPublicationService.publish(token || '', reviewId, expectedVersion);
}

function apiObterRascunhoConto(token) {
  return StoryPublicationService.getCurrent(token || '');
}
