/** Avaliação de maturidade do frontend */
function assessFrontendMaturity(data) {
  var criteria = [
    { key: 'accessibility', label: 'Boas práticas de acessibilidade' },
    { key: 'responsive', label: 'Interface responsiva' },
    { key: 'semantic', label: 'HTML semântico' },
    { key: 'performance', label: 'Otimização de performance' },
    { key: 'testing', label: 'Testes automatizados de UI' },
    { key: 'docs', label: 'Documentação clara' }
  ];
  var score = 0;
  var details = criteria.map(function(c) {
    var pass = !!data[c.key];
    if (pass) score++;
    return { label: c.label + (pass ? ' ✔️' : ' ❌'), pass: pass };
  });
  return { score: score, details: details };
}

function showMaturityAssessment() {
  var html = HtmlService.createHtmlOutputFromFile('MaturityAssessment.html')
    .setWidth(500)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Frontend Maturity Assessment');
}
