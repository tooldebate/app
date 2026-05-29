// DataValidation.gs
/**
 * @overview Módulo de validação de dados para o sistema de gestão agentica.
 *           Contém funções para validar a integridade e o formato dos dados de entrada
 *           para usuários, projetos, tarefas e avaliações.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Utils.gs: Para funções utilitárias como validação de e-mail.
 *   - Logger.gs: Para registrar erros de validação.
 *
 * @integrations Nenhuma.
 *
 * @description
 *   Este módulo é crucial para garantir a qualidade e a consistência dos dados no sistema.
 *   Ele define regras de validação para diferentes tipos de entidades (usuários, projetos,
 *   tarefas, avaliações), verificando se os campos obrigatórios estão preenchidos, se os
 *   formatos estão corretos (ex: e-mail válido, datas válidas) e se os valores estão dentro
 *   dos limites esperados. A validação é realizada antes que os dados sejam persistidos
 *   na Google Planilha, prevenindo erros e inconsistências.
 */

function validateUser(userData) {
  if (!userData.Nome || userData.Nome.trim() === "") {
    Logger.log("Erro de validação de usuário: Nome é obrigatório.");
    throw new Error("Nome do usuário é obrigatório.");
  }
  if (!userData.Email || !Utils.isValidEmail(userData.Email)) {
    Logger.log("Erro de validação de usuário: Email inválido.");
    throw new Error("Email do usuário é inválido.");
  }
  if (!userData.Senha || userData.Senha.trim() === "") {
    Logger.log("Erro de validação de usuário: Senha é obrigatória.");
    throw new Error("Senha do usuário é obrigatória.");
  }
  if (!userData.Role || (userData.Role !== "Administrador" && userData.Role !== "Funcionário")) {
    Logger.log("Erro de validação de usuário: Papel inválido.");
    throw new Error("Papel do usuário deve ser 'Administrador' ou 'Funcionário'.");
  }
  return true;
}

function validateProject(projectData) {
  if (!projectData.NomeProjeto || projectData.NomeProjeto.trim() === "") {
    Logger.log("Erro de validação de projeto: Nome do Projeto é obrigatório.");
    throw new Error("Nome do Projeto é obrigatório.");
  }
  if (!projectData.Status || projectData.Status.trim() === "") {
    Logger.log("Erro de validação de projeto: Status é obrigatório.");
    throw new Error("Status do Projeto é obrigatório.");
  }
  // Validação de datas pode ser mais complexa, garantindo que DataFim > DataInicio
  if (projectData.DataInicio && isNaN(new Date(projectData.DataInicio))) {
    Logger.log("Erro de validação de projeto: Data de Início inválida.");
    throw new Error("Data de Início do Projeto é inválida.");
  }
  if (projectData.DataFim && isNaN(new Date(projectData.DataFim))) {
    Logger.log("Erro de validação de projeto: Data de Fim inválida.");
    throw new Error("Data de Fim do Projeto é inválida.");
  }
  return true;
}

function validateTask(taskData) {
  if (!taskData.ProjetoID) {
    Logger.log("Erro de validação de tarefa: ID do Projeto é obrigatório.");
    throw new Error("ID do Projeto é obrigatório para a tarefa.");
  }
  if (!taskData.Descricao || taskData.Descricao.trim() === "") {
    Logger.log("Erro de validação de tarefa: Descrição é obrigatória.");
    throw new Error("Descrição da Tarefa é obrigatória.");
  }
  if (!taskData.ResponsavelID) {
    Logger.log("Erro de validação de tarefa: ID do Responsável é obrigatório.");
    throw new Error("ID do Responsável pela Tarefa é obrigatório.");
  }
  if (taskData.Prazo && isNaN(new Date(taskData.Prazo))) {
    Logger.log("Erro de validação de tarefa: Prazo inválido.");
    throw new Error("Prazo da Tarefa é inválido.");
  }
  return true;
}

function validateEvaluation(evaluationData) {
  if (!evaluationData.ProjetoID) {
    Logger.log("Erro de validação de avaliação: ID do Projeto é obrigatório.");
    throw new Error("ID do Projeto é obrigatório para a avaliação.");
  }
  if (!evaluationData.UsuarioID) {
    Logger.log("Erro de validação de avaliação: ID do Usuário é obrigatório.");
    throw new Error("ID do Usuário avaliado é obrigatório.");
  }
  if (typeof evaluationData.Pontuacao !== "number" || evaluationData.Pontuacao < 0 || evaluationData.Pontuacao > 100) {
    Logger.log("Erro de validação de avaliação: Pontuação inválida.");
    throw new Error("Pontuação da avaliação deve ser um número entre 0 e 100.");
  }
  return true;
}
