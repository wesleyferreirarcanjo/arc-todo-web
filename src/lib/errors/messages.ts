const GENERIC_API_MESSAGES = new Set([
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Bad Request',
  'Conflict',
  'Internal Server Error',
  'Service Unavailable',
]);

export const WEB_ERROR = {
  GIS_MISSING: 'ERR-ARC-WEB-01',
  GIS_CANCELLED: 'ERR-ARC-WEB-02',
  GIS_FAILED: 'ERR-ARC-WEB-03',
  GIS_SCRIPT: 'ERR-ARC-WEB-04',
  LOAD: 'ERR-ARC-WEB-05',
  SAVE: 'ERR-ARC-WEB-06',
  CREATE: 'ERR-ARC-WEB-07',
  DELETE: 'ERR-ARC-WEB-08',
  RENAME: 'ERR-ARC-WEB-09',
  MOVE: 'ERR-ARC-WEB-10',
  VAL_ORG: 'ERR-ARC-WEB-11',
  VAL_PROJECT: 'ERR-ARC-WEB-12',
  VAL_NAME: 'ERR-ARC-WEB-13',
  VAL_DIAGRAM: 'ERR-ARC-WEB-14',
  VAL_WIREFRAME: 'ERR-ARC-WEB-15',
  VAL_SESSION: 'ERR-ARC-WEB-16',
  VAL_WORKING: 'ERR-ARC-WEB-17',
  EXPORT_EMPTY: 'ERR-ARC-WEB-18',
  IMPORT_EMPTY: 'ERR-ARC-WEB-19',
  CHAT_AUTH: 'ERR-ARC-WEB-20',
  CHAT_STREAM: 'ERR-ARC-WEB-21',
  CHAT_REQUEST: 'ERR-ARC-WEB-22',
  SESSION: 'ERR-ARC-AUTH-10',
  NET: 'ERR-ARC-NET-01',
} as const;

export type WebErrorCode = (typeof WEB_ERROR)[keyof typeof WEB_ERROR];

const MESSAGES: Record<string, string> = {
  [WEB_ERROR.GIS_MISSING]:
    'Google Sign-In is not set up in this app. Ask an administrator to add the Google client id.',
  [WEB_ERROR.GIS_CANCELLED]:
    'Google Sign-In was cancelled. Choose an account when you are ready.',
  [WEB_ERROR.GIS_FAILED]:
    'Google Sign-In did not complete. Try again in a moment.',
  [WEB_ERROR.GIS_SCRIPT]:
    'Google Sign-In could not load. Refresh the page and try again.',
  [WEB_ERROR.LOAD]:
    "Couldn't load {thing}. Check your connection and try again.",
  [WEB_ERROR.SAVE]:
    "Couldn't save {thing}. Check your connection and try again.",
  [WEB_ERROR.CREATE]:
    "Couldn't create {thing}. Check your connection and try again.",
  [WEB_ERROR.DELETE]:
    "Couldn't delete {thing}. Check your connection and try again.",
  [WEB_ERROR.RENAME]:
    "Couldn't rename {thing}. Check your connection and try again.",
  [WEB_ERROR.MOVE]:
    "Couldn't move {thing}. Check your connection and try again.",
  [WEB_ERROR.VAL_ORG]: 'Choose an organization first.',
  [WEB_ERROR.VAL_PROJECT]: 'Choose a project first.',
  [WEB_ERROR.VAL_NAME]: 'Enter a name to continue.',
  [WEB_ERROR.VAL_DIAGRAM]: 'Enter a diagram name to continue.',
  [WEB_ERROR.VAL_WIREFRAME]: 'Enter a wireframe name to continue.',
  [WEB_ERROR.VAL_SESSION]: 'Enter a session name to continue.',
  [WEB_ERROR.VAL_WORKING]: 'Enter a working name to continue.',
  [WEB_ERROR.EXPORT_EMPTY]: 'There are no tasks to export yet.',
  [WEB_ERROR.IMPORT_EMPTY]: 'That file does not contain any tasks to import.',
  [WEB_ERROR.CHAT_AUTH]: 'Sign in again to keep chatting.',
  [WEB_ERROR.CHAT_STREAM]:
    'Live chat is not supported in this browser. Try another browser, or send without streaming.',
  [WEB_ERROR.CHAT_REQUEST]:
    "Couldn't send that chat. Check your connection and try again.",
  [WEB_ERROR.SESSION]: 'Your session ended. Sign in again to continue.',
  [WEB_ERROR.NET]:
    "Couldn't reach Arc Todo right now. Check your connection and try again.",
  'ERR-ARC-AUTH-07':
    'No Arc Todo user is assigned to this Google account. Ask an administrator to add your email, then try again.',
  'ERR-ARC-SEO-01': 'Enter a site address to continue.',
};

function interpolate(template: string, vars?: { thing?: string }): string {
  return template.replace(/\{thing\}/g, vars?.thing ?? 'this');
}

function isGenericApiMessage(message: string): boolean {
  if (GENERIC_API_MESSAGES.has(message)) return true;
  return /^Request failed \(\d+\)$/.test(message) || /^Chat request failed \(\d+\)$/.test(message);
}

export function catalogMessage(code: string, vars?: { thing?: string }): string {
  const template = MESSAGES[code] ?? MESSAGES[WEB_ERROR.LOAD];
  return interpolate(template, vars);
}

export function userMessage(
  error: unknown,
  fallbackCode: string = WEB_ERROR.LOAD,
  vars?: { thing?: string },
): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    const status = (error as { status?: unknown }).status;
    if (typeof message === 'string' && message.trim() && !isGenericApiMessage(message)) {
      if (status === 401 && fallbackCode === WEB_ERROR.SESSION) {
        return catalogMessage(WEB_ERROR.SESSION);
      }
      return message;
    }
  }
  if (error instanceof TypeError) {
    return catalogMessage(WEB_ERROR.NET);
  }
  return catalogMessage(fallbackCode, vars);
}
