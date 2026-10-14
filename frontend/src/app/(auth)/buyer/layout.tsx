import { RoleGate } from "@/components/auth/RoleGate";
import { UserRole } from "@/types/enums";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate role={UserRole.BUYER}>{children}</RoleGate>;
}
