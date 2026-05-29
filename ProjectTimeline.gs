// ProjectTimeline.gs
/**
 * @overview Módulo para gerenciar e visualizar a linha do tempo de projetos.
 *           Fornece funções para extrair marcos e datas importantes de projetos e tarefas.
 *
 * @author Manus AI
 * @version 1.0.0
 * @since 2026-05-28
 *
 * @dependencies
 *   - ProjectManagement.gs: Para obter dados de projetos.
 *   - TaskManagement.gs: Para obter dados de tarefas.
 *   - Utils.gs: Para formatação de datas.
 *
 * @integrations
 *   - Google Sheets: Fonte de dados para projetos e tarefas.
 *
 * @description
 *   Este módulo é responsável por consolidar as informações de datas de projetos
 *   e tarefas para criar uma representação de linha do tempo. Ele pode extrair
 *   datas de início, fim e prazos, e formatá-las de forma que possam ser facilmente
 *   visualizadas em um gráfico de Gantt ou em uma lista cronológica no frontend.
 *   Isso ajuda os gerentes de projeto a monitorar o progresso e identificar
 *   dependências e gargalos.
 */

function getProjectTimelineEvents(projectId) {
  var project = ProjectManagement.getProjectById(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  var events = [];

  // Adicionar o projeto como um evento principal
  if (project.DataInicio) {
    events.push({
      id: `project-${project.ID}-start`,
      title: `Início do Projeto: ${project.NomeProjeto}`,
      start: project.DataInicio,
      end: project.DataInicio,
      type: "project-start",
      color: "#4CAF50" // Verde
    });
  }
  if (project.DataFim) {
    events.push({
      id: `project-${project.ID}-end`,
      title: `Fim do Projeto: ${project.NomeProjeto}`,
      start: project.DataFim,
      end: project.DataFim,
      type: "project-end",
      color: "#F44336" // Vermelho
    });
  }

  // Adicionar tarefas como eventos
  var tasks = TaskManagement.getTasksByProjectId(projectId);
  tasks.forEach(function(task) {
    if (task.Prazo) {
      events.push({
        id: `task-${task.ID}`,
        title: `Tarefa: ${task.Descricao}`,
        start: task.Prazo,
        end: task.Prazo,
        type: "task-due",
        color: task.Status === "Concluída" ? "#2196F3" : (new Date(task.Prazo) < new Date() ? "#FF9800" : "#9E9E9E") // Azul, Laranja, Cinza
      });
    }
  });

  // Ordenar eventos por data
  events.sort(function(a, b) {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  return events;
}

function getGlobalTimelineEvents() {
  var allProjects = ProjectManagement.getAllProjects();
  var events = [];

  allProjects.forEach(function(project) {
    if (project.DataInicio) {
      events.push({
        id: `project-${project.ID}-start`,
        title: `Início do Projeto: ${project.NomeProjeto}`,
        start: project.DataInicio,
        end: project.DataInicio,
        type: "project-start",
        color: "#4CAF50"
      });
    }
    if (project.DataFim) {
      events.push({
        id: `project-${project.ID}-end`,
        title: `Fim do Projeto: ${project.NomeProjeto}`,
        start: project.DataFim,
        end: project.DataFim,
        type: "project-end",
        color: "#F44336"
      });
    }

    var tasks = TaskManagement.getTasksByProjectId(project.ID);
    tasks.forEach(function(task) {
      if (task.Prazo) {
        events.push({
          id: `task-${task.ID}`,
          title: `Tarefa: ${task.Descricao} (${project.NomeProjeto})`,
          start: task.Prazo,
          end: task.Prazo,
          type: "task-due",
          color: task.Status === "Concluída" ? "#2196F3" : (new Date(task.Prazo) < new Date() ? "#FF9800" : "#9E9E9E")
        });
      }
    });
  });

  events.sort(function(a, b) {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  return events;
}
