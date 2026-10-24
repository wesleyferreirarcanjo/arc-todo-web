import type { ComponentType } from 'react';
import type { ArcIconProps } from '../../components/icons';
import {
  AnalyticsIcon,
  CloudIcon,
  DevicesIcon,
  DiagramsIcon,
  DownloadIcon,
  LogsIcon,
  MakeIcon,
  MetricsIcon,
  NamesIcon,
  OperateIcon,
  OrganizationsIcon,
  SeoIcon,
  TasksIcon,
  UsersIcon,
  VideosIcon,
  WireframesIcon,
} from '../../components/icons';

export type NavIcon = ComponentType<ArcIconProps>;

export type NavLinkEntry = {
  kind: 'link';
  to: string;
  label: string;
  icon: NavIcon;
  end?: boolean;
  adminOnly?: boolean;
  isolated?: boolean;
  active?: (pathname: string) => boolean;
};

export type NavGroupId = 'make' | 'devices' | 'operate';

export type NavGroupEntry = {
  kind: 'group';
  id: NavGroupId;
  label: string;
  icon: NavIcon;
  adminOnly?: boolean;
  children: NavLinkEntry[];
};

export type PrimaryNavEntry = NavLinkEntry | NavGroupEntry;

function projectHub(segment: string, pathname: string): boolean {
  return new RegExp(`/projects/[^/]+/${segment}(?:/|$)`).test(pathname);
}

function link(
  entry: Omit<NavLinkEntry, 'kind'>,
): NavLinkEntry {
  return { kind: 'link', ...entry };
}

export const primaryNav: PrimaryNavEntry[] = [
  link({
    to: '/board',
    label: 'All tasks',
    icon: TasksIcon,
    isolated: true,
  }),
  {
    kind: 'group',
    id: 'make',
    label: 'Make',
    icon: MakeIcon,
    children: [
      link({
        to: '/diagrams',
        label: 'Diagrams',
        icon: DiagramsIcon,
        active: (pathname) =>
          pathname === '/diagrams' || projectHub('diagrams', pathname),
      }),
      link({
        to: '/wireframes',
        label: 'Wireframes',
        icon: WireframesIcon,
        active: (pathname) =>
          pathname === '/wireframes' || projectHub('wireframes', pathname),
      }),
      link({
        to: '/videos',
        label: 'Videos',
        icon: VideosIcon,
        active: (pathname) =>
          pathname === '/videos' || projectHub('videos', pathname),
      }),
      link({
        to: '/names',
        label: 'Names',
        icon: NamesIcon,
        active: (pathname) =>
          pathname === '/names' ||
          pathname.startsWith('/names/') ||
          projectHub('names', pathname),
      }),
      link({
        to: '/seo',
        label: 'SEO',
        icon: SeoIcon,
        active: (pathname) => pathname === '/seo' || projectHub('seo', pathname),
      }),
    ],
  },
  link({
    to: '/organizations',
    label: 'Organizations',
    icon: OrganizationsIcon,
    end: true,
  }),
  {
    kind: 'group',
    id: 'devices',
    label: 'Devices',
    icon: DevicesIcon,
    children: [
      link({ to: '/devices', label: 'Devices', icon: DevicesIcon }),
      link({ to: '/download', label: 'Download', icon: DownloadIcon }),
    ],
  },
  {
    kind: 'group',
    id: 'operate',
    label: 'Operate',
    icon: OperateIcon,
    adminOnly: true,
    children: [
      link({ to: '/analytics', label: 'Analytics', icon: AnalyticsIcon }),
      link({ to: '/metrics', label: 'Metrics', icon: MetricsIcon }),
      link({ to: '/cloud', label: 'Cloud', icon: CloudIcon }),
      link({ to: '/logs', label: 'Logs', icon: LogsIcon }),
      link({ to: '/admin/users', label: 'Users', icon: UsersIcon }),
    ],
  },
];

export function isLinkActive(entry: NavLinkEntry, pathname: string): boolean {
  if (entry.active) return entry.active(pathname);
  if (entry.end) return pathname === entry.to;
  return pathname === entry.to || pathname.startsWith(`${entry.to}/`);
}

export function isEntryActive(entry: PrimaryNavEntry, pathname: string): boolean {
  if (entry.kind === 'link') return isLinkActive(entry, pathname);
  return entry.children.some((child) => isLinkActive(child, pathname));
}

export function visibleNav(isAdmin: boolean): PrimaryNavEntry[] {
  return primaryNav.flatMap((entry): PrimaryNavEntry[] => {
    if (entry.adminOnly && !isAdmin) return [];
    if (entry.kind === 'link') return [entry];
    return [
      {
        ...entry,
        children: entry.children.filter((child) => !child.adminOnly || isAdmin),
      },
    ];
  });
}

export function groupForPath(pathname: string, isAdmin: boolean): NavGroupId | null {
  for (const entry of visibleNav(isAdmin)) {
    if (entry.kind === 'group' && isEntryActive(entry, pathname)) return entry.id;
  }
  return null;
}
