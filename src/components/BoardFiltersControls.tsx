import type { BoardQuickFilter } from '../lib/tasks/taskQuickFilter';
import {
  TASK_SORT_DIRECTION_OPTIONS,
  TASK_SORT_FIELD_OPTIONS,
  type TaskSortDirection,
  type TaskSortField,
} from '../lib/tasks/taskSort';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';
import type { TaskCriticity, TaskStatus, TaskWithContext } from '../types/todo';
import type { ListTasksQuery } from '../types/todo';
import { BoardColumnVisibilityMenu } from './BoardColumnVisibilityMenu';
import { BoardQuickFilterChips } from './BoardQuickFilterChips';
import { BoardViewToggle } from './BoardViewToggle';
import { QuickTaskCreate } from './QuickTaskCreate';
import { Select } from './Select';
import { TaskImportExportMenu } from './TaskImportExportMenu';

const PRIORITY_FILTER_OPTIONS: { value: TaskCriticity | ''; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export interface BoardFiltersControlsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  priorityFilter: TaskCriticity | '';
  onPriorityFilterChange: (value: TaskCriticity | '') => void;
  sortField: TaskSortField;
  onSortFieldChange: (value: string) => void;
  sortDirection: TaskSortDirection;
  onSortDirectionChange: (value: string) => void;
  organizationId: string | null;
  projectId: string | null;
  organizations: Organization[];
  projects: Project[];
  onOrganizationChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  quickFilter: BoardQuickFilter;
  onQuickFilterChange: (value: BoardQuickFilter) => void;
  hasFilters: boolean;
  onClearFocus: () => void;
  hiddenColumns: TaskStatus[];
  onHiddenColumnsChange: (columns: TaskStatus[]) => void;
  viewMode: 'board' | 'list';
  onViewModeChange: (mode: 'board' | 'list') => void;
  tasks: TaskWithContext[];
  query: ListTasksQuery;
  onImported: () => Promise<void>;
  onCreated: () => Promise<void>;
  /** Hide desktop-only actions (quick create lives in FAB on mobile). */
  showQuickCreate?: boolean;
}

export function BoardFiltersControls({
  searchQuery,
  onSearchQueryChange,
  priorityFilter,
  onPriorityFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  organizationId,
  projectId,
  organizations,
  projects,
  onOrganizationChange,
  onProjectChange,
  quickFilter,
  onQuickFilterChange,
  hasFilters,
  onClearFocus,
  hiddenColumns,
  onHiddenColumnsChange,
  viewMode,
  onViewModeChange,
  tasks,
  query,
  onImported,
  onCreated,
  showQuickCreate = true,
}: BoardFiltersControlsProps) {
  return (
    <>
      <label className="board-filter-field board-filter-search">
        Title / ID
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by title or ID"
          aria-label="Filter tasks by title or ID"
        />
      </label>

      <label className="board-filter-field">
        Priority
        <Select
          value={priorityFilter}
          placeholder="All priorities"
          onChange={(value) => onPriorityFilterChange(value as TaskCriticity | '')}
          options={PRIORITY_FILTER_OPTIONS}
        />
      </label>

      <label className="board-filter-field">
        Sort by
        <Select
          value={sortField}
          onChange={onSortFieldChange}
          options={TASK_SORT_FIELD_OPTIONS}
        />
      </label>

      <label className="board-filter-field">
        Order
        <Select
          value={sortDirection}
          onChange={onSortDirectionChange}
          options={TASK_SORT_DIRECTION_OPTIONS}
        />
      </label>

      <label className="board-filter-field">
        Organization
        <Select
          value={organizationId ?? ''}
          placeholder="All organizations"
          onChange={onOrganizationChange}
          options={[
            { value: '', label: 'All organizations' },
            ...organizations.map((organization) => ({
              value: organization.id,
              label: organization.name,
            })),
          ]}
        />
      </label>

      <label className="board-filter-field">
        Project
        <Select
          value={projectId ?? ''}
          placeholder="All projects"
          disabled={!organizationId}
          onChange={onProjectChange}
          options={[
            { value: '', label: 'All projects' },
            ...projects.map((project) => ({
              value: project.id,
              label: project.name,
            })),
          ]}
        />
      </label>

      <BoardQuickFilterChips
        value={quickFilter}
        onChange={onQuickFilterChange}
      />

      {hasFilters ? (
        <button
          type="button"
          className="btn btn-secondary board-filter-clear"
          onClick={onClearFocus}
        >
          Clear focus
        </button>
      ) : null}

      <div className="board-filter-actions">
        <BoardColumnVisibilityMenu
          hiddenColumns={hiddenColumns}
          onChange={onHiddenColumnsChange}
        />
        <BoardViewToggle viewMode={viewMode} onChange={onViewModeChange} />
        <TaskImportExportMenu
          tasks={tasks}
          query={query}
          onImported={onImported}
        />
        {showQuickCreate ? (
          <QuickTaskCreate onCreated={onCreated} />
        ) : null}
      </div>
    </>
  );
}
