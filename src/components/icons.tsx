import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import {
  ArrowLeft,
  Bell,
  ChatCircle,
  ClipboardText,
  Copy,
  DotsThreeVertical,
  DownloadSimple,
  Eye,
  Flask,
  Funnel,
  GearSix,
  Moon,
  PencilSimple,
  Plus,
  SignOut,
  Sun,
  Trash,
} from '@phosphor-icons/react';

/**
 * DS-ARC-PRIM-ICON — Phosphor duotone is the construction kit.
 * Destination glyphs are custom. Do not import @phosphor-icons/react from
 * Layout, FAB, ThemeToggle, TaskCard, or pages.
 */
export type ArcIconProps = {
  className?: string;
};

function phosphor(IconCmp: Icon) {
  function Wrapped({ className = 'arc-icon' }: ArcIconProps) {
    return (
      <IconCmp
        className={className}
        weight="duotone"
        size="1em"
        aria-hidden
      />
    );
  }
  return Wrapped;
}

function DuotoneIcon({
  children,
  className = 'arc-icon',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const mass = {
  className: 'arc-icon-mass',
  fill: 'currentColor' as const,
  stroke: 'none' as const,
};

export function TasksIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <rect {...mass} x="3.4" y="3.4" width="7.6" height="7.6" rx="1.3" />
      <rect x="3.4" y="3.4" width="7.6" height="7.6" rx="1.3" />
      <rect x="13" y="3.4" width="7.6" height="7.6" rx="1.3" />
      <rect x="3.4" y="13" width="7.6" height="7.6" rx="1.3" />
      <rect x="13" y="13" width="7.6" height="7.6" rx="1.3" />
      <path d="M5.4 6.4h3.6M5.4 8.4h2.2" />
    </DuotoneIcon>
  );
}

export function KnowledgeIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path
        {...mass}
        d="M4.2 6.4c0-.9.7-1.6 1.6-1.6H12v13.4H5.8c-.9 0-1.6-.7-1.6-1.6V6.4Z"
      />
      <path d="M12 4.8h6.2c.9 0 1.6.7 1.6 1.6V16c0 .9-.7 1.6-1.6 1.6H12" />
      <path d="M12 4.8H5.8c-.9 0-1.6.7-1.6 1.6V16c0 .9.7 1.6 1.6 1.6H12" />
      <path d="M12 4.8v13.4" />
      <path d="M14.4 8.2h3M14.4 11h2.4" />
    </DuotoneIcon>
  );
}

export function DiagramsIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <circle {...mass} cx="7" cy="7.2" r="2.7" />
      <circle cx="7" cy="7.2" r="2.7" />
      <circle cx="17.2" cy="8" r="2.4" />
      <circle cx="11.6" cy="17" r="2.7" />
      <path d="M9.4 8.6l5.4-.4M8.8 9.6l1.8 4.8M15.2 10.2l-2.2 4.4" />
    </DuotoneIcon>
  );
}

export function WireframesIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <rect {...mass} x="4" y="3.5" width="16" height="4.2" rx="1.2" />
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M4 8.4h16" />
      <rect x="6.4" y="10.6" width="5" height="3.6" rx="0.6" />
      <rect x="12.6" y="10.6" width="5" height="3.6" rx="0.6" />
      <path d="M6.4 17.2h11.2" />
    </DuotoneIcon>
  );
}

export function NamesIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path {...mass} d="M12 7.6 14.4 13.6H9.6Z" />
      <path d="M6.6 19.2 12 4.8l5.4 14.4" />
      <path d="M8.6 13.6h6.8" />
    </DuotoneIcon>
  );
}

export function PeopleIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <circle {...mass} cx="9" cy="7.1" r="3.1" />
      <circle cx="9" cy="7.1" r="3.1" />
      <path d="M3.4 19.4v-1.5A4.2 4.2 0 0 1 7.6 13.7h2.8a4.2 4.2 0 0 1 4.2 4.2v1.5" />
      <circle cx="17.1" cy="8.1" r="2.35" />
      <path d="M20.6 19.4v-1.3a3.6 3.6 0 0 0-3-3.55" />
    </DuotoneIcon>
  );
}

export function UsersIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <circle {...mass} cx="8.6" cy="7.2" r="3" />
      <circle cx="8.6" cy="7.2" r="3" />
      <path d="M3.2 19.4v-1.4a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1.4" />
      <circle {...mass} cx="17.4" cy="16.4" r="2.5" />
      <circle cx="17.4" cy="16.4" r="2.5" />
      <path d="M17.4 12.6v1.1M17.4 19.1v1.1M13.8 16.4h1.1M20 16.4h1.1" />
    </DuotoneIcon>
  );
}

export function OrganizationsIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path {...mass} d="M5.2 8.2h9.2v12.2H5.2Z" />
      <path d="M4.2 20.5h15.6" />
      <path d="M6 20.5V7.8l6-3.3v16" />
      <path d="M12 9.2l6.2 3.2v8.1" />
      <path d="M8.2 11.2h2M8.2 14.4h2M8.2 17.6h2" />
      <path d="M15.6 14.8v5.7" />
    </DuotoneIcon>
  );
}

export function NavigateIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <circle {...mass} cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.2 15.2 16l-3.2-1.6L8.8 16Z" />
    </DuotoneIcon>
  );
}

export function McpIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path {...mass} d="M12 3.6 4.2 8.2 12 12.6l7.8-4.4Z" />
      <path d="M12 3.6 4.2 8.2 12 12.6l7.8-4.4Z" />
      <path d="M4.2 12.2 12 16.6l7.8-4.4" />
      <path d="M4.2 16.2 12 20.6l7.8-4.4" />
    </DuotoneIcon>
  );
}

export function RagIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path
        {...mass}
        d="M4.2 6.2c0-.8.7-1.5 1.5-1.5H19.5v13.6H5.7c-.8 0-1.5-.7-1.5-1.5V6.2Z"
      />
      <path d="M5.7 4.7H19.5v13.6H5.7A1.5 1.5 0 0 1 4.2 16.8V6.2A1.5 1.5 0 0 1 5.7 4.7Z" />
      <path d="M8 8.4h8M8 11.4h6.4M8 14.4h4.4" />
    </DuotoneIcon>
  );
}

export function StorageIcon({ className = 'arc-icon' }: ArcIconProps) {
  return (
    <DuotoneIcon className={className}>
      <path
        {...mass}
        d="M4.2 6.4c0-1.5 3.5-2.8 7.8-2.8s7.8 1.3 7.8 2.8v11.2c0 1.5-3.5 2.8-7.8 2.8s-7.8-1.3-7.8-2.8V6.4Z"
      />
      <ellipse cx="12" cy="6.4" rx="7.8" ry="2.8" />
      <path d="M19.8 6.4v11.2c0 1.5-3.5 2.8-7.8 2.8s-7.8-1.3-7.8-2.8V6.4" />
      <path d="M19.8 12c0 1.5-3.5 2.8-7.8 2.8S4.2 13.5 4.2 12" />
    </DuotoneIcon>
  );
}

export function ChevronIcon({
  expanded,
  className = 'arc-icon',
}: ArcIconProps & { expanded: boolean }) {
  return (
    <DuotoneIcon className={className}>
      {expanded ? (
        <>
          <path {...mass} d="M4.2 5.2h2.2v13.6H4.2Z" />
          <path d="M5.2 5.2v13.6" />
          <path d="M16.4 6.6 10.6 12l5.8 5.4" />
        </>
      ) : (
        <>
          <path {...mass} d="M17.6 5.2h2.2v13.6h-2.2Z" />
          <path d="M18.8 5.2v13.6" />
          <path d="M7.6 6.6 13.4 12l-5.8 5.4" />
        </>
      )}
    </DuotoneIcon>
  );
}

export const SettingsIcon = phosphor(GearSix);
export const ConfigIcon = SettingsIcon;
export const ChatIcon = phosphor(ChatCircle);
export const ChatbotIcon = ChatIcon;
export const LogoutIcon = phosphor(SignOut);
export const SunIcon = phosphor(Sun);
export const MoonIcon = phosphor(Moon);
export const FilterIcon = phosphor(Funnel);
export const NewTaskIcon = phosphor(Plus);
export const BackIcon = phosphor(ArrowLeft);
export const FlaskIcon = phosphor(Flask);
export const InstallIcon = phosphor(DownloadSimple);
export const BellIcon = phosphor(Bell);
export const MoreVerticalIcon = phosphor(DotsThreeVertical);
export const PencilIcon = phosphor(PencilSimple);
export const TrashIcon = phosphor(Trash);
export const CopyIcon = phosphor(Copy);
export const EyeIcon = phosphor(Eye);
export const QaBoardIcon = phosphor(ClipboardText);
