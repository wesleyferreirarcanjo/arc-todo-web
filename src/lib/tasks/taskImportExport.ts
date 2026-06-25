import * as XLSX from 'xlsx';
import {
  createProjectTask,
  resolveTaskByIdentifier,
  updateProjectTask,
} from '../api/todos';
import { triggerBrowserDownload } from '../api/client';
import type {
  ListTasksQuery,
  TaskCategory,
  TaskCriticity,
  TaskExportDocument,
  TaskExportFormat,
  TaskExportRow,
  TaskImportResult,
  TaskStatus,
  TaskWithContext,
} from '../../types/todo';
import {
  DEFAULT_TASK_CATEGORY,
  parseMetadataColumn,
  serializeMetadataColumn,
} from './taskCategory';
import { isTaskStatus } from './taskStatus';
import { taskDescriptionFieldsFromTask } from './taskDescriptions';

const SCHEMA_VERSION = 2 as const;

const EXPORT_COLUMNS = [
  'schemaVersion',
  'id',
  'displayId',
  'organizationId',
  'organizationName',
  'projectId',
  'projectName',
  'projectAcronym',
  'parentTaskId',
  'parentDisplayId',
  'title',
  'description',
  'businessDescription',
  'planCodeDescription',
  'testDescription',
  'status',
  'criticity',
  'category',
  'metadata',
  'dueDate',
  'createdAt',
  'updatedAt',
] as const;

const TASK_CRITICITIES: TaskCriticity[] = ['low', 'medium', 'high', 'critical'];
const TASK_CATEGORIES: TaskCategory[] = [
  'coding',
  'meeting',
  'design',
  'marketing',
  'other',
];

type ExportColumn = (typeof EXPORT_COLUMNS)[number];

function isTaskStatusValue(value: string): value is TaskStatus {
  return isTaskStatus(value);
}

function isTaskCriticity(value: string): value is TaskCriticity {
  return TASK_CRITICITIES.includes(value as TaskCriticity);
}

function isTaskCategory(value: string): value is TaskCategory {
  return TASK_CATEGORIES.includes(value as TaskCategory);
}

function nullish(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

export function tasksToExportRows(tasks: TaskWithContext[]): TaskExportRow[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));

  return tasks.map((task) => {
    const parent = task.parentTaskId ? byId.get(task.parentTaskId) : undefined;
    const descriptions = taskDescriptionFieldsFromTask(task);
    return {
      schemaVersion: SCHEMA_VERSION,
      id: task.id,
      displayId: task.displayId,
      organizationId: task.organization.id,
      organizationName: task.organization.name,
      projectId: task.project.id,
      projectName: task.project.name,
      projectAcronym: task.project.acronym,
      parentTaskId: task.parentTaskId ?? null,
      parentDisplayId: parent?.displayId ?? null,
      title: task.title,
      description: descriptions.description,
      businessDescription: descriptions.businessDescription,
      planCodeDescription: descriptions.planCodeDescription,
      testDescription: descriptions.testDescription,
      status: task.status,
      criticity: task.criticity,
      category: task.category ?? DEFAULT_TASK_CATEGORY,
      metadata: task.metadata ?? {},
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  });
}

export function buildExportDocument(
  tasks: TaskWithContext[],
  query?: ListTasksQuery,
): TaskExportDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    query,
    tasks: tasksToExportRows(tasks),
  };
}

function rowToRecord(row: TaskExportRow): Record<ExportColumn, string | number> {
  return {
    schemaVersion: row.schemaVersion,
    id: row.id,
    displayId: row.displayId,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    projectId: row.projectId,
    projectName: row.projectName,
    projectAcronym: row.projectAcronym,
    parentTaskId: row.parentTaskId ?? '',
    parentDisplayId: row.parentDisplayId ?? '',
    title: row.title,
    description: row.description ?? '',
    businessDescription: row.businessDescription ?? '',
    planCodeDescription: row.planCodeDescription ?? '',
    testDescription: row.testDescription ?? '',
    status: row.status,
    criticity: row.criticity,
    category: row.category,
    metadata: serializeMetadataColumn(row.metadata),
    dueDate: row.dueDate ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function recordToRow(record: Record<string, unknown>, line?: number): TaskExportRow {
  const title = nullish(record.title);
  if (!title) {
    throw new Error(
      line ? `Row ${line}: title is required.` : 'Each task row requires a title.',
    );
  }

  const organizationId = nullish(record.organizationId);
  const projectId = nullish(record.projectId);
  if (!organizationId || !projectId) {
    throw new Error(
      line
        ? `Row ${line}: organizationId and projectId are required.`
        : 'Each task row requires organizationId and projectId.',
    );
  }

  const status = nullish(record.status) ?? 'todo';
  const criticity = nullish(record.criticity) ?? 'medium';
  const category = nullish(record.category) ?? DEFAULT_TASK_CATEGORY;
  if (!isTaskStatusValue(status)) {
    throw new Error(
      line
        ? `Row ${line}: invalid status "${status}".`
        : `Invalid status "${status}".`,
    );
  }
  if (!isTaskCriticity(criticity)) {
    throw new Error(
      line
        ? `Row ${line}: invalid criticity "${criticity}".`
        : `Invalid criticity "${criticity}".`,
    );
  }
  if (!isTaskCategory(category)) {
    throw new Error(
      line
        ? `Row ${line}: invalid category "${category}".`
        : `Invalid category "${category}".`,
    );
  }

  const legacyDescription = nullish(record.description);
  const businessDescription =
    nullish(record.businessDescription) ?? legacyDescription;
  const planCodeDescription = nullish(record.planCodeDescription);
  const testDescription = nullish(record.testDescription);

  return {
    schemaVersion: SCHEMA_VERSION,
    id: nullish(record.id) ?? crypto.randomUUID(),
    displayId: nullish(record.displayId) ?? '',
    organizationId,
    organizationName: nullish(record.organizationName) ?? '',
    projectId,
    projectName: nullish(record.projectName) ?? '',
    projectAcronym: nullish(record.projectAcronym) ?? '',
    parentTaskId: nullish(record.parentTaskId),
    parentDisplayId: nullish(record.parentDisplayId),
    title,
    description: businessDescription,
    businessDescription,
    planCodeDescription,
    testDescription,
    status,
    criticity,
    category,
    metadata: parseMetadataColumn(record.metadata),
    dueDate: nullish(record.dueDate),
    createdAt: nullish(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: nullish(record.updatedAt) ?? new Date(0).toISOString(),
  };
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function rowsToCsv(rows: TaskExportRow[]): string {
  const header = EXPORT_COLUMNS.join(',');
  const body = rows
    .map((row) =>
      EXPORT_COLUMNS.map((column) => escapeCsvCell(rowToRecord(row)[column])).join(','),
    )
    .join('\n');
  return `${header}\n${body}\n`;
}

function parseCsv(text: string): TaskExportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const headers = parseCsvLine(lines[0]);
  const rows: TaskExportRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const record: Record<string, unknown> = {};
    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex] ?? '';
    });
    rows.push(recordToRow(record, index + 1));
  }

  return rows;
}

function rowsToMarkdown(rows: TaskExportRow[], exportedAt: string): string {
  const header = `| ${EXPORT_COLUMNS.join(' | ')} |`;
  const separator = `| ${EXPORT_COLUMNS.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((row) => {
      const record = rowToRecord(row);
      const cells = EXPORT_COLUMNS.map((column) =>
        String(record[column]).replace(/\|/g, '\\|').replace(/\n/g, ' '),
      );
      return `| ${cells.join(' | ')} |`;
    })
    .join('\n');

  return [
    '# Arc Todo Tasks Export',
    '',
    `- Exported: ${exportedAt}`,
    `- Tasks: ${rows.length}`,
    '',
    header,
    separator,
    body,
    '',
  ].join('\n');
}

function parseMarkdown(text: string): TaskExportRow[] {
  const lines = text.split(/\r?\n/);
  const tableLines = lines.filter((line) => line.trim().startsWith('|'));
  if (tableLines.length < 2) {
    throw new Error('Markdown file does not contain a task table.');
  }

  const headers = tableLines[0]
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);

  const rows: TaskExportRow[] = [];
  for (let index = 2; index < tableLines.length; index += 1) {
    const cells = tableLines[index]
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/\\\|/g, '|'));
    if (cells.length === 0) continue;

    const record: Record<string, unknown> = {};
    headers.forEach((header, headerIndex) => {
      record[header] = cells[headerIndex] ?? '';
    });
    rows.push(recordToRow(record, index + 1));
  }

  if (rows.length === 0) {
    throw new Error('Markdown table has no task rows.');
  }

  return rows;
}

function rowsToJson(document: TaskExportDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function parseJson(text: string): TaskExportRow[] {
  const parsed = JSON.parse(text) as
    | TaskExportDocument
    | TaskExportRow[]
    | Record<string, unknown>;

  if (Array.isArray(parsed)) {
    return parsed.map((row, index) =>
      recordToRow(row as unknown as Record<string, unknown>, index + 1),
    );
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as TaskExportDocument).tasks)) {
    return (parsed as TaskExportDocument).tasks.map((row, index) =>
      recordToRow(row as unknown as Record<string, unknown>, index + 1),
    );
  }

  throw new Error('JSON file must contain a tasks array or export document.');
}

function rowsToWorkbook(rows: TaskExportRow[]): ArrayBuffer {
  const sheetRows = rows.map((row) => {
    const record = rowToRecord(row);
    return EXPORT_COLUMNS.reduce<Record<string, string | number>>((accumulator, column) => {
      accumulator[column] = record[column];
      return accumulator;
    }, {});
  });
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: [...EXPORT_COLUMNS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

function parseWorkbook(buffer: ArrayBuffer): TaskExportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('XLSX file has no worksheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  if (records.length === 0) {
    throw new Error('XLSX worksheet has no task rows.');
  }

  return records.map((record, index) => recordToRow(record, index + 2));
}

export function detectFormat(filename: string): TaskExportFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  return null;
}

export function serializeTasks(
  tasks: TaskWithContext[],
  format: TaskExportFormat,
  query?: ListTasksQuery,
): { blob: Blob; filename: string } {
  const document = buildExportDocument(tasks, query);
  const stamp = document.exportedAt.slice(0, 10);
  const rows = document.tasks;

  switch (format) {
    case 'json':
      return {
        blob: new Blob([rowsToJson(document)], { type: 'application/json' }),
        filename: `tasks-export-${stamp}.json`,
      };
    case 'csv':
      return {
        blob: new Blob([rowsToCsv(rows)], { type: 'text/csv' }),
        filename: `tasks-export-${stamp}.csv`,
      };
    case 'md':
      return {
        blob: new Blob([rowsToMarkdown(rows, document.exportedAt)], {
          type: 'text/markdown',
        }),
        filename: `tasks-export-${stamp}.md`,
      };
    case 'xlsx':
      return {
        blob: new Blob([rowsToWorkbook(rows)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename: `tasks-export-${stamp}.xlsx`,
      };
    default:
      throw new Error(`Unsupported export format: ${format satisfies never}`);
  }
}

export function exportTasks(
  tasks: TaskWithContext[],
  format: TaskExportFormat,
  query?: ListTasksQuery,
): void {
  const { blob, filename } = serializeTasks(tasks, format, query);
  triggerBrowserDownload(blob, filename);
}

export async function parseTaskFile(
  file: File,
): Promise<{ format: TaskExportFormat; rows: TaskExportRow[] }> {
  const format = detectFormat(file.name);
  if (!format) {
    throw new Error('Unsupported file type. Use .json, .csv, .md, or .xlsx.');
  }

  if (format === 'xlsx') {
    const buffer = await file.arrayBuffer();
    return { format, rows: parseWorkbook(buffer) };
  }

  const text = await file.text();
  switch (format) {
    case 'json':
      return { format, rows: parseJson(text) };
    case 'csv':
      return { format, rows: parseCsv(text) };
    case 'md':
      return { format, rows: parseMarkdown(text) };
    default:
      throw new Error(`Unsupported import format: ${format satisfies never}`);
  }
}

function sortRowsForImport(rows: TaskExportRow[]): TaskExportRow[] {
  const parents = rows.filter((row) => !row.parentTaskId && !row.parentDisplayId);
  const children = rows.filter((row) => row.parentTaskId || row.parentDisplayId);
  return [...parents, ...children];
}

function resolveImportedParentId(
  row: TaskExportRow,
  identityMap: Map<string, string>,
): string | null {
  if (row.parentTaskId && identityMap.has(row.parentTaskId)) {
    return identityMap.get(row.parentTaskId) ?? null;
  }
  if (row.parentDisplayId && identityMap.has(row.parentDisplayId)) {
    return identityMap.get(row.parentDisplayId) ?? null;
  }
  return row.parentTaskId;
}

async function findExistingTask(
  row: TaskExportRow,
  loadedTasks: TaskWithContext[],
): Promise<{
  organizationId: string;
  projectId: string;
  taskId: string;
} | null> {
  const byId = loadedTasks.find((task) => task.id === row.id);
  if (byId) {
    return {
      organizationId: byId.organization.id,
      projectId: byId.project.id,
      taskId: byId.id,
    };
  }

  if (!row.displayId) {
    return null;
  }

  try {
    const resolved = await resolveTaskByIdentifier(row.displayId);
    return {
      organizationId: resolved.organizationId,
      projectId: resolved.projectId,
      taskId: resolved.id,
    };
  } catch {
    return null;
  }
}

export async function importTaskRows(
  rows: TaskExportRow[],
  loadedTasks: TaskWithContext[],
): Promise<TaskImportResult> {
  const result: TaskImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  const identityMap = new Map<string, string>();

  for (const row of sortRowsForImport(rows)) {
    try {
      const parentTaskId = resolveImportedParentId(row, identityMap);
      const existing = await findExistingTask(row, loadedTasks);

      if (existing) {
        const updated = await updateProjectTask(
          existing.organizationId,
          existing.projectId,
          existing.taskId,
          {
            title: row.title,
            description: row.businessDescription ?? row.description ?? undefined,
            businessDescription: row.businessDescription ?? row.description ?? undefined,
            planCodeDescription: row.planCodeDescription ?? undefined,
            testDescription: row.testDescription ?? undefined,
            status: row.status,
            criticity: row.criticity,
            category: row.category,
            metadata: row.metadata,
            dueDate: row.dueDate,
            parentTaskId,
          },
        );
        identityMap.set(row.id, updated.id);
        if (row.displayId) identityMap.set(row.displayId, updated.id);
        result.updated += 1;
        continue;
      }

      if (!row.organizationId || !row.projectId) {
        throw new Error('organizationId and projectId are required to create a task.');
      }

      const created = await createProjectTask(row.organizationId, row.projectId, {
        title: row.title,
        description: row.businessDescription ?? row.description ?? undefined,
        businessDescription: row.businessDescription ?? row.description ?? undefined,
        planCodeDescription: row.planCodeDescription ?? undefined,
        testDescription: row.testDescription ?? undefined,
        status: row.status,
        criticity: row.criticity,
        category: row.category,
        metadata: row.metadata,
        dueDate: row.dueDate ?? undefined,
        parentTaskId: parentTaskId ?? undefined,
      });
      identityMap.set(row.id, created.id);
      if (row.displayId) identityMap.set(row.displayId, created.id);
      if (created.displayId) identityMap.set(created.displayId, created.id);
      result.created += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown import error.';
      result.errors.push(`${row.displayId || row.title}: ${message}`);
      result.skipped += 1;
    }
  }

  return result;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`taskImportExport self-check failed: ${message}`);
  }
}

export function selfCheckTaskImportExport(): void {
  const sampleTasks: TaskWithContext[] = [
    {
      id: 'parent-id',
      title: 'Parent task',
      description: 'Parent description',
      status: 'todo',
      criticity: 'high',
      category: 'coding',
      metadata: {
        repositoryUrl: 'https://github.com/example/repo',
        branch: 'main',
      },
      dueDate: '2026-06-21',
      projectId: 'project-1',
      parentTaskId: null,
      taskNumber: 1,
      displayId: '#arc-1',
      createdAt: '2026-06-21T10:00:00.000Z',
      updatedAt: '2026-06-21T10:00:00.000Z',
      project: {
        id: 'project-1',
        name: 'Arc',
        organizationId: 'org-1',
        color: '#000000',
        acronym: 'arc',
      },
      organization: {
        id: 'org-1',
        name: 'Arc Org',
        slug: 'arc-org',
      },
    },
    {
      id: 'child-id',
      title: 'Child task',
      description: null,
      status: 'in_progress',
      criticity: 'medium',
      category: 'other',
      metadata: {},
      dueDate: null,
      projectId: 'project-1',
      parentTaskId: 'parent-id',
      taskNumber: 2,
      displayId: '#arc-2',
      createdAt: '2026-06-21T11:00:00.000Z',
      updatedAt: '2026-06-21T11:00:00.000Z',
      project: {
        id: 'project-1',
        name: 'Arc',
        organizationId: 'org-1',
        color: '#000000',
        acronym: 'arc',
      },
      organization: {
        id: 'org-1',
        name: 'Arc Org',
        slug: 'arc-org',
      },
    },
  ];

  const rows = tasksToExportRows(sampleTasks);
  assert(rows.length === 2, 'expected two export rows');
  assert(rows[1].parentDisplayId === '#arc-1', 'expected parent display id on child row');
  assert(rows[0].category === 'coding', 'expected category on parent row');
  assert(
    rows[0].metadata.repositoryUrl === 'https://github.com/example/repo',
    'expected metadata on parent row',
  );

  const document = buildExportDocument(sampleTasks);
  const jsonRows = parseJson(rowsToJson(document));
  assert(jsonRows.length === 2, 'json round-trip should keep two rows');

  const csvRows = parseCsv(rowsToCsv(rows));
  assert(csvRows[0].title === 'Parent task', 'csv round-trip should preserve title');

  const mdRows = parseMarkdown(rowsToMarkdown(rows, document.exportedAt));
  assert(mdRows[1].parentTaskId === 'parent-id', 'markdown round-trip should preserve parent id');

  const xlsxRows = parseWorkbook(rowsToWorkbook(rows));
  assert(xlsxRows[1].status === 'in_progress', 'xlsx round-trip should preserve status');

  const sorted = sortRowsForImport([jsonRows[1], jsonRows[0]]);
  assert(sorted[0].id === 'parent-id', 'import sort should place parents first');
}
