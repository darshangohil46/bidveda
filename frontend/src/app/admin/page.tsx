import { redirect } from "next/navigation";
import { ROUTES } from "@/utils/constant";

export default function AdminIndexPage() {
  redirect(ROUTES.adminDashboard);
}
