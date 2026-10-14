export interface NavItem {
  href: string;
  label: string;
  /** Extra paths that should keep this item highlighted. */
  isActive: (pathname: string) => boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export type ToastVariant = "default" | "success" | "destructive";

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before it closes itself. */
  duration?: number;
}

export interface ToastItem extends ToastInput {
  id: string;
  open: boolean;
}

export type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string };

/** Which quotes are the cheapest and the fastest on a comparison. */
export interface Highlights {
  lowestTotal: Set<string>;
  fastestDelivery: Set<string>;
}
