// ApiEndpoints.gs
/**
 * @overview Módulo que define os endpoints da API para o frontend do sistema de gestão agentica.
 *           Encapsula as chamadas de funções do lado do servidor que são acessadas via `google.script.run`.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para funções de login/logout.
 *   - UserManagement.gs: Para funções CRUD de usuários.
 *   - ProjectManagement.gs: Para funções CRUD de projetos.
 *   - TaskManagement.gs: Para funções CRUD de tarefas.
 *   - Evaluation.gs: Para funções de avaliação.
 *   - DriveIntegration.gs: Para funções de Drive.
 *   - ReportGeneration.gs: Para funções de geração de relatórios.
 *   - ErrorHandling.gs: Para tratamento de erros padronizado.
 *
 * @integrations
 *   - Google Apps Script `google.script.run`: Comunicação entre frontend e backend.
 *
 * @description
 *   Este módulo serve como a camada de interface entre o frontend (HTML/JavaScript)
 *   e o backend (Google Apps Script). Ele expõe funções do lado do servidor que podem
 *   ser chamadas diretamente do JavaScript do cliente usando `google.script.run`.
 *   Cada função aqui atua como um endpoint da API, chamando a lógica de negócios
 *   apropriada e garantindo que os erros sejam tratados de forma consistente.
 */

function apiLogin(email, password) {
  return ErrorHandling.tryCatch(function() { return Auth.doLogin(email, password); }, "apiLogin");
}

function apiLogout() {
  return ErrorHandling.tryCatch(function() { return Auth.doLogout(); }, "apiLogout");
}

function apiGetSessionUser() {
  return ErrorHandling.tryCatch(function() { return Auth.getSessionUser(); }, "apiGetSessionUser");
}

function apiCreateUser(userData) {
  return ErrorHandling.tryCatch(function() { return UserManagement.createUser(userData); }, "apiCreateUser");
}

function apiGetUserById(id) {
  return ErrorHandling.tryCatch(function() { return UserManagement.getUserById(id); }, "apiGetUserById");
}

function apiGetAllUsers() {
  return ErrorHandling.tryCatch(function() { return UserManagement.getAllUsers(); }, "apiGetAllUsers");
}

function apiUpdateUser(id, updates) {
  return ErrorHandling.tryCatch(function() { return UserManagement.updateUser(id, updates); }, "apiUpdateUser");
}

function apiDeleteUser(id) {
  return ErrorHandling.tryCatch(function() { return UserManagement.deleteUser(id); }, "apiDeleteUser");
}

function apiCreateProject(projectData) {
  return ErrorHandling.tryCatch(function() { return ProjectManagement.createProject(projectData); }, "apiCreateProject");
}

function apiGetProjectById(id) {
  return ErrorHandling.tryCatch(function() { return ProjectManagement.getProjectById(id); }, "apiGetProjectById");
}

function apiGetAllProjects() {
  return ErrorHandling.tryCatch(function() { return ProjectManagement.getAllProjects(); }, "apiGetAllProjects");
}

function apiUpdateProject(id, updates) {
  return ErrorHandling.tryCatch(function() { return ProjectManagement.updateProject(id, updates); }, "apiUpdateProject");
}

function apiDeleteProject(id) {
  return ErrorHandling.tryCatch(function() { return ProjectManagement.deleteProject(id); }, "apiDeleteProject");
}

function apiCreateTask(taskData) {
  return ErrorHandling.tryCatch(function() { return TaskManagement.createTask(taskData); }, "apiCreateTask");
}

function apiGetTaskById(id) {
  return ErrorHandling.tryCatch(function() { return TaskManagement.getTaskById(id); }, "apiGetTaskById");
}

function apiGetTasksByProjectId(projectId) {
  return ErrorHandling.tryCatch(function() { return TaskManagement.getTasksByProjectId(projectId); }, "apiGetTasksByProjectId");
}

function apiUpdateTask(id, updates) {
  return ErrorHandling.tryCatch(function() { return TaskManagement.updateTask(id, updates); }, "apiUpdateTask");
}

function apiDeleteTask(id) {
  return ErrorHandling.tryCatch(function() { return TaskManagement.deleteTask(id); }, "apiDeleteTask");
}

function apiCreateEvaluation(evaluationData) {
  return ErrorHandling.tryCatch(function() { return Evaluation.createEvaluation(evaluationData); }, "apiCreateEvaluation");
}

function apiGetEvaluationById(id) {
  return ErrorHandling.tryCatch(function() { return Evaluation.getEvaluationById(id); }, "apiGetEvaluationById");
}

function apiGetEvaluationsByProjectId(projectId) {
  return ErrorHandling.tryCatch(function() { return Evaluation.getEvaluationsByProjectId(projectId); }, "apiGetEvaluationsByProjectId");
}

function apiCalculateTeamAdherence(projectId) {
  return ErrorHandling.tryCatch(function() { return Evaluation.calculateTeamAdherence(projectId); }, "apiCalculateTeamAdherence");
}

function apiCalculateTeamUnderstanding(projectId) {
  return ErrorHandling.tryCatch(function() { return Evaluation.calculateTeamUnderstanding(projectId); }, "apiCalculateTeamUnderstanding");
}

function apiUploadFileToDrive(fileData, fileName, mimeType) {
  return ErrorHandling.tryCatch(function() { return DriveIntegration.uploadFileToDrive(fileData, fileName, mimeType); }, "apiUploadFileToDrive");
}

function apiListFilesInDriveFolder() {
  return ErrorHandling.tryCatch(function() { return DriveIntegration.listFilesInDriveFolder(); }, "apiListFilesInDriveFolder");
}

function apiDownloadFileFromDrive(fileId) {
  return ErrorHandling.tryCatch(function() { return DriveIntegration.downloadFileFromDrive(fileId); }, "apiDownloadFileFromDrive");
}

function apiGenerateProjectPerformanceReport(projectId) {
  return ErrorHandling.tryCatch(function() { return ReportGeneration.generateProjectPerformanceReport(projectId); }, "apiGenerateProjectPerformanceReport");
}

function apiGenerateTeamPerformanceReport() {
  return ErrorHandling.tryCatch(function() { return ReportGeneration.generateTeamPerformanceReport(); }, "apiGenerateTeamPerformanceReport");
}

function apiGetAdminDashboardData() {
  return ErrorHandling.tryCatch(function() { return AdminDashboard.getAdminDashboardData(); }, "apiGetAdminDashboardData");
}

function apiGetEmployeeDashboardData() {
  return ErrorHandling.tryCatch(function() { return EmployeeDashboard.getEmployeeDashboardData(); }, "apiGetEmployeeDashboardData");
}

function apiGetProjectDetails(projectId) {
  return ErrorHandling.tryCatch(function() { return ProjectDetails.getProjectDetails(projectId); }, "apiGetProjectDetails");
}

function apiGetTaskDetails(taskId) {
  return ErrorHandling.tryCatch(function() { return TaskDetails.getTaskDetails(taskId); }, "apiGetTaskDetails");
}

function apiGetProjectSummaryWithGemini(projectId) {
  return ErrorHandling.tryCatch(function() { return ProjectDetails.getProjectSummaryWithGemini(projectId); }, "apiGetProjectSummaryWithGemini");
}

function apiGetSuggestedTasksForProjectWithGemini(projectId) {
  return ErrorHandling.tryCatch(function() { return ProjectDetails.getSuggestedTasksForProjectWithGemini(projectId); }, "apiGetSuggestedTasksForProjectWithGemini");
}

function apiSendEmailNotification(recipientEmail, subject, body) {
  return ErrorHandling.tryCatch(function() { return NotificationService.sendEmailNotification(recipientEmail, subject, body); }, "apiSendEmailNotification");
}

function apiSendTaskReminder(taskId) {
  return ErrorHandling.tryCatch(function() { return NotificationService.sendTaskReminder(taskId); }, "apiSendTaskReminder");
}

function apiCreateSheetStructure() {
  return ErrorHandling.tryCatch(function() { return SpreadsheetService.createSheetStructure(); }, "apiCreateSheetStructure");
}
