import type { Metadata } from "next";
import { ResourceView } from "@/components/admin/ResourceView";

type PageProps = { params: Promise<{ resource: string }> };

/** "admin_roles" -> "Admin roles". The real label comes from the API once the page has loaded. */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { resource } = await params;
  const words = resource.replace(/_/g, " ");
  return { title: words.charAt(0).toUpperCase() + words.slice(1) };
}

export default async function Page({ params }: PageProps) {
  const { resource } = await params;
  return <ResourceView resource={resource} />;
}
