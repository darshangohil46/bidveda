import {
  GitCommitHorizontal,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  Paperclip,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Store,
  UserCog,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";

/** The backend names icons by string; this maps the ones the registry uses. Unknown names get a neutral icon. */
const ICONS: Record<string, LucideIcon> = {
  FileText,
  GitCommitHorizontal,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  Paperclip,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Store,
  UserCog,
  Users,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Layers;
}

/** Every table the registry declares is managed on the same dynamic page. */
export function adminResourceHref(key: string): string {
  return `/admin/resources/${key}`;
}
