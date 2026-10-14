import { RoleGate } from "@/components/auth/RoleGate";
import { UserRole } from "@/types/enums";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate role={UserRole.VENDOR}>{children}</RoleGate>;
}
