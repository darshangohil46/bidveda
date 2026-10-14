import { toOptions } from "@/lib/options";
import { QuoteStatus, RfqStatus, UserRole } from "@/types/enums";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Bidveda";

/** HttpOnly cookies that hold each realm's refresh token (set by the Next.js route handlers). */
export const COOKIE_NAMES = {
  userRefresh: "bv_refresh",
  adminRefresh: "bv_admin_refresh",
  /** Which role the signed-in user has: only a hint so the proxy can pick buyer or vendor pages. The API still checks. */
  userRole: "bv_role",
} as const;

export const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Buyers and vendors never share a page: each role has its own URL prefix. */
export const ROLE_BASE: Record<UserRole, string> = {
  [UserRole.BUYER]: "/buyer",
  [UserRole.VENDOR]: "/vendor",
};

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  /** Not a page: the proxy sends "/" to sign-in, or to the signed-in person's buyer or vendor home. */
  home: "/",
  vendorQuotes: `${ROLE_BASE[UserRole.VENDOR]}/quotes`,
  adminLogin: "/admin/login",
  adminDashboard: "/admin/dashboard",
} as const;

/** First screen after signing in: the buyer's RFQs, or the vendor's open RFQs. */
export const roleHome = (role: UserRole) => `${ROLE_BASE[role]}/rfqs`;

/** One RFQ, as seen by a buyer or by a vendor. */
export const rfqRoute = (role: UserRole, id: string) =>
  `${ROLE_BASE[role]}/rfqs/${id}`;
export const rfqCompareRoute = (id: string) =>
  `${rfqRoute(UserRole.BUYER, id)}/compare`;
export const rfqQuoteRoute = (id: string) =>
  `${rfqRoute(UserRole.VENDOR, id)}/quote`;

export const RFQ_CATEGORIES = [
  "Office Supplies",
  "Furniture",
  "IT Hardware",
  "Software & Services",
  "Construction Materials",
  "Electrical",
  "Plumbing & Sanitary",
  "Industrial Equipment",
  "Packaging",
  "Logistics",
  "Catering & Hospitality",
  "Printing & Stationery",
  "Safety & PPE",
  "Other",
] as const;

export const UNIT_SUGGESTIONS = [
  "pcs",
  "box",
  "set",
  "kg",
  "tonne",
  "m",
  "sq ft",
  "litre",
  "visits",
  "hours",
  "service",
] as const;

/** The same lists as dropdown options. */
export const RFQ_CATEGORY_OPTIONS = toOptions(RFQ_CATEGORIES);
export const UNIT_OPTIONS = toOptions(UNIT_SUGGESTIONS);

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_LINE_ITEMS = 100;
export const MAX_UPLOAD_MB = 10;
export const ACCEPTED_FILE_TYPES = ".pdf,.xlsx";
export const MAX_IMAGE_MB = 2;
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp";
export const SEARCH_DEBOUNCE_MS = 350;

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_COUNTRY_ISO = "IN";
export const DEFAULT_COUNTRY_NAME = "India";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.BUYER]: "Buyer",
  [UserRole.VENDOR]: "Vendor",
};

/** Display names and the colour of the status dot (dot + word, never a filled block). */
export const RFQ_STATUS_META: Record<
  RfqStatus,
  { label: string; dot: string }
> = {
  [RfqStatus.DRAFT]: { label: "Draft", dot: "bg-ink-3" },
  [RfqStatus.PUBLISHED]: { label: "Open", dot: "bg-pine" },
  [RfqStatus.CLOSED]: { label: "Closed", dot: "bg-amber" },
  [RfqStatus.AWARDED]: { label: "Awarded", dot: "bg-ink" },
};

export const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; dot: string }
> = {
  [QuoteStatus.SUBMITTED]: { label: "Submitted", dot: "bg-ink-3" },
  [QuoteStatus.SHORTLISTED]: { label: "Shortlisted", dot: "bg-slate-blue" },
  [QuoteStatus.ACCEPTED]: { label: "Accepted", dot: "bg-pine" },
  [QuoteStatus.REJECTED]: { label: "Rejected", dot: "bg-rust" },
};

export const RFQ_STATUS_ORDER: RfqStatus[] = [
  RfqStatus.DRAFT,
  RfqStatus.PUBLISHED,
  RfqStatus.CLOSED,
  RfqStatus.AWARDED,
];
