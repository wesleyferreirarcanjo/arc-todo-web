import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { LayoutGroup } from 'framer-motion';
import type { TaskCriticity, TaskStatus, TaskWithContext } from '../types/todo';
import { getEntityAccent, getProjectColor } from '../lib/color/entityColor';
import { useTaskBoardDnd } from '../lib/board/useTaskBoardDnd';
import { StatusMoveAnimationProvider } from '../lib/motion/StatusMoveAnimationContext';
import { BoardColumn } from './BoardColumn';
import { TaskCard, TaskCardOverlay } from './TaskCard';

interface UnifiedTaskBoardProps {
  tasks: TaskWithContext[];
  onUpdate: (
    task: TaskWithContext,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
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
        { projectId: string; projectName: string; projectColor: string; tasks: TaskWithContext[] }
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
        projectColor: getProjectColor(task.project),
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
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const getTaskStatus = useCallback(
    (taskId: string) => taskById.get(taskId)?.status,
    [taskById],
  );

  const {
    activeTaskId,
    overColumnStatus,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useTaskBoardDnd({
    getTaskStatus,
    onMoveTask: async (taskId, status) => {
      const task = taskById.get(taskId);
      if (!task || task.status === status) return;
      await onUpdate(task, { status });
    },
  });

  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;

  return (
    <StatusMoveAnimationProvider>
      <LayoutGroup id="unified-task-board">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={handleDragCancel}
      >
        <div className="task-board">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          const grouped = groupTasksByOrgAndProject(columnTasks);

          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              taskCount={columnTasks.length}
              isDropTarget={overColumnStatus === column.status}
            >
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
                              '--entity-accent': projectGroup.projectColor,
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
                              accentColor={projectGroup.projectColor}
                              draggable
                              isDragging={activeTaskId === task.id}
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
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            organizationName={activeTask.organization.name}
            projectName={activeTask.project.name}
            accentColor={getProjectColor(activeTask.project)}
          />
        ) : null}
      </DragOverlay>
      </DndContext>
      </LayoutGroup>
    </StatusMoveAnimationProvider>
  );
}
