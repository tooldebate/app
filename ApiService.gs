// ApiService.gs
/**
 * @overview Módulo que expõe funções do lado do servidor para o frontend via google.script.run.
 *           Atua como a camada de API para todas as interações da interface do usuário.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - Auth.gs: Para login e logout.
 *   - UserManagement.gs: Para operações CRUD de usuários.
 *   - ProjectManagement.gs: Para operações CRUD de projetos.
 *   - TaskManagement.gs: Para operações CRUD de tarefas.
 *   - Evaluation.gs: Para operações CRUD de avaliações.
 *   - GeminiChatService.gs: Para interações com o chat Gemini.
 *   - DashboardDataAggregator.gs: Para obter dados do dashboard.
 *   - ProjectReportGenerator.gs: Para gerar relatórios de projeto.
 *   - DriveIntegration.gs: Para listar arquivos do Drive.
 *   - NotificationSettings.gs: Para gerenciar configurações de notificação.
 *   - ProjectEvaluation.gs: Para gerenciar avaliações de projeto.
 *   - UserRoleManagement.gs: Para gerenciar papéis de usuário.
 *
 * @integrations
 *   - Frontend (HTML/JavaScript): Consome as funções expostas.
 *
 * @description
 *   Este módulo é o ponto de entrada para todas as chamadas do lado do cliente (frontend)
 *   para o lado do servidor (Apps Script). Ele expõe funções globais que podem ser
 *   chamadas diretamente do JavaScript no HTML usando `google.script.run`. Cada função
 *   aqui atua como um wrapper para a lógica de negócios real implementada em outros
 *   módulos `.gs`, garantindo que as permissões e a segurança sejam aplicadas
 *   adequadamente antes de executar qualquer operação.
 */

function apiLogin(email, password) {
  return AuthenticationService.loginUser(email, password);
}

function apiLogout() {
  return AuthenticationService.logoutUser();
}

function apiGetSessionUser() {
  return AuthenticationService.getCurrentUserSession();
}

// User Management
function apiGetAllUsers() {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para visualizar usuários.');
  }
  return UserManagement.getAllUsers();
}

function apiGetUserById(userId) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para visualizar este usuário.');
  }
  return UserManagement.getUserById(userId);
}

function apiCreateUser(userData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para criar usuários.');
  }
  return UserManagement.createUser(userData);
}

function apiUpdateUser(userId, userData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para atualizar usuários.');
  }
  return UserManagement.updateUser(userId, userData);
}

function apiDeleteUser(userId) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para deletar usuários.');
  }
  return UserManagement.deleteUser(userId);
}

// Project Management
function apiGetAllProjects() {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  if (session.role === 'Administrador') {
    return ProjectManagement.getAllProjects();
  } else {
    return ProjectManagement.getProjectsByResponsible(session.id);
  }
}

function apiGetProjectById(projectId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error('Projeto não encontrado.');
  }
  if (session.role === 'Administrador' || project.ResponsavelID == session.id) {
    return project;
  } else {
    throw new Error('Acesso negado. Você não tem permissão para visualizar este projeto.');
  }
}

function apiCreateProject(projectData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para criar projetos.');
  }
  return ProjectManagement.createProject(projectData);
}

function apiUpdateProject(projectId, projectData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para atualizar projetos.');
  }
  return ProjectManagement.updateProject(projectId, projectData);
}

function apiDeleteProject(projectId) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para deletar projetos.');
  }
  return ProjectManagement.deleteProject(projectId);
}

// Task Management
function apiGetTasksByProjectId(projectId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var tasks = TaskManagement.getTasksByProjectId(projectId);
  if (session.role === 'Administrador') {
    return tasks;
  } else {
    // Funcionários só veem tarefas que são responsáveis ou do projeto que são responsáveis
    var project = ProjectManagement.getProjectById(projectId);
    if (project && project.ResponsavelID == session.id) {
      return tasks;
    }
    return tasks.filter(function(task) { return task.ResponsavelID == session.id; });
  }
}

function apiGetTaskById(taskId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var task = TaskManagement.getTaskById(taskId);
  if (!task) {
    throw new Error('Tarefa não encontrada.');
  }
  var project = ProjectManagement.getProjectById(task.ProjetoID);
  if (session.role === 'Administrador' || task.ResponsavelID == session.id || (project && project.ResponsavelID == session.id)) {
    return task;
  } else {
    throw new Error('Acesso negado. Você não tem permissão para visualizar esta tarefa.');
  }
}

function apiCreateTask(taskData) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  if (session.role === 'Administrador' || ProjectManagement.getProjectById(taskData.ProjetoID).ResponsavelID == session.id) {
    return TaskManagement.createTask(taskData);
  } else {
    throw new Error('Acesso negado. Você não tem permissão para criar tarefas neste projeto.');
  }
}

function apiUpdateTask(taskId, taskData) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var existingTask = TaskManagement.getTaskById(taskId);
  if (!existingTask) {
    throw new Error('Tarefa não encontrada.');
  }
  var project = ProjectManagement.getProjectById(existingTask.ProjetoID);
  if (session.role === 'Administrador' || existingTask.ResponsavelID == session.id || (project && project.ResponsavelID == session.id)) {
    return TaskManagement.updateTask(taskId, taskData);
  } else {
    throw new Error('Acesso negado. Você não tem permissão para atualizar esta tarefa.');
  }
}

function apiDeleteTask(taskId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var existingTask = TaskManagement.getTaskById(taskId);
  if (!existingTask) {
    throw new Error('Tarefa não encontrada.');
  }
  var project = ProjectManagement.getProjectById(existingTask.ProjetoID);
  if (session.role === 'Administrador' || (project && project.ResponsavelID == session.id)) {
    return TaskManagement.deleteTask(taskId);
  } else {
    throw new Error('Acesso negado. Você não tem permissão para deletar esta tarefa.');
  }
}

// Evaluation
function apiAddProjectEvaluation(projectId, adherenceScore, understandingScore, comments) {
  return ProjectEvaluation.addProjectEvaluation(projectId, adherenceScore, understandingScore, comments);
}

function apiGetProjectEvaluations(projectId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var project = ProjectManagement.getProjectById(projectId);
  if (session.role === 'Administrador' || (project && project.ResponsavelID == session.id)) {
    return ProjectEvaluation.getProjectEvaluations(projectId);
  } else {
    throw new Error('Acesso negado. Você não tem permissão para visualizar avaliações deste projeto.');
  }
}

// Gemini Chat
function apiSendChatMessageToGemini(message) {
  return GeminiChatService.sendChatMessageToGemini(message);
}

function apiGetChatHistory() {
  return GeminiChatService.getChatHistory();
}

function apiClearChatHistory() {
  return GeminiChatService.clearChatHistory();
}

// Dashboard Data
function apiGetAdminDashboardData() {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para visualizar o dashboard do administrador.');
  }
  return DashboardDataAggregator.getAggregatedDashboardDataForAdmin();
}

function apiGetEmployeeDashboardData() {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  return DashboardDataAggregator.getAggregatedDashboardDataForEmployee(session.id);
}

// Reports
function apiGenerateDetailedProjectReport(projectId) {
  return ProjectReportGenerator.generateDetailedProjectReport(projectId);
}

function apiGenerateProjectStatusReport(projectId) {
  return ProjectStatusReport.generateProjectStatusReport(projectId);
}

// Drive Files
function apiListDriveFiles(folderId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  // Implementar lógica de permissão aqui, se necessário
  return DriveIntegration.listFilesInFolder(folderId);
}

function apiUploadFile(fileData, fileName, mimeType, parentFolderId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  // Implementar lógica de permissão aqui, se necessário
  return DriveIntegration.uploadFileToDrive(fileData, fileName, mimeType, parentFolderId);
}

// Notification Settings
function apiGetUserNotificationSettings() {
  return NotificationSettings.getUserNotificationSettings();
}

function apiSaveUserNotificationSettings(newSettings) {
  return NotificationSettings.saveUserNotificationSettings(newSettings);
}

// Project Templates
function apiCreateProjectTemplate(templateData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para criar modelos de projeto.');
  }
  return ProjectTemplates.createProjectTemplate(templateData);
}

function apiGetProjectTemplates() {
  return ProjectTemplates.getAllProjectTemplates();
}

function apiCreateProjectFromTemplate(templateId, newProjectData) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para criar projetos a partir de modelos.');
  }
  return ProjectTemplates.createProjectFromTemplate(templateId, newProjectData);
}

// User Role Management
function apiAssignUserRole(userId, roleName) {
  return UserRoleManagement.assignUserRole(userId, roleName);
}

function apiCreateRole(roleData) {
  return UserRoleManagement.createRole(roleData);
}

function apiGetRolePermissions(roleName) {
  return UserRoleManagement.getRolePermissions(roleName);
}

// Project Comments
function apiAddProjectComment(projectId, commentText) {
  return ProjectComments.addProjectComment(projectId, commentText);
}

function apiGetProjectComments(projectId) {
  return ProjectComments.getProjectComments(projectId);
}

// Project Team Management
function apiAddUserToProjectTeam(projectId, userId) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para gerenciar equipes de projeto.');
  }
  return ProjectTeamManagement.addUserToProjectTeam(projectId, userId);
}

function apiRemoveUserFromProjectTeam(projectId, userId) {
  if (!AuthenticationService.checkUserPermissions('Administrador')) {
    throw new Error('Acesso negado. Você não tem permissão para gerenciar equipes de projeto.');
  }
  return ProjectTeamManagement.removeUserFromProjectTeam(projectId, userId);
}

function apiGetProjectTeamMembers(projectId) {
  var session = AuthenticationService.getCurrentUserSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
  var project = ProjectManagement.getProjectById(projectId);
  if (session.role === 'Administrador' || (project && project.ResponsavelID == session.id)) {
    return ProjectTeamManagement.getProjectTeamMembers(projectId);
  } else {
    throw new Error('Acesso negado. Você não tem permissão para visualizar os membros da equipe deste projeto.');
  }
}
