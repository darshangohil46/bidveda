import { UserRole } from "@/types/enums";
import type { NavItem } from "@/types/ui";
import { ROUTES, roleHome } from "@/utils/constant";

/**
 * The links in the top bar, per role. A vendor never sees buyer screens and vice versa.
 * A buyer has a single page (their RFQs, which is also what the logo opens), so no links are shown.
 */
export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  [UserRole.BUYER]: [
    {
      href: roleHome(UserRole.BUYER),
      label: "My RFQs",
      isActive: (pathname) => pathname.startsWith(roleHome(UserRole.BUYER)),
    },
  ],
  [UserRole.VENDOR]: [
    {
      href: roleHome(UserRole.VENDOR),
      label: "Open RFQs",
      isActive: (pathname) => pathname.startsWith(roleHome(UserRole.VENDOR)),
    },
    {
      href: ROUTES.vendorQuotes,
      label: "My quotes",
      isActive: (pathname) => pathname.startsWith(ROUTES.vendorQuotes),
    },
  ],
};
