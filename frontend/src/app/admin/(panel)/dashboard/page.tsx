import type { Metadata } from "next";
import { AdminDashboardPage } from "@/components/admin/AdminDashboardPage";

export const metadata: Metadata = { title: "Admin overview" };

export default function Page() {
  return <AdminDashboardPage />;
}
