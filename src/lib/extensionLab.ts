/** Synthetic failures for extension capture evidence. Raw fetch only — never apiRequest (401 would log the user out). */

export const LAB_CONNECTION_URL = 'https://arc-todo-evidence-lab.invalid/fail';
export const LAB_OK_URL = '/extension/version.json';

export const LAB_HTTP_STATUSES = {
  '/extension/lab/401': 401,
  '/extension/lab/404': 404,
  '/extension/lab/500': 500,
} as const;

export const LAB_MESSAGES = {
  warn: 'Arc Todo lab: console.warn',
  error: 'Arc Todo lab: console.error',
  uncaught: 'Arc Todo lab: uncaught Error',
  rejection: 'Arc Todo lab: unhandled rejection',
} as const;

export type LabProbeId =
  | 'warn'
  | 'error'
  | 'uncaught'
  | 'rejection'
  | 'http401'
  | 'http404'
  | 'http500'
  | 'connection'
  | 'abort'
  | 'ok';

export type LabProbeGroup = 'console' | 'network' | 'control';

export type LabProbe = {
  id: LabProbeId;
  group: LabProbeGroup;
  label: string;
  expected: string;
};

export const LAB_PROBES: LabProbe[] = [
  {
    id: 'warn',
    group: 'console',
    label: 'console.warn',
    expected: 'warn in the capture list',
  },
  {
    id: 'error',
    group: 'console',
    label: 'console.error',
    expected: 'error in the capture list',
  },
  {
    id: 'uncaught',
    group: 'console',
    label: 'Uncaught Error',
    expected: 'window.onerror → error',
  },
  {
    id: 'rejection',
    group: 'console',
    label: 'Unhandled rejection',
    expected: 'unhandledrejection → error',
  },
  {
    id: 'http404',
    group: 'network',
    label: 'HTTP 404',
    expected: 'GET /extension/lab/404',
  },
  {
    id: 'http401',
    group: 'network',
    label: 'HTTP 401',
    expected: 'GET /extension/lab/401',
  },
  {
    id: 'http500',
    group: 'network',
    label: 'HTTP 500',
    expected: 'GET /extension/lab/500',
  },
  {
    id: 'connection',
    group: 'network',
    label: 'Connection fail',
    expected: 'DNS fail to .invalid (webRequest error)',
  },
  {
    id: 'abort',
    group: 'network',
    label: 'Aborted request',
    expected: 'fetch aborted (net::ERR_ABORTED)',
  },
  {
    id: 'ok',
    group: 'control',
    label: 'HTTP 200',
    expected: 'must not appear as a network error',
  },
];

export const LAB_FAILURE_IDS: LabProbeId[] = LAB_PROBES.filter(
  (probe) => probe.group !== 'control',
).map((probe) => probe.id);

export function labStatusForUrl(url: string): number | undefined {
  const path = (url.split('?')[0] ?? '').replace(/\/$/, '') || '/';
  if (path in LAB_HTTP_STATUSES) {
    return LAB_HTTP_STATUSES[path as keyof typeof LAB_HTTP_STATUSES];
  }
  return undefined;
}

async function fetchLab(url: string, init?: RequestInit): Promise<void> {
  try {
    await fetch(url, { cache: 'no-store', credentials: 'omit', ...init });
  } catch {
    // Connection and abort are the point of those probes.
  }
}

export const labRuntime = {
  deferThrow(error: Error) {
    globalThis.setTimeout(() => {
      throw error;
    }, 0);
  },
  reject(error: Error) {
    void Promise.reject(error);
  },
};

export async function fireLabProbe(id: LabProbeId): Promise<void> {
  switch (id) {
    case 'warn':
      console.warn(LAB_MESSAGES.warn);
      return;
    case 'error':
      console.error(LAB_MESSAGES.error);
      return;
    case 'uncaught':
      labRuntime.deferThrow(new Error(LAB_MESSAGES.uncaught));
      return;
    case 'rejection':
      labRuntime.reject(new Error(LAB_MESSAGES.rejection));
      return;
    case 'http401':
      await fetchLab('/extension/lab/401');
      return;
    case 'http404':
      await fetchLab('/extension/lab/404');
      return;
    case 'http500':
      await fetchLab('/extension/lab/500');
      return;
    case 'connection':
      await fetchLab(LAB_CONNECTION_URL);
      return;
    case 'abort': {
      const controller = new AbortController();
      const pending = fetchLab('/extension/lab/404', { signal: controller.signal });
      controller.abort();
      await pending;
      return;
    }
    case 'ok':
      await fetchLab(LAB_OK_URL);
      return;
  }
}

export async function fireAllLabFailures(): Promise<void> {
  for (const id of LAB_FAILURE_IDS) {
    await fireLabProbe(id);
  }
}
