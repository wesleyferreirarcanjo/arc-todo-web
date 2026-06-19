import type { CSSProperties } from 'react';
import type { TaskPriority, TaskStatus, TaskWithContext } from '../types/todo';
import { getEntityAccent } from '../lib/color/entityColor';
import { TaskCard } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
  onUpdate: (
    task: TaskWithContext,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (task: TaskWithContext) => Promise<void>;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

function groupTasksByOrgAndProject(tasks: TaskWithContext[]) {
  const orgMap = new Map<
    string,
    {
      orgId: string;
      orgName: string;
      projects: Map<
        string,
        { projectId: string; projectName: string; tasks: TaskWithContext[] }
      >;
    }
  >();

  for (const task of tasks) {
    const orgId = task.organization.id;
    const projectId = task.project.id;

    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, {
        orgId,
        orgName: task.organization.name,
        projects: new Map(),
      });
    }

    const orgEntry = orgMap.get(orgId)!;
    if (!orgEntry.projects.has(projectId)) {
      orgEntry.projects.set(projectId, {
        projectId,
        projectName: task.project.name,
        tasks: [],
      });
    }

    orgEntry.projects.get(projectId)!.tasks.push(task);
  }

  return Array.from(orgMap.values()).map((org) => ({
    ...org,
    projects: Array.from(org.projects.values()),
  }));
}

export function UnifiedTaskBoard({
  tasks,
  onUpdate,
  onDelete,
}: UnifiedTaskBoardProps) {
  return (
    <div className="task-board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        const grouped = groupTasksByOrgAndProject(columnTasks);

        return (
          <section key={column.status} className="board-column">
            <header className="board-column-header">
              <h2>{column.title}</h2>
              <span className="count-badge">{columnTasks.length}</span>
            </header>
            <div className="board-column-body">
              {columnTasks.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                grouped.map((orgGroup) => (
                  <div key={orgGroup.orgId} className="board-org-group">
                    <h3
                      className="board-org-header"
                      style={
                        {
                          '--entity-accent': getEntityAccent(orgGroup.orgId),
                        } as CSSProperties
                      }
                    >
                      {orgGroup.orgName}
                    </h3>
                    {orgGroup.projects.map((projectGroup) => (
                      <div
                        key={projectGroup.projectId}
                        className="board-project-group"
                      >
                        <h4
                          className="board-project-header"
                          style={
                            {
                              '--entity-accent': getEntityAccent(
                                projectGroup.projectId,
                              ),
                            } as CSSProperties
                          }
                        >
                          {projectGroup.projectName}
                        </h4>
                        <div className="board-project-tasks">
                          {projectGroup.tasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              organizationName={task.organization.name}
                              projectName={task.project.name}
                              accentColor={getEntityAccent(task.project.id)}
                              onUpdate={(_id, input) => onUpdate(task, input)}
                              onDelete={() => onDelete(task)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
